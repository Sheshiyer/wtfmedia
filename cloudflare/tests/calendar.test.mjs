import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";
import { allowCalendarRequest, handleCalendarRequest } from "../src/calendar.ts";

const root = new URL("..", import.meta.url).pathname;
const database = new DatabaseSync(":memory:");

class Statement {
  constructor(sql, values = []) {
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new Statement(this.sql, values);
  }

  async first() {
    return database.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return { results: database.prepare(this.sql).all(...this.values), success: true };
  }

  async run() {
    const result = database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

const db = { prepare: (sql) => new Statement(sql) };

function makeKv() {
  const values = new Map();
  return {
    values,
    async get(key) { return values.get(key) ?? null; },
    async put(key, value) { values.set(key, value); },
  };
}

const kv = makeKv();
const env = { DB: db, WTFMEDIA_STATE: kv };

const validEvent = {
  title: "source receipt check",
  startsAt: "2026-08-29T18:30:00.000Z",
  timezone: "Asia/Kolkata",
  eventType: "review",
  ipLabel: "WTF",
  showLabel: "Main feed",
  owner: null,
  column: "on-calendar",
  tone: "knowledge",
  conflictState: "clear",
  notes: "Verify target receipts without storing secrets.",
};

function calendarRequest(path, init = {}) {
  return new Request(`https://wtfmedia-edge.internal${path}`, init);
}

function createRequest(key = "calendar-test-key-0001", payload = validEvent) {
  return calendarRequest("/v1/calendar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      "X-Request-ID": "calendar-test-correlation",
    },
    body: JSON.stringify(payload),
  });
}

before(() => {
  for (const migration of [
    "0001_ops_foundation.sql",
    "0002_bootstrap_roster.sql",
    "0003_super_admin_transfer_guard.sql",
    "0004_operator_invitation_approvals.sql",
    "0005_provenance_spine.sql",
    "0006_public_calendar.sql",
  ]) {
    database.exec(readFileSync(`${root}/migrations/${migration}`, "utf8"));
  }
});

after(() => database.close());

test("calendar create is idempotent and stores an audit-safe receipt", async () => {
  const created = await handleCalendarRequest(createRequest(), env);
  assert.equal(created.status, 201);
  const first = await created.json();
  assert.equal(first.event.title, validEvent.title);
  assert.equal(first.event.revision, 1);
  assert.equal(first.idempotent, false);

  const retried = await handleCalendarRequest(createRequest(), env);
  assert.equal(retried.status, 200);
  const second = await retried.json();
  assert.equal(second.event.id, first.event.id);
  assert.equal(second.idempotent, true);

  assert.equal(database.prepare("SELECT COUNT(*) AS total FROM calendar_events").get().total, 1);
  const mutation = database.prepare("SELECT operation, revision, correlation_id FROM calendar_mutations").get();
  assert.equal(mutation.operation, "create");
  assert.equal(mutation.revision, 1);
  assert.equal(mutation.correlation_id, "calendar-test-correlation");
  const auditSchema = database.prepare("PRAGMA table_info(calendar_mutations)").all().map((column) => column.name);
  assert.equal(auditSchema.includes("title"), false);
  assert.equal(auditSchema.includes("notes"), false);
});

test("calendar update requires the expected revision and records the mutation", async () => {
  const current = database.prepare("SELECT event_id FROM calendar_events LIMIT 1").get();
  const updated = await handleCalendarRequest(calendarRequest(`/v1/calendar/${current.event_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Request-ID": "calendar-update-correlation" },
    body: JSON.stringify({ revision: 1, column: "blocked", conflictState: "potential" }),
  }), env);
  assert.equal(updated.status, 200);
  const result = await updated.json();
  assert.equal(result.event.revision, 2);
  assert.equal(result.event.column, "blocked");
  assert.equal(result.event.conflictState, "potential");

  const stale = await handleCalendarRequest(calendarRequest(`/v1/calendar/${current.event_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 1, column: "on-calendar" }),
  }), env);
  assert.equal(stale.status, 409);
  assert.deepEqual(await stale.json(), { error: "revision_conflict", currentRevision: 2 });
  assert.equal(database.prepare("SELECT COUNT(*) AS total FROM calendar_mutations").get().total, 2);
});

test("calendar list is bounded and delete remains unavailable", async () => {
  const listed = await handleCalendarRequest(calendarRequest(
    "/v1/calendar?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-30T00%3A00%3A00.000Z",
  ), env);
  assert.equal(listed.status, 200);
  assert.equal((await listed.json()).events.length, 1);

  const unbounded = await handleCalendarRequest(calendarRequest("/v1/calendar"), env);
  assert.equal(unbounded.status, 400);

  const current = database.prepare("SELECT event_id FROM calendar_events LIMIT 1").get();
  const deleted = await handleCalendarRequest(calendarRequest(`/v1/calendar/${current.event_id}`, { method: "DELETE" }), env);
  assert.equal(deleted.status, 405);
  assert.throws(() => database.prepare("DELETE FROM calendar_events WHERE event_id = ?").run(current.event_id), /unavailable/);
});

test("calendar rejects unknown fields, non-canonical instants, and missing idempotency", async () => {
  const unknown = await handleCalendarRequest(createRequest("calendar-test-key-0002", { ...validEvent, secret: "no" }), env);
  assert.equal(unknown.status, 400);
  const instant = await handleCalendarRequest(createRequest("calendar-test-key-0003", { ...validEvent, startsAt: "2026-08-30" }), env);
  assert.equal(instant.status, 400);
  const missingKey = await handleCalendarRequest(calendarRequest("/v1/calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validEvent),
  }), env);
  assert.equal(missingKey.status, 400);
  const current = database.prepare("SELECT event_id, revision FROM calendar_events LIMIT 1").get();
  const noOp = await handleCalendarRequest(calendarRequest(`/v1/calendar/${current.event_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: current.revision }),
  }), env);
  assert.equal(noOp.status, 400);
});

test("calendar KV rate limiting uses digested source keys", async () => {
  const rateKv = makeKv();
  const limitedEnv = { DB: db, WTFMEDIA_STATE: rateKv, CALENDAR_WRITE_RATE_LIMIT_PER_MINUTE: "1" };
  const request = calendarRequest("/v1/calendar", { method: "POST", headers: { "X-Client-IP": "198.51.100.8" } });
  assert.equal(await allowCalendarRequest(request, limitedEnv), true);
  assert.equal(await allowCalendarRequest(request, limitedEnv), false);
  assert.equal([...rateKv.values.keys()].some((key) => key.includes("198.51.100.8")), false);
});

test("calendar trigger guard avoids the D1 remote parser's unparenthesized CASE form", () => {
  const migration = readFileSync(`${root}/migrations/0006_public_calendar.sql`, "utf8");
  assert.doesNotMatch(migration, /\bSELECT\s+CASE\b/i);
  assert.match(migration, /\bSELECT\s+\(CASE\b/i);
});
