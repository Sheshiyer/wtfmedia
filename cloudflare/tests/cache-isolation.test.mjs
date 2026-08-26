import assert from "node:assert/strict";
import { test } from "node:test";
import { auditRowDto, isProtectedResponse, operatorContextDto, protectedResponseHeaders, safeOpsError } from "../src/dto.ts";

test("dto projection omits protected source fields and errors stay uniform", () => {
  const row = auditRowDto({ occurred_at: "2026-08-26T00:00:00.000Z", actor_subject_digest: null, effective_role: "admin", action: "protected_view", entity_type: "audit", entity_id: "ledger", outcome: "allowed", environment: "local", correlation_id: "corr-12345678", event_id: "event-12345678", actor_operator_id: 1, schema_version: 1, metadata_json: '{"token":"private"}', created_at: "2026-08-26T00:00:00.000Z" });
  assert.deepEqual(Object.keys(row).sort(), ["action", "actor_subject_digest", "correlation_id", "effective_role", "entity_id", "entity_type", "environment", "occurred_at", "outcome"]);
  assert.deepEqual(safeOpsError(), { error: "operator_unavailable" });
});

test("concurrent role and environment contexts have independent DTOs and cache bypass", async () => {
  const contexts = await Promise.all([
    Promise.resolve(operatorContextDto({ operatorId: 1, email: "one@example.test", role: "editor", environment: "local", correlationId: "corr-one" })),
    Promise.resolve(operatorContextDto({ operatorId: 2, email: "two@example.test", role: "admin", environment: "staging", correlationId: "corr-two" })),
  ]);
  assert.notDeepEqual(contexts[0], contexts[1]);
  assert.equal("email" in contexts[0], false);
  const headers = new Headers(protectedResponseHeaders);
  assert.equal(isProtectedResponse(headers), true);
});
