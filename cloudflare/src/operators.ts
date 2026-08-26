import type { DB, OperatorRole } from "./db.ts";
import { decide } from "./auth/policy.ts";
import { auditInsertStatement, encodeAudit } from "./audit.ts";

type Actor = { id: number; role: OperatorRole; active: boolean };
type Environment = "local" | "staging" | "production";

export type OperatorRosterRecord = { name: string; email: string; role: OperatorRole; active: boolean; changedAt: string | null };

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function displayName(value: unknown): string | null {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length >= 1 && name.length <= 160 ? name : null;
}

function managedRole(value: unknown): value is "admin" | "editor" {
  return value === "admin" || value === "editor";
}

function canManage(actor: Actor, environment: Environment): boolean {
  return actor.active && decide(actor.role, "operators", "manage", { environment });
}

export async function listOperatorRoster(db: DB, actor: Actor, environment: Environment): Promise<OperatorRosterRecord[] | null> {
  if (!canManage(actor, environment)) return null;
  try {
    const result = await db.prepare("SELECT display_name, email, role, active, updated_at FROM operators ORDER BY created_at ASC").all<{ display_name: string; email: string; role: OperatorRole; active: number; updated_at: string | null }>();
    return result.results.map((row) => ({ name: row.display_name, email: row.email, role: row.role, active: row.active === 1, changedAt: row.updated_at }));
  } catch {
    return null;
  }
}

/** A super admin explicitly authorizes an email before any invitation can consume it. */
export async function approveOperatorInvitation(db: DB, actor: Actor, emailInput: unknown, nameInput: unknown, environment: Environment, correlationId: string): Promise<boolean> {
  const email = normalizedEmail(emailInput);
  const name = displayName(nameInput);
  if (!email || !name || !actor.active || actor.role !== "super_admin" || !decide(actor.role, "operators", "approve", { environment })) return false;
  const event = encodeAudit({ action: "operator_invite", entityType: "operator", entityId: "invitation", outcome: "succeeded", environment, correlationId, actorId: actor.id, role: actor.role, metadata: { scope: "approval" } });
  if (!event) return false;
  try {
    await db.batch([
      db.prepare("INSERT INTO operator_invitation_approvals (email, display_name, approved_by_operator_id, consumed_at) VALUES (?, ?, ?, NULL) ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, approved_by_operator_id = excluded.approved_by_operator_id, approved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), consumed_at = NULL").bind(email, name, actor.id),
      auditInsertStatement(db, event),
    ]);
    return true;
  } catch { return false; }
}

/** Admins can consume, but never manufacture, a pending super-admin approval. */
export async function inviteApprovedOperator(db: DB, actor: Actor, emailInput: unknown, roleInput: unknown, environment: Environment, correlationId: string): Promise<boolean> {
  const email = normalizedEmail(emailInput);
  if (!email || !managedRole(roleInput) || !canManage(actor, environment)) return false;
  const event = encodeAudit({ action: "operator_invite", entityType: "operator", entityId: "invitation", outcome: "succeeded", environment, correlationId, actorId: actor.id, role: actor.role, metadata: { scope: "approved" } });
  if (!event) return false;
  try {
    const approval = await db.prepare("SELECT display_name FROM operator_invitation_approvals WHERE email = ? AND consumed_at IS NULL").bind(email).first<{ display_name: string }>();
    if (!approval) return false;
    await db.batch([
      db.prepare("INSERT INTO operators (email, display_name, role, active) VALUES (?, ?, ?, 1)").bind(email, approval.display_name, roleInput),
      db.prepare("UPDATE operator_invitation_approvals SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL").bind(new Date().toISOString(), email),
      auditInsertStatement(db, event),
    ]);
    return true;
  } catch { return false; }
}

export async function changeOperatorLifecycle(db: DB, actor: Actor, emailInput: unknown, change: { role?: unknown; active?: unknown }, environment: Environment, correlationId: string): Promise<boolean> {
  const email = normalizedEmail(emailInput);
  if (!email || !canManage(actor, environment) || (change.role !== undefined && !managedRole(change.role)) || (change.active !== undefined && typeof change.active !== "boolean") || (change.role === undefined && change.active === undefined)) return false;
  try {
    const target = await db.prepare("SELECT id, role, active FROM operators WHERE email = ?").bind(email).first<{ id: number; role: OperatorRole; active: number }>();
    if (!target || (target.role === "super_admin" && target.active === 1)) return false;
    const action = change.role !== undefined ? "operator_role_change" : "operator_deactivate";
    const event = encodeAudit({ action, entityType: "operator", entityId: String(target.id), outcome: "succeeded", environment, correlationId, actorId: actor.id, role: actor.role, metadata: { scope: change.role !== undefined ? "role" : "active" } });
    if (!event) return false;
    if (change.role !== undefined) await db.batch([db.prepare("UPDATE operators SET role = ?, updated_at = ? WHERE id = ?").bind(change.role, new Date().toISOString(), target.id), auditInsertStatement(db, event)]);
    else await db.batch([db.prepare("UPDATE operators SET active = ?, updated_at = ? WHERE id = ?").bind(change.active ? 1 : 0, new Date().toISOString(), target.id), auditInsertStatement(db, event)]);
    return true;
  } catch { return false; }
}

export async function transferSuperAdmin(
  db: DB,
  actor: Actor,
  targetOperatorId: number,
  environment: Environment,
  correlationId: string,
): Promise<boolean> {
  if (!actor.active || actor.role !== "super_admin" || !Number.isInteger(targetOperatorId) || targetOperatorId <= 0) return false;
  if (!decide(actor.role, "operators", "transfer", { environment })) return false;
  try {
    const target = await db.prepare("SELECT id, active FROM operators WHERE id = ?").bind(targetOperatorId).first<{ id: number; active: number }>();
    if (!target || target.active !== 1 || target.id === actor.id) return false;
    const event = encodeAudit({
      action: "super_admin_handoff", entityType: "operator", entityId: String(targetOperatorId), outcome: "succeeded", environment,
      correlationId, actorId: actor.id, role: "super_admin", metadata: { scope: "ownership" },
    });
    if (!event) return false;
    await db.batch([
      db.prepare("INSERT INTO super_admin_transfer_guard (id, from_operator_id, to_operator_id) VALUES (1, ?, ?)").bind(actor.id, targetOperatorId),
      db.prepare("UPDATE operators SET role = 'admin', updated_at = ? WHERE id = ? AND role = 'super_admin' AND active = 1").bind(new Date().toISOString(), actor.id),
      db.prepare("UPDATE operators SET role = 'super_admin', updated_at = ? WHERE id = ? AND active = 1").bind(new Date().toISOString(), targetOperatorId),
      auditInsertStatement(db, event),
      db.prepare("DELETE FROM super_admin_transfer_guard WHERE id = 1"),
    ]);
    const result = await db.prepare("SELECT COUNT(*) AS total FROM operators WHERE role = 'super_admin' AND active = 1").first<{ total: number }>();
    return result?.total === 1;
  } catch {
    return false;
  }
}
