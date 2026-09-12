import type { ClerkVerification } from "./clerk.ts";
import type { OperatorRole, DB } from "../db.ts";
import { betaCapabilitiesForRole, type Role } from "./policy.ts";

type Environment = "local" | "staging" | "production";
type MemberLifecycle = "invited" | "active" | "suspended" | "revoked";
type MemberRow = { id: number; email: string; clerk_user_id: string | null; lifecycle_state: MemberLifecycle; pilot_cohort: "bangalore" | "company" };
type OperatorRow = { id: number; email: string; display_name: string; role: OperatorRole; active: number };

export type PrincipalContext =
  | { kind: "operator"; operatorId: number; role: OperatorRole; email: string; firstName?: string; lastName?: string; displayName: string; environment: Environment; correlationId: string }
  | { kind: "member"; memberId: number; role: "member"; email: string; firstName?: string; lastName?: string; displayName: string | null; workspace: "wtfmedia"; pilotCohort: "bangalore" | "company"; environment: Exclude<Environment, "production">; correlationId: string };

export type PrincipalContextDto = {
  kind: PrincipalContext["kind"];
  role: Role;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string | null;
  landingRoute: "/beta/chat" | "/beta/workspace";
  capabilities: string[];
  environment: Environment;
};

const operatorRoles = new Set<OperatorRole>(["super_admin", "admin", "editor"]);
const memberLifecycles = new Set<MemberLifecycle>(["invited", "active", "suspended", "revoked"]);
const validCorrelationId = (value: unknown): value is string => typeof value === "string" && value.length >= 8 && value.length <= 128;
const memberRow = (value: MemberRow | null): value is MemberRow => Boolean(value) && Number.isSafeInteger(value.id) && value.id > 0 && memberLifecycles.has(value.lifecycle_state) && (value.pilot_cohort === "bangalore" || value.pilot_cohort === "company");
const operatorRow = (value: OperatorRow | null): value is OperatorRow => Boolean(value) && Number.isSafeInteger(value.id) && value.id > 0 && (value.active === 0 || value.active === 1) && operatorRoles.has(value.role);

function displayName(firstName?: string, lastName?: string): string | null {
  const value = [firstName, lastName].filter(Boolean).join(" ").trim();
  return value || null;
}

async function mirrorProfile(db: DB, context: PrincipalContext): Promise<void> {
  // Profiles remain a mirror: admission authority is always the source roster row.
  if (typeof db.batch !== "function") return;
  const now = new Date().toISOString();
  const profile = context.kind === "operator"
    ? db.prepare("INSERT INTO principal_profiles (email, operator_id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET first_name = COALESCE(excluded.first_name, principal_profiles.first_name), last_name = COALESCE(excluded.last_name, principal_profiles.last_name), updated_at = excluded.updated_at").bind(context.email, context.operatorId, context.firstName ?? null, context.lastName ?? null, now, now)
    : db.prepare("INSERT INTO principal_profiles (email, member_id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET first_name = COALESCE(excluded.first_name, principal_profiles.first_name), last_name = COALESCE(excluded.last_name, principal_profiles.last_name), updated_at = excluded.updated_at").bind(context.email, context.memberId, context.firstName ?? null, context.lastName ?? null, now, now);
  await db.batch([profile]);
}

function operatorContext(row: OperatorRow, identity: Extract<ClerkVerification, { ok: true }>, environment: Environment, correlationId: string): PrincipalContext {
  return { kind: "operator", operatorId: row.id, role: row.role, email: row.email, ...(identity.firstName ? { firstName: identity.firstName } : {}), ...(identity.lastName ? { lastName: identity.lastName } : {}), displayName: row.display_name || displayName(identity.firstName, identity.lastName) || "Operator", environment, correlationId };
}

function memberContext(row: MemberRow, identity: Extract<ClerkVerification, { ok: true }>, environment: Exclude<Environment, "production">, correlationId: string): PrincipalContext {
  return { kind: "member", memberId: row.id, role: "member", email: row.email, ...(identity.firstName ? { firstName: identity.firstName } : {}), ...(identity.lastName ? { lastName: identity.lastName } : {}), displayName: displayName(identity.firstName, identity.lastName), workspace: "wtfmedia", pilotCohort: row.pilot_cohort, environment, correlationId };
}

/**
 * Resolves the sole authenticated Beta principal. Operator rows are intentionally
 * inspected before members, including inactive records, so a historical collision
 * cannot downgrade an operator lifecycle denial into member access.
 */
