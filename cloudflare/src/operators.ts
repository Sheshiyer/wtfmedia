import type { DB, OperatorRole } from "./db.ts";
import { decide } from "./auth/policy.ts";

type Actor = { id: number; role: OperatorRole; active: boolean };
type Environment = "local" | "staging" | "production";

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
    const eventId = crypto.randomUUID();
    await db.batch([
      db.prepare("INSERT INTO super_admin_transfer_guard (id, from_operator_id, to_operator_id) VALUES (1, ?, ?)").bind(actor.id, targetOperatorId),
      db.prepare("UPDATE operators SET role = 'admin', updated_at = ? WHERE id = ? AND role = 'super_admin' AND active = 1").bind(new Date().toISOString(), actor.id),
      db.prepare("UPDATE operators SET role = 'super_admin', updated_at = ? WHERE id = ? AND active = 1").bind(new Date().toISOString(), targetOperatorId),
      db.prepare("INSERT INTO audit_events (event_id, occurred_at, actor_operator_id, effective_role, action, entity_type, entity_id, outcome, environment, correlation_id, schema_version, metadata_json) VALUES (?, ?, ?, 'super_admin', 'super_admin_handoff', 'operator', ?, 'succeeded', ?, ?, 1, '{}')").bind(eventId, new Date().toISOString(), actor.id, String(targetOperatorId), environment, correlationId),
      db.prepare("DELETE FROM super_admin_transfer_guard WHERE id = 1"),
    ]);
    const result = await db.prepare("SELECT COUNT(*) AS total FROM operators WHERE role = 'super_admin' AND active = 1").first<{ total: number }>();
    return result?.total === 1;
  } catch {
    return false;
  }
}
