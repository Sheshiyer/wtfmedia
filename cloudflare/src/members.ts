import { decide } from "./auth/policy.ts";
import type { OperatorRole, DB } from "./db.ts";

type Environment = "local" | "staging" | "production";
type MemberActor = { operatorId: number; role: OperatorRole };

export type MemberInvitationClient = {
  create(input: {
    email: string;
    redirectUrl: string;
    publicMetadata: Record<string, string>;
  }): Promise<
    | { id: string; status: "pending" | "accepted" | "revoked" | "expired" }
    | { error: "rate_limited" | "rejected" | "unavailable"; retryAfterSeconds?: number }
  >;
  revoke(invitationId: string): Promise<
    | { id: string; status: "pending" | "accepted" | "revoked" | "expired" }
    | { error: "rate_limited" | "rejected" | "unavailable"; retryAfterSeconds?: number }
  >;
};

type InvitationInput = {
  email: unknown;
  pilotCohort?: unknown;
  office?: unknown;
  redirectUrl?: unknown;
};

type StoredMember = {
  id: number;
  email: string;
  lifecycle_state: "invited" | "active" | "suspended" | "revoked";
  pilot_cohort: "bangalore" | "company";
  office: string;
};

export type MemberInvitationSummary = {
  memberId: number;
  email: string;
  lifecycleState: StoredMember["lifecycle_state"];
  pilotCohort: StoredMember["pilot_cohort"];
  office: string;
  invitationStatus: "sent" | "failed";
};

export type MemberRosterRecord = {
  id: number;
  email: string;
  role: "member";
  lifecycleState: StoredMember["lifecycle_state"];
  pilotCohort: StoredMember["pilot_cohort"];
  office: string;
  invitationStatus: string | null;
  changedAt: string;
};

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizedOffice(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const office = value.trim().toLowerCase();
  return office.length >= 2 && office.length <= 64 && /^[a-z][a-z -]*[a-z]$/u.test(office) ? office : null;
}

function pilotCohort(value: unknown): "bangalore" | "company" | null {
  return value === "bangalore" || value === "company" ? value : null;
}

function validCorrelationId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function validRedirectUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["/beta", "/sign-up"].includes(url.pathname);
  } catch {
    return false;
  }
}

function canManageMembers(actor: MemberActor, environment: Environment): boolean {
  return Number.isSafeInteger(actor.operatorId)
    && actor.operatorId > 0
    && decide(actor.role, "members", "manage", { environment });
}

export async function listCompanyMembers(db: DB, actor: MemberActor, environment: Environment): Promise<MemberRosterRecord[] | null> {
  if (!Number.isSafeInteger(actor.operatorId) || actor.operatorId <= 0 || !decide(actor.role, "members", "read", { environment })) return null;
  try {
    const result = await db.prepare(`SELECT
      member_users.id,
      member_users.email,
      member_users.role,
      member_users.lifecycle_state,
      member_users.pilot_cohort,
      member_users.office,
      member_users.updated_at,
      (
        SELECT member_invitations.status
        FROM member_invitations
        WHERE member_invitations.member_id = member_users.id
        ORDER BY member_invitations.created_at DESC, member_invitations.id DESC
        LIMIT 1
      ) AS invitation_status
      FROM member_users
      ORDER BY member_users.created_at ASC, member_users.id ASC`).all<{
      id: number;
      email: string;
      role: "member";
      lifecycle_state: StoredMember["lifecycle_state"];
      pilot_cohort: StoredMember["pilot_cohort"];
      office: string;
      updated_at: string;
      invitation_status: string | null;
    }>();
    return result.results.map((member) => ({
      id: member.id,
      email: member.email,
      role: member.role,
      lifecycleState: member.lifecycle_state,
      pilotCohort: member.pilot_cohort,
      office: member.office,
      invitationStatus: member.invitation_status,
      changedAt: member.updated_at,
    }));
  } catch {
    return null;
  }
}

function memberAuditStatement(
  db: DB,
  action: "member_invite",
  outcome: "succeeded" | "failed" | "unknown",
  actor: MemberActor,
  memberId: number,
  invitationId: string | null,
  correlationId: string,
  now: string,
) {
  return db.prepare("INSERT INTO member_audit_events (id, actor_operator_id, member_id, invitation_id, action, outcome, correlation_id, metadata_json, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?)")
    .bind(`mevt_${crypto.randomUUID()}`, actor.operatorId, memberId, invitationId, action, outcome, correlationId, now);
}

