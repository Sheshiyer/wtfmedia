import type { AuditAction, AuditEvent, DB, OperatorRole } from "./db.ts";
import { decide } from "./auth/policy.ts";

export type Environment = "local" | "staging" | "production";
export type AuditEntityType = AuditEvent["entity_type"];
export type AuditOutcome = AuditEvent["outcome"];
export type AuditScalar = string | number | boolean;

export type AuditInput = {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  outcome: AuditOutcome;
  environment: Environment;
  correlationId: string;
  actorId?: number;
  role?: OperatorRole;
  subjectDigest?: string;
  metadata?: Record<string, AuditScalar>;
};

export type AuditFilters = {
  action?: AuditAction;
  environment?: Environment;
  outcome?: AuditOutcome;
  role?: OperatorRole;
  before?: string;
  after?: string;
  limit?: number;
};

export type AuditLedgerRecord = {
  timestamp: string;
  subject: "recorded operator" | "approved pseudonymous subject" | "unknown";
  role: OperatorRole | "unknown";
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  outcome: AuditOutcome;
  environment: Environment;
  correlationId: string;
};

export type AuditExport = {
  filename: string;
  headers: Readonly<Record<string, string>>;
  body: string;
};

type EventRule = {
  entityType: AuditEntityType;
  outcomes: readonly AuditOutcome[];
  metadataKeys: readonly string[];
};

const environments = new Set<Environment>(["local", "staging", "production"]);
const actions = new Set<AuditAction>([
  "auth_allowed", "auth_denied", "session_expired", "logout",
  "protected_search", "protected_view", "audit_export",
  "operator_invite", "operator_role_change", "operator_deactivate",
  "settings_policy_change", "audit_purge", "super_admin_handoff",
]);
const roles = new Set<OperatorRole>(["super_admin", "admin", "editor"]);
const outcomes = new Set<AuditOutcome>(["allowed", "denied", "succeeded", "failed"]);

const eventRules: Readonly<Record<AuditAction, EventRule>> = {
  auth_allowed: { entityType: "operator", outcomes: ["allowed"], metadataKeys: ["reason"] },
  auth_denied: { entityType: "operator", outcomes: ["denied"], metadataKeys: ["reason"] },
  session_expired: { entityType: "operator", outcomes: ["succeeded"], metadataKeys: ["reason"] },
  logout: { entityType: "operator", outcomes: ["succeeded"], metadataKeys: ["reason"] },
  protected_search: { entityType: "control_room", outcomes: ["allowed", "denied"], metadataKeys: ["count", "scope"] },
  protected_view: { entityType: "control_room", outcomes: ["allowed", "denied"], metadataKeys: ["scope"] },
  audit_export: { entityType: "audit", outcomes: ["succeeded", "failed"], metadataKeys: ["count", "scope"] },
  operator_invite: { entityType: "operator", outcomes: ["succeeded", "failed"], metadataKeys: ["scope"] },
  operator_role_change: { entityType: "operator", outcomes: ["succeeded", "failed"], metadataKeys: ["scope"] },
  operator_deactivate: { entityType: "operator", outcomes: ["succeeded", "failed"], metadataKeys: ["scope"] },
  settings_policy_change: { entityType: "policy", outcomes: ["succeeded", "failed"], metadataKeys: ["scope"] },
  audit_purge: { entityType: "audit", outcomes: ["succeeded", "failed"], metadataKeys: ["count", "scope"] },
  super_admin_handoff: { entityType: "operator", outcomes: ["succeeded", "failed"], metadataKeys: ["scope"] },
};

const auditColumns = [
  "occurred_at", "effective_role", "action", "entity_type",
  "entity_id", "outcome", "environment", "correlation_id",
] as const;

function boundedText(value: unknown, maximum = 128): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
}

function isAuditScalar(value: unknown): value is AuditScalar {
  return typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length <= 128);
}

export type EncodedAudit = AuditInput & {
  eventId: string;
  occurredAt: string;
  metadataJson: string;
};

/** Encodes the only application-level audit write shape; all values are server supplied. */
export function encodeAudit(input: AuditInput, occurredAt = new Date().toISOString()): EncodedAudit | null {
  if (!actions.has(input.action) || !environments.has(input.environment) || !outcomes.has(input.outcome)) return null;
  const rule = eventRules[input.action];
  if (input.entityType !== rule.entityType || !rule.outcomes.includes(input.outcome)) return null;
  if (!boundedText(input.entityId) || !/^[A-Za-z0-9:_./-]+$/.test(input.entityId) || !boundedText(input.correlationId) || !isIsoTimestamp(occurredAt)) return null;
  if (input.actorId !== undefined && (!Number.isSafeInteger(input.actorId) || input.actorId <= 0)) return null;
  if (input.role !== undefined && !roles.has(input.role)) return null;
  if (input.subjectDigest !== undefined && !/^[a-f0-9]{64}$/.test(input.subjectDigest)) return null;

  const metadata = input.metadata ?? {};
  if (Object.entries(metadata).some(([key, value]) => !rule.metadataKeys.includes(key) || !isAuditScalar(value))) return null;
  return { ...input, eventId: crypto.randomUUID(), occurredAt, metadataJson: JSON.stringify(metadata) };
}