export async function resolvePrincipalContext(db: DB, identity: ClerkVerification, environment: Environment, correlationId: string, now = new Date().toISOString()): Promise<PrincipalContext | null> {
  if (!identity.ok || environment === "production" || !validCorrelationId(correlationId)) return null;
  try {
    const operator = await db.prepare("SELECT id, email, display_name, role, active FROM operators WHERE email = ?").bind(identity.email).first<OperatorRow>();
    if (operator) {
      if (!operatorRow(operator) || operator.active !== 1) return null;
      const context = operatorContext(operator, identity, environment, correlationId);
      await mirrorProfile(db, context);
      return context;
    }
    const ready = await db.prepare("SELECT 1 AS ready FROM sqlite_master WHERE type = 'table' AND name IN ('member_users', 'member_invitations', 'principal_profiles') GROUP BY 1 HAVING COUNT(*) = 3").first<{ ready: number }>();
    if (!ready) return null;
    const existing = await db.prepare("SELECT id, email, clerk_user_id, lifecycle_state, pilot_cohort FROM member_users WHERE email = ?").bind(identity.email).first<MemberRow>();
    if (!existing) {
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO member_users (email, clerk_user_id, role, lifecycle_state, pilot_cohort, office, created_at, updated_at, activated_at) VALUES (?, ?, 'member', 'active', 'company', 'remote', ?, ?, ?)").bind(identity.email, identity.userId, now, now, now),
        db.prepare("INSERT INTO member_audit_events (id, actor_operator_id, member_id, invitation_id, action, outcome, correlation_id, metadata_json, occurred_at) SELECT ?, NULL, id, NULL, 'member_activate', 'succeeded', ?, '{\"source\":\"open_enrollment\"}', ? FROM member_users WHERE email = ? AND clerk_user_id = ?").bind(`mevt_${crypto.randomUUID()}`, correlationId, now, identity.email, identity.userId),
      ]);
      const provisioned = await db.prepare("SELECT id, email, clerk_user_id, lifecycle_state, pilot_cohort FROM member_users WHERE email = ?").bind(identity.email).first<MemberRow>();
      if (!memberRow(provisioned) || provisioned.lifecycle_state !== "active" || provisioned.clerk_user_id !== identity.userId) return null;
      const context = memberContext(provisioned, identity, environment, correlationId);
      await mirrorProfile(db, context);
      return context;
    }
    if (!memberRow(existing)) return null;
    if (existing.lifecycle_state === "invited" && existing.clerk_user_id === null) {
      await db.batch([
        db.prepare("UPDATE member_users SET clerk_user_id = ?, lifecycle_state = 'active', activated_at = ?, updated_at = ? WHERE id = ? AND lifecycle_state = 'invited' AND clerk_user_id IS NULL").bind(identity.userId, now, now, existing.id),
        db.prepare("UPDATE member_invitations SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE member_id = ? AND status = 'sent'").bind(now, now, existing.id),
        db.prepare("INSERT INTO member_audit_events (id, actor_operator_id, member_id, invitation_id, action, outcome, correlation_id, metadata_json, occurred_at) VALUES (?, NULL, ?, NULL, 'member_activate', 'succeeded', ?, '{}', ?)").bind(`mevt_${crypto.randomUUID()}`, existing.id, correlationId, now),
      ]);
      const activated = await db.prepare("SELECT id, email, clerk_user_id, lifecycle_state, pilot_cohort FROM member_users WHERE id = ?").bind(existing.id).first<MemberRow>();
      if (!memberRow(activated) || activated.lifecycle_state !== "active" || activated.clerk_user_id !== identity.userId) return null;
      const context = memberContext(activated, identity, environment, correlationId);
      await mirrorProfile(db, context);
      return context;
    }
    if (existing.lifecycle_state !== "active" || existing.clerk_user_id !== identity.userId) return null;
    const context = memberContext(existing, identity, environment, correlationId);
    await mirrorProfile(db, context);
    return context;
  } catch {
    return null;
  }
}

export function principalContextDto(context: PrincipalContext): PrincipalContextDto {
  return {
    kind: context.kind,
    role: context.role,
    email: context.email,
    ...(context.firstName ? { firstName: context.firstName } : {}),
    ...(context.lastName ? { lastName: context.lastName } : {}),
    displayName: context.displayName,
    landingRoute: context.kind === "operator" ? "/beta/workspace" : "/beta/chat",
    capabilities: betaCapabilitiesForRole(context.role),
    environment: context.environment,
  };
}
