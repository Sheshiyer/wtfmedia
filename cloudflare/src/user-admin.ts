import { eraseUserHistory } from "./user-deletion.ts";
import { transferSuperAdmin } from "./operators.ts";
import type { DB } from "./db.ts";
import type { PrincipalContext } from "./auth/principal-context.ts";
import { decide } from "./auth/policy.ts";
import { inviteCompanyMember, changeCompanyMemberLifecycle, type MemberInvitationClient } from "./members.ts";

type UserRole = "member" | "editor" | "admin" | "super_admin";
type Operator = { id: number; email: string; display_name: string; role: Exclude<UserRole, "member">; active: number; member_only?: number; updated_at: string };
type Member = { deletion_state?: "pending" | "deleted"; id: number; email: string; lifecycle_state: "active" | "invited" | "suspended" | "revoked"; updated_at: string };
type Actor = Extract<PrincipalContext, { kind: "operator" }>;
const emailValue = (value: unknown) => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim().toLowerCase() : null;

export async function listUsers(db: DB) {
  const [operators, members, profiles] = await Promise.all([
    db.prepare("SELECT * FROM operators ORDER BY email").all<Operator>(),
    db.prepare("SELECT * FROM member_users ORDER BY email").all<Member>(),
    db.prepare("SELECT email, first_name, last_name FROM principal_profiles").all<{ email: string; first_name: string | null; last_name: string | null }>(),
  ]);
  const names = new Map(profiles.results.map(p => [p.email, [p.first_name, p.last_name].filter(Boolean).join(" ")]));
  const rows = new Map(members.results.map(m => [m.email, { email: m.email, name: names.get(m.email) || m.email, role: "member" as UserRole, status: m.deletion_state === "pending" ? "deletion_pending" : m.lifecycle_state, changedAt: m.updated_at }]));
  for (const o of operators.results) {
    if (o.member_only === 1) continue;
    const member = rows.get(o.email);
    rows.set(o.email, { email: o.email, name: names.get(o.email) || o.display_name || o.email, role: o.role, status: member?.status === "deletion_pending" ? "deletion_pending" : member?.status === "revoked" ? "revoked" : o.active ? "active" : "suspended", changedAt: o.updated_at });
  }
  const deleted = new Set(members.results.filter(m => m.deletion_state === "deleted").map(m => m.email));
  return [...rows.values()].filter(row => !deleted.has(row.email)).sort((a, b) => a.email.localeCompare(b.email));
}

function audit(db: DB, actor: Actor, action: "operator_role_change" | "operator_deactivate", scope: string, target: string) {
  return db.prepare("INSERT INTO audit_events (event_id, occurred_at, actor_operator_id, effective_role, action, entity_type, entity_id, outcome, environment, correlation_id, metadata_json) VALUES (?, ?, ?, ?, ?, 'operator', ?, 'succeeded', ?, ?, ?)")
    .bind(crypto.randomUUID(), new Date().toISOString(), actor.operatorId, actor.role, action, target, actor.environment, actor.correlationId, JSON.stringify({ scope }));
}

