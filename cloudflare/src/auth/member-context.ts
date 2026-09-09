import type { ClerkVerification } from "./clerk.ts";
import type { DB } from "../db.ts";

export type MemberContext = {
  memberId: number;
  role: "member";
  workspace: "wtfmedia";
  pilotCohort: "bangalore" | "company";
  environment: "local" | "staging";
  correlationId: string;
};

type MemberRow = {
  id: number;
  email: string;
  clerk_user_id: string | null;
  lifecycle_state: "invited" | "active" | "suspended" | "revoked";
  pilot_cohort: "bangalore" | "company";
};

function validCorrelationId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function validMember(row: MemberRow | null): row is MemberRow {
  return Boolean(row)
    && Number.isSafeInteger(row?.id)
    && row.id > 0
    && (row?.pilot_cohort === "bangalore" || row?.pilot_cohort === "company")
    && ["invited", "active", "suspended", "revoked"].includes(String(row?.lifecycle_state));
}

/** Resolves D1 membership; a Clerk session alone never grants Beta authority. */
export async function resolveMemberContext(
  db: DB,
  identity: ClerkVerification,
  environment: "local" | "staging" | "production",
  correlationId: string,
  now = new Date().toISOString(),
): Promise<MemberContext | null> {
  if (!identity.ok || environment === "production" || !validCorrelationId(correlationId)) return null;
  try {
    const ready = await db.prepare("SELECT 1 AS ready FROM sqlite_master WHERE type = 'table' AND name IN ('member_users', 'member_invitations') GROUP BY 1 HAVING COUNT(*) = 2").first<{ ready: number }>();
    if (!ready) return null;
    const member = await db.prepare("SELECT id, email, clerk_user_id, lifecycle_state, pilot_cohort FROM member_users WHERE email = ?").bind(identity.email).first<MemberRow>();
    if (!validMember(member)) return null;
    if (member.lifecycle_state === "invited" && member.clerk_user_id === null) {
      await db.batch([
        db.prepare("UPDATE member_users SET clerk_user_id = ?, lifecycle_state = 'active', activated_at = ?, updated_at = ? WHERE id = ? AND lifecycle_state = 'invited' AND clerk_user_id IS NULL").bind(identity.userId, now, now, member.id),
        db.prepare("UPDATE member_invitations SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE member_id = ? AND status = 'sent'").bind(now, now, member.id),
        db.prepare("INSERT INTO member_audit_events (id, actor_operator_id, member_id, invitation_id, action, outcome, correlation_id, metadata_json, occurred_at) VALUES (?, NULL, ?, NULL, 'member_activate', 'succeeded', ?, '{}', ?)").bind(`mevt_${crypto.randomUUID()}`, member.id, correlationId, now),
      ]);
      // A competing activation must never receive authority merely because it read
      // the pre-binding row. Re-read the committed D1 identity before admitting.
      const activated = await db.prepare("SELECT id, email, clerk_user_id, lifecycle_state, pilot_cohort FROM member_users WHERE id = ?").bind(member.id).first<MemberRow>();
      if (!validMember(activated) || activated.lifecycle_state !== "active" || activated.clerk_user_id !== identity.userId) return null;
      return { memberId: activated.id, role: "member", workspace: "wtfmedia", pilotCohort: activated.pilot_cohort, environment, correlationId };
    }
    if (member.lifecycle_state !== "active" || member.clerk_user_id !== identity.userId) return null;
    return { memberId: member.id, role: "member", workspace: "wtfmedia", pilotCohort: member.pilot_cohort, environment, correlationId };
  } catch {
    return null;
  }
}