export function auditInsertStatement(db: DB, event: EncodedAudit): D1PreparedStatement {
  return db.prepare("INSERT INTO audit_events (event_id, occurred_at, actor_operator_id, actor_subject_digest, effective_role, action, entity_type, entity_id, outcome, environment, correlation_id, schema_version, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
    .bind(event.eventId, event.occurredAt, event.actorId ?? null, event.subjectDigest ?? null, event.role ?? null, event.action, event.entityType, event.entityId, event.outcome, event.environment, event.correlationId, event.metadataJson);
}

export async function appendAudit(db: DB, input: AuditInput): Promise<boolean> {
  const event = encodeAudit(input);
  if (!event) return false;
  await auditInsertStatement(db, event).run();
  return true;
}

function filtersAreClosed(filters: AuditFilters): boolean {
  return (filters.action === undefined || actions.has(filters.action))
    && (filters.environment === undefined || environments.has(filters.environment))
    && (filters.outcome === undefined || outcomes.has(filters.outcome))
    && (filters.role === undefined || roles.has(filters.role))
    && (filters.before === undefined || isIsoTimestamp(filters.before))
    && (filters.after === undefined || isIsoTimestamp(filters.after))
    && (filters.limit === undefined || (Number.isInteger(filters.limit) && filters.limit >= 1 && filters.limit <= 100));
}

/** Returns null to unauthorized roles, preventing ledger discovery and count inference. */
export async function queryAuditEvents(db: DB, role: unknown, filters: AuditFilters = {}): Promise<AuditEvent[] | null> {
  if (!decide(role, "audit", "read") || !filtersAreClosed(filters)) return null;
  const clauses = ["1 = 1"];
  const values: unknown[] = [];
  if (filters.action) { clauses.push("action = ?"); values.push(filters.action); }
  if (filters.environment) { clauses.push("environment = ?"); values.push(filters.environment); }
  if (filters.outcome) { clauses.push("outcome = ?"); values.push(filters.outcome); }
  if (filters.role) { clauses.push("effective_role = ?"); values.push(filters.role); }
  if (filters.before) { clauses.push("occurred_at < ?"); values.push(filters.before); }
  if (filters.after) { clauses.push("occurred_at >= ?"); values.push(filters.after); }
  values.push(filters.limit ?? 100);
  const result = await db.prepare(`SELECT event_id, occurred_at, actor_operator_id, actor_subject_digest, effective_role, action, entity_type, entity_id, outcome, environment, correlation_id, schema_version, metadata_json, created_at FROM audit_events WHERE ${clauses.join(" AND ")} ORDER BY occurred_at DESC LIMIT ?`).bind(...values).all<AuditEvent>();
  return result.results;
}

/** Removes actor IDs, digests, metadata, and any unapproved schema fields before presentation. */
export function projectAuditLedger(rows: readonly AuditEvent[]): AuditLedgerRecord[] {
  return rows.map((row) => ({
    timestamp: row.occurred_at,
    subject: row.actor_operator_id === null ? row.actor_subject_digest ? "approved pseudonymous subject" : "unknown" : "recorded operator",
    role: row.effective_role ?? "unknown",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    outcome: row.outcome,
    environment: row.environment,
    correlationId: row.correlation_id,
  }));
}

export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const neutralized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return neutralized.replaceAll('"', '""');
}

export function toAuditCsv(rows: readonly Pick<AuditEvent, typeof auditColumns[number]>[]): string {
  return [auditColumns.join(","), ...rows.map((row) => auditColumns.map((column) => `"${csvCell(row[column])}"`).join(","))].join("\n");
}

/** Builds a no-store download and appends an independent audit_export event. */
export async function exportAuditCsv(db: DB, actor: { id: number; role: OperatorRole }, environment: Environment, correlationId: string, filters: AuditFilters = {}): Promise<AuditExport | null> {
  if (!decide(actor.role, "audit", "export") || !boundedText(correlationId)) return null;
  const rows = await queryAuditEvents(db, actor.role, filters);
  if (!rows) return null;
  const appended = await appendAudit(db, {
    action: "audit_export", entityType: "audit", entityId: "ledger", outcome: "succeeded", environment, correlationId,
    actorId: actor.id, role: actor.role, metadata: { count: rows.length, scope: "filtered" },
  });
  if (!appended) return null;
  return {
    filename: "wtfmedia-audit-ledger.csv",
    headers: { "cache-control": "no-store", "content-disposition": "attachment; filename=wtfmedia-audit-ledger.csv", "content-type": "text/csv; charset=utf-8", "x-content-type-options": "nosniff" },
    body: toAuditCsv(rows),
  };
}