/** Creates an app-authorized D1 receipt before dispatching the provider email. */
export async function inviteCompanyMember(
  db: DB,
  actor: MemberActor,
  input: InvitationInput,
  environment: Environment,
  correlationId: string,
  invitations: MemberInvitationClient,
  now = new Date().toISOString(),
): Promise<MemberInvitationSummary | null> {
  const email = normalizedEmail(input.email);
  const cohort = pilotCohort(input.pilotCohort);
  const office = normalizedOffice(input.office);
  const redirectUrl = input.redirectUrl === undefined ? "https://placeholder.invalid/beta" : input.redirectUrl;
  if (!email || !cohort || !office || !validRedirectUrl(redirectUrl) || !validCorrelationId(correlationId) || !canManageMembers(actor, environment)) return null;

  try {
    let member = await db.prepare("SELECT id, email, lifecycle_state, pilot_cohort, office FROM member_users WHERE email = ?").bind(email).first<StoredMember>();
    if (member && member.lifecycle_state !== "invited") return null;
    if (!member) {
      await db.prepare("INSERT INTO member_users (email, role, lifecycle_state, pilot_cohort, office, created_at, updated_at, activated_at) VALUES (?, 'member', 'invited', ?, ?, ?, ?, NULL)")
        .bind(email, cohort, office, now, now)
        .run();
      member = await db.prepare("SELECT id, email, lifecycle_state, pilot_cohort, office FROM member_users WHERE email = ?").bind(email).first<StoredMember>();
    }
    if (!member || member.lifecycle_state !== "invited") return null;

    const invitationId = `minv_${crypto.randomUUID()}`;
    await db.prepare("INSERT INTO member_invitations (id, member_id, clerk_invitation_id, status, created_by_operator_id, correlation_id, sent_at, accepted_at, revoked_at, failure_code, created_at, updated_at) VALUES (?, ?, NULL, 'dispatching', ?, ?, NULL, NULL, NULL, NULL, ?, ?)")
      .bind(invitationId, member.id, actor.operatorId, correlationId, now, now)
      .run();
    await memberAuditStatement(db, "member_invite", "unknown", actor, member.id, invitationId, correlationId, now).run();

    const provider = await invitations.create({
      email,
      redirectUrl,
      publicMetadata: { workspace: "wtfmedia", pilot_cohort: member.pilot_cohort },
    });
    if ("error" in provider) {
      await db.prepare("UPDATE member_invitations SET status = 'failed', failure_code = ?, updated_at = ? WHERE id = ? AND status = 'dispatching'")
        .bind(provider.error, now, invitationId)
        .run();
      await memberAuditStatement(db, "member_invite", "failed", actor, member.id, invitationId, correlationId, now).run();
      return {
        memberId: member.id,
        email: member.email,
        lifecycleState: member.lifecycle_state,
        pilotCohort: member.pilot_cohort,
        office: member.office,
        invitationStatus: "failed",
      };
    }
    await db.prepare("UPDATE member_invitations SET status = 'sent', clerk_invitation_id = ?, sent_at = ?, updated_at = ? WHERE id = ? AND status = 'dispatching'")
      .bind(provider.id, now, now, invitationId)
      .run();
    await memberAuditStatement(db, "member_invite", "succeeded", actor, member.id, invitationId, correlationId, now).run();
    return {
      memberId: member.id,
      email: member.email,
      lifecycleState: member.lifecycle_state,
      pilotCohort: member.pilot_cohort,
      office: member.office,
      invitationStatus: "sent",
    };
  } catch {
    return null;
  }
}

type MemberLifecycleAction = "revoke" | "suspend" | "reactivate";

/**
 * Lifecycle is app-authoritative: suspended/revoked members immediately lose
 * D1 admission. Pending Clerk invitations are revoked at the provider first.
 */
export async function changeCompanyMemberLifecycle(
  db: DB,
  actor: MemberActor,
  emailInput: unknown,
  action: unknown,
  environment: Environment,
  correlationId: string,
  invitations: MemberInvitationClient,
  now = new Date().toISOString(),
): Promise<boolean> {
  const email = normalizedEmail(emailInput);
  if (!email || !["revoke", "suspend", "reactivate"].includes(String(action)) || !validCorrelationId(correlationId) || !canManageMembers(actor, environment)) return false;
  const intent = action as MemberLifecycleAction;
  try {
    const member = await db.prepare("SELECT id, email, lifecycle_state, pilot_cohort, office FROM member_users WHERE email = ?").bind(email).first<StoredMember>();
    if (!member) return false;
    if (intent === "suspend" && member.lifecycle_state !== "active") return false;
    if (intent === "reactivate" && member.lifecycle_state !== "suspended") return false;
    if (intent === "revoke" && member.lifecycle_state === "revoked") return false;

    if (intent === "revoke" && member.lifecycle_state === "invited") {
      const invitation = await db.prepare("SELECT id, clerk_invitation_id FROM member_invitations WHERE member_id = ? AND status = 'sent' ORDER BY created_at DESC, id DESC LIMIT 1").bind(member.id).first<{ id: string; clerk_invitation_id: string | null }>();
      if (!invitation?.clerk_invitation_id) return false;
      const provider = await invitations.revoke(invitation.clerk_invitation_id);
      if ("error" in provider || provider.status !== "revoked") {
        await memberAuditStatement(db, "member_invite_revoke", "failed", actor, member.id, invitation.id, correlationId, now).run().catch(() => undefined);
        return false;
      }
      await db.batch([
        db.prepare("UPDATE member_users SET lifecycle_state = 'revoked', updated_at = ? WHERE id = ? AND lifecycle_state = 'invited'").bind(now, member.id),
        db.prepare("UPDATE member_invitations SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE id = ? AND status = 'sent'").bind(now, now, invitation.id),
        memberAuditStatement(db, "member_invite_revoke", "succeeded", actor, member.id, invitation.id, correlationId, now),
      ]);
      return true;
    }

    const next = intent === "suspend" ? "suspended" : intent === "reactivate" ? "active" : "revoked";
    const auditAction = intent === "suspend" ? "member_suspend" : intent === "reactivate" ? "member_reactivate" : "member_invite_revoke";
    await db.batch([
      db.prepare("UPDATE member_users SET lifecycle_state = ?, updated_at = ? WHERE id = ? AND lifecycle_state = ?").bind(next, now, member.id, member.lifecycle_state),
      memberAuditStatement(db, auditAction, "succeeded", actor, member.id, null, correlationId, now),
    ]);
    return true;
  } catch {
    return false;
  }
}
