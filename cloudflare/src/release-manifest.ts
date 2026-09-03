import { auditInsertStatement, encodeAudit } from "./audit.ts";
import type { DB, OperatorRole } from "./db.ts";

export const RELEASE_STATES = ["paused", "preview", "stable", "rolled_back"] as const;
export type ReleaseState = typeof RELEASE_STATES[number];
export type ReleaseEnvironment = "local" | "staging" | "production";

export type AuthenticatedChatRelease = {
  feature: "authenticated_chat";
  environment: ReleaseEnvironment;
  state: ReleaseState;
  source: "manifest" | "env_fallback" | "default";
  updatedAt?: string;
  updatedByOperatorId?: number;
};

type ManifestRow = {
  environment: ReleaseEnvironment;
  state: unknown;
  updated_at?: unknown;
  updated_by_operator_id?: unknown;
};

export function isReleaseState(value: unknown): value is ReleaseState {
  return typeof value === "string" && (RELEASE_STATES as readonly string[]).includes(value);
}

function envFallback(value: unknown): ReleaseState | null {
  if (value === true) return "stable";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "preview") return "preview";
  if (["1", "true", "on", "enabled", "active", "stable"].includes(normalized)) return "stable";
  return null;
}

function defaultRelease(environment: ReleaseEnvironment): AuthenticatedChatRelease {
  return { feature: "authenticated_chat", environment, state: "paused", source: "default" };
}

export async function resolveAuthenticatedChatRelease(
  db: DB,
  environment: ReleaseEnvironment,
  localEnvironmentFlag?: unknown,
): Promise<AuthenticatedChatRelease> {
  if (environment === "production") return defaultRelease(environment);

  try {
    const row = await db.prepare("SELECT environment, state, updated_at, updated_by_operator_id FROM release_manifests WHERE environment = ?").bind(environment).first<ManifestRow>();
    if (row && row.environment === environment && isReleaseState(row.state)) {
      return {
        feature: "authenticated_chat",
        environment,
        state: row.state,
        source: "manifest",
        ...(typeof row.updated_at === "string" ? { updatedAt: row.updated_at } : {}),
        ...(Number.isSafeInteger(row.updated_by_operator_id) ? { updatedByOperatorId: Number(row.updated_by_operator_id) } : {}),
      };
    }
  } catch {
    // A lower environment without migration 0007 remains safely held, except
    // local development may use its explicit legacy feature-off seam.
  }

  const fallback = environment === "local" ? envFallback(localEnvironmentFlag) : null;
  return fallback ? { feature: "authenticated_chat", environment, state: fallback, source: "env_fallback" } : defaultRelease(environment);
}

export function isAuthenticatedChatEnabled(release: Pick<AuthenticatedChatRelease, "state">): boolean {
  return release.state === "preview" || release.state === "stable";
}

export function canMutateAuthenticatedChatRelease(role: unknown, environment: unknown): boolean {
  return role === "super_admin" && (environment === "local" || environment === "staging");
}

export async function setAuthenticatedChatRelease(
  db: DB,
  actor: { operatorId: number; role: OperatorRole },
  environment: ReleaseEnvironment,
  state: unknown,
  correlationId: string,
  now = new Date().toISOString(),
): Promise<AuthenticatedChatRelease | null> {
  if (!canMutateAuthenticatedChatRelease(actor.role, environment) || !isReleaseState(state) || !Number.isSafeInteger(actor.operatorId) || actor.operatorId <= 0) return null;
  const event = encodeAudit({
    action: "settings_policy_change",
    entityType: "policy",
    entityId: "authenticated_chat_release",
    outcome: "succeeded",
    environment,
    correlationId,
    actorId: actor.operatorId,
    role: actor.role,
    metadata: { scope: `${environment}:${state}` },
  }, now);
  if (!event) return null;

  try {
    await db.batch([
      db.prepare("INSERT INTO release_manifests (environment, state, version, updated_at, updated_by_operator_id) VALUES (?, ?, 1, ?, ?) ON CONFLICT(environment) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at, updated_by_operator_id = excluded.updated_by_operator_id, version = release_manifests.version + 1").bind(environment, state, now, actor.operatorId),
      auditInsertStatement(db, event),
    ]);
    return { feature: "authenticated_chat", environment, state, source: "manifest", updatedAt: now, updatedByOperatorId: actor.operatorId };
  } catch {
    return null;
  }
}
