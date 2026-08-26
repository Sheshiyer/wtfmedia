import type { DB } from "./db.ts";
import { auditInsertStatement, encodeAudit, type Environment } from "./audit.ts";

const dayMilliseconds = 86_400_000;

export function retentionDays(environment: Environment): 0 | 30 | 365 {
  if (environment === "production") return 365;
  if (environment === "staging") return 30;
  return 0;
}

export function retentionCutoff(environment: Environment, scheduledAt: Date): string {
  return new Date(scheduledAt.getTime() - retentionDays(environment) * dayMilliseconds).toISOString();
}

/**
 * Server-only scheduled work: the caller can supply a test clock, but never a
 * client cutoff. D1 batch is transactional: a failed delete also rolls back
 * the purge receipt.
 */
export async function purgeExpiredAudit(db: DB, environment: Environment, scheduledAt = new Date()): Promise<boolean> {
  const cutoff = retentionCutoff(environment, scheduledAt);
  const count = await db.prepare("SELECT COUNT(*) AS total FROM audit_events WHERE created_at < ?").bind(cutoff).first<{ total: number }>();
  const event = encodeAudit({
    action: "audit_purge", entityType: "audit", entityId: "retention", outcome: "succeeded", environment,
    correlationId: `audit-purge:${scheduledAt.toISOString()}`, metadata: { count: count?.total ?? 0, scope: "expired" },
  }, scheduledAt.toISOString());
  if (!event) return false;
  try {
    await db.batch([
      auditInsertStatement(db, event),
      db.prepare("DELETE FROM audit_events WHERE created_at < ?").bind(cutoff),
    ]);
    return true;
  } catch {
    return false;
  }
}
