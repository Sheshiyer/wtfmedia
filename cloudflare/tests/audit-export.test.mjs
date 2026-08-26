import assert from "node:assert/strict";
import { test } from "node:test";
import { toAuditCsv } from "../src/audit.ts";

test("formula cells are neutralized in the fixed CSV schema", () => {
  const csv = toAuditCsv([{ occurred_at: "2026-08-26T00:00:00.000Z", effective_role: "admin", action: "protected_view", entity_type: "control_room", entity_id: "=SUM(1)", outcome: "allowed", environment: "local", correlation_id: "corr-12345678" }]);
  assert.match(csv, /^occurred_at,effective_role,action,entity_type,entity_id,outcome,environment,correlation_id/m);
  assert.match(csv, /"'=SUM\(1\)"/);
  assert.doesNotMatch(csv, /actor_subject_digest|metadata_json/);
});