export async function manageUser(db: DB, actor: Actor, input: Record<string, unknown>, invitations: MemberInvitationClient, origin: string, deleteIdentity?: (email: string) => Promise<boolean>): Promise<{ ok: boolean; error?: string }> {
  if (!decide(actor.role, "members", "manage", { environment: actor.environment })) return { ok: false, error: "forbidden" };
  const email = emailValue(input.email);
  if (!email || !["invite", "role", "suspend", "reactivate", "revoke", "transfer", "delete"].includes(String(input.action))) return { ok: false, error: "invalid_request" };
  if (email === actor.email) return { ok: false, error: "cannot_change_your_own_access" };
  const operator = await db.prepare("SELECT * FROM operators WHERE email = ?").bind(email).first<Operator>();
  const member = await db.prepare("SELECT * FROM member_users WHERE email = ?").bind(email).first<Member>();
  if (operator?.role === "super_admin") return { ok: false, error: "super_admin_is_protected" };
  if (input.action === "delete") {
    if (input.confirmEmail !== email) return { ok: false, error: "confirm_email_required" };
    if (!operator && !member) return { ok: false, error: "user_not_found" };
    if (!deleteIdentity) return { ok: false, error: "deletion_not_configured" };
    if (member?.deletion_state === "deleted") return { ok: true };
    await eraseUserHistory(db, email);
    if (!await deleteIdentity(email)) return { ok: false, error: "deletion_pending" };
    await db.batch([
      db.prepare("UPDATE member_users SET deletion_state = 'deleted', updated_at = ? WHERE email = ? AND lifecycle_state = 'revoked'").bind(new Date().toISOString(), email),
      audit(db, actor, "operator_deactivate", "account_and_history_deleted", operator ? String(operator.id) : "member_deletion"),
    ]);
    return { ok: true };
  }
  if (member?.deletion_state) return { ok: false, error: "access_is_revoked" };
  if (input.action === "transfer") {
    if (!operator || operator.member_only === 1 || actor.role !== "super_admin") return { ok: false, error: "forbidden" };
    const ok = await transferSuperAdmin(db, { id: actor.operatorId, role: actor.role, active: true }, operator.id, actor.environment, actor.correlationId);
    return ok ? { ok: true } : { ok: false, error: "transfer_failed" };
  }
  if (input.action === "invite") {
    if (operator || (member && member.lifecycle_state !== "invited")) return { ok: false, error: "user_already_exists" };
    const result = await inviteCompanyMember(db, actor, { email, pilotCohort: "company", office: "remote", redirectUrl: new URL("/sign-up", origin).toString() }, actor.environment, actor.correlationId, invitations);
    return result?.invitationStatus === "sent" ? { ok: true } : { ok: false, error: "invitation_not_sent" };
  }
  if (!operator && !member) return { ok: false, error: "user_not_found" };
  if (input.action === "role") {
    if (!["member", "editor", "admin"].includes(String(input.role))) return { ok: false, error: "invalid_role" };
    if ((member && member.lifecycle_state !== "active") || (operator && !operator.active && operator.member_only !== 1)) return { ok: false, error: "activate_user_before_changing_role" };
    const now = new Date().toISOString();
    const statements = [];
    if (input.role === "member") {
      if (!operator || operator.member_only === 1) return { ok: true };
      // Preserve operator IDs referenced by historical audit/chat records.
      statements.push(db.prepare("INSERT OR IGNORE INTO member_users (email, role, lifecycle_state, pilot_cohort, office, created_at, updated_at, activated_at) VALUES (?, 'member', 'active', 'company', 'remote', ?, ?, ?)").bind(email, now, now, now));
      statements.push(db.prepare("UPDATE operators SET member_only = 1, active = 0, updated_at = ? WHERE id = ? AND role <> 'super_admin'").bind(now, operator.id));
    } else {
      statements.push(db.prepare("INSERT INTO operators (email, display_name, role, active, member_only) VALUES (?, '', ?, 1, 0) ON CONFLICT(email) DO UPDATE SET role = excluded.role, active = 1, member_only = 0, updated_at = ? WHERE operators.role <> 'super_admin'").bind(email, input.role, now));
    }
    statements.push(audit(db, actor, "operator_role_change", `role_${input.role}`, operator ? String(operator.id) : "member_promotion"));
    await db.batch(statements);
    return { ok: true };
  }
  if (member?.lifecycle_state === "revoked") return { ok: false, error: "access_is_revoked" };
  if (operator && operator.member_only !== 1) {
    const active = input.action === "reactivate" ? 1 : 0;
    const statements = [db.prepare("UPDATE operators SET active = ?, updated_at = ? WHERE id = ? AND role <> 'super_admin'").bind(active, new Date().toISOString(), operator.id)];
    if (!member && input.action === "revoke") {
      const now = new Date().toISOString();
      statements.push(db.prepare("INSERT INTO member_users (email, role, lifecycle_state, pilot_cohort, office, created_at, updated_at) VALUES (?, 'member', 'revoked', 'company', 'remote', ?, ?)").bind(email, now, now));
    }
    // A matching member row must not retain access after a later role change.
    if (member) statements.push(db.prepare("UPDATE member_users SET lifecycle_state = ?, updated_at = ? WHERE id = ?").bind(input.action === "revoke" ? "revoked" : active ? "active" : "suspended", new Date().toISOString(), member.id));
    statements.push(audit(db, actor, "operator_deactivate", String(input.action), String(operator.id)));
    await db.batch(statements);
    return { ok: true };
  }
  const ok = await changeCompanyMemberLifecycle(db, actor, email, input.action, actor.environment, actor.correlationId, invitations);
  return ok ? { ok: true } : { ok: false, error: "user_update_failed" };
}
