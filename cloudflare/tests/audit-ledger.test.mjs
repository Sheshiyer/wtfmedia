import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeAudit, exportAuditCsv, queryAuditEvents } from "../src/audit.ts";
import { purgeExpiredAudit, retentionCutoff, retentionDays } from "../src/scheduled.ts";

const input = { action: "auth_denied", entityType: "operator", entityId: "1", outcome: "denied", environment: "local", correlationId: "corr-12345678", metadata: { reason: "inactive" } };

function statement(sql, calls) {
  return {
    bind(...values) { calls.push({ sql, values }); return this; },
    async run() { return {}; },
    async first() { return { total: 2 }; },
    async all() { return { results: [] }; },
  };
}

test("complete allowlisted audit envelope is encoded", () => {
  const event = encodeAudit(input, "2026-08-26T00:00:00.000Z");
  assert.equal(event?.action, "auth_denied");
  assert.equal(event?.metadataJson, '{"reason":"inactive"}');
  assert.equal(event?.occurredAt, "2026-08-26T00:00:00.000Z");
});

test("prohibited metadata and oversized scalars are rejected", () => {
  assert.equal(encodeAudit({ ...input, metadata: { token: "secret" } }), null);
  assert.equal(encodeAudit({ ...input, metadata: { reason: "x".repeat(129) } }), null);
  assert.equal(encodeAudit({ ...input, entityId: "person@example.com" }), null);
});

test("editor and malformed filters cannot infer the ledger", async () => {
  let prepared = false;
  const db = { prepare() { prepared = true; throw new Error("must not query"); } };
  assert.equal(await queryAuditEvents(db, "editor"), null);
  assert.equal(await queryAuditEvents(db, "admin", { limit: 101 }), null);
  assert.equal(prepared, false);
});

test("export is restricted and appends an export receipt", async () => {
  const calls = [];
  const db = { prepare(sql) { return statement(sql, calls); } };
  assert.equal(await exportAuditCsv(db, { id: 3, role: "editor" }, "local", "corr-12345678"), null);
  const exported = await exportAuditCsv(db, { id: 3, role: "admin" }, "local", "corr-12345678");
  assert.equal(exported?.headers["cache-control"], "no-store");
  assert.match(calls.at(-1).sql, /INSERT INTO audit_events/);
  assert.match(calls.at(-1).values.join(" "), /audit_export/);
});

test("purge uses environment-bound UTC cutoffs", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");
  assert.equal(retentionDays("local"), 0);
  assert.equal(retentionDays("staging"), 30);
  assert.equal(retentionDays("production"), 365);
  assert.equal(retentionCutoff("local", now), "2026-08-26T00:00:00.000Z");
  assert.equal(retentionCutoff("staging", now), "2026-07-27T00:00:00.000Z");
  assert.equal(retentionCutoff("production", now), "2025-08-26T00:00:00.000Z");
});

test("purge appends receipt and deletes expired rows in one batch", async () => {
  const calls = [];
  let batch = [];
  const db = { prepare(sql) { return statement(sql, calls); }, async batch(statements) { batch = statements; } };
  assert.equal(await purgeExpiredAudit(db, "production", new Date("2026-08-26T00:00:00.000Z")), true);
  assert.equal(batch.length, 2);
  assert.match(calls.at(-2).sql, /INSERT INTO audit_events/);
  assert.match(calls.at(-1).sql, /DELETE FROM audit_events WHERE created_at < \?/);
});

test("purge rollback failure is reported without a second mutation", async () => {
  const calls = [];
  const db = { prepare(sql) { return statement(sql, calls); }, async batch() { throw new Error("transaction failed"); } };
  assert.equal(await purgeExpiredAudit(db, "staging", new Date("2026-08-26T00:00:00.000Z")), false);
  assert.equal(calls.filter(({ sql }) => /INSERT INTO audit_events|DELETE FROM audit_events/.test(sql)).length, 2);
});
