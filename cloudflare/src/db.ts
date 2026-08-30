// D1 access for the migrated Phase 02 operator schema.
// Schema creation and alteration are deliberately owned by Wrangler migrations.

export type OperatorRole = "super_admin" | "admin" | "editor";

export interface Operator {
  id: number;
  email: string;
  display_name: string;
  role: OperatorRole;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  event_id: string;
  occurred_at: string;
  actor_operator_id: number | null;
  actor_subject_digest: string | null;
  effective_role: OperatorRole | null;
  action: AuditAction;
  entity_type: "operator" | "audit" | "policy" | "control_room" | "episode" | "source_asset" | "transcript_version" | "ingestion_job";
  entity_id: string;
  outcome: "allowed" | "denied" | "succeeded" | "failed";
  environment: "local" | "staging" | "production";
  correlation_id: string;
  schema_version: 1;
  metadata_json: string;
  created_at: string;
}

export type AuditAction =
  | "auth_allowed"
  | "auth_denied"
  | "session_expired"
  | "logout"
  | "protected_search"
  | "protected_view"
  | "audit_export"
  | "operator_invite"
  | "operator_role_change"
  | "operator_deactivate"
  | "settings_policy_change"
  | "audit_purge"
  | "super_admin_handoff"
  | "asset_upload"
  | "ingest_trigger"
  | "transcript_activate"
  | "episode_update";

export type DB = D1Database;

export async function assertOpsMigrations(db: DB): Promise<void> {
  const ready = await db
    .prepare("SELECT 1 AS ready FROM sqlite_master WHERE type = 'table' AND name IN ('operators', 'audit_events') GROUP BY 1 HAVING COUNT(*) = 2")
    .first<{ ready: number }>();
  if (!ready) throw new Error("ops_migrations_required");
}

export async function getOperatorByEmail(db: DB, email: string): Promise<Operator | null> {
  await assertOpsMigrations(db);
  const normalizedEmail = email.trim().toLowerCase();
  return (await db
    .prepare("SELECT id, email, display_name, role, active, created_at, updated_at FROM operators WHERE email = ? AND active = 1")
    .bind(normalizedEmail)
    .first<Operator>()) ?? null;
}

export async function getOperatorById(db: DB, id: number): Promise<Operator | null> {
  await assertOpsMigrations(db);
  return (await db
    .prepare("SELECT id, email, display_name, role, active, created_at, updated_at FROM operators WHERE id = ?")
    .bind(id)
    .first<Operator>()) ?? null;
}

export async function listOperators(db: DB, activeOnly = true): Promise<Operator[]> {
  await assertOpsMigrations(db);
  const result = activeOnly
    ? await db.prepare("SELECT id, email, display_name, role, active, created_at, updated_at FROM operators WHERE active = 1 ORDER BY created_at DESC").all<Operator>()
    : await db.prepare("SELECT id, email, display_name, role, active, created_at, updated_at FROM operators ORDER BY created_at DESC").all<Operator>();
  return result.results;
}

// Legacy draft endpoint helpers are fail-closed until later plans supply
// policy-authorized operator mutations and typed audit encoding.
function legacyAuthorityDisabled(): never {
  throw new Error("ops_legacy_authority_disabled");
}

export async function createOperator(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function updateOperatorRole(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function deactivateOperator(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function reactivateOperator(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function logAuditEvent(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function queryAuditEvents(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function getSetting(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
export async function setSetting(..._args: unknown[]): Promise<never> { return legacyAuthorityDisabled(); }
