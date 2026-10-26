import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { handleMemberRequest } from "../src/member-router.ts";
import { policyForPath } from "../src/auth/policy.ts";

function fixture(t, { productionSchema = true } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  const root = new URL("../migrations/", import.meta.url);
  for (const name of JSON.parse(readFileSync(new URL("manifest.json", root))).wrangler_order) {
    if (productionSchema || Number(name.slice(0, 4)) < 25) sqlite.exec(readFileSync(new URL(name, root), "utf8"));
  }
  sqlite.exec("INSERT OR REPLACE INTO member_beta_releases(environment,state,updated_at) VALUES ('staging','stable','2026-10-26')");
  for (const [id, role, active] of [[901, "editor", 1], [902, "admin", 1], [903, "editor", 0]]) {
    sqlite.prepare("INSERT INTO operators(id,email,display_name,role,active) VALUES (?,?,'Test operator',?,?)").run(id, `operator-${id}@example.test`, role, active);
  }
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  const DB = { prepare: wrap, batch: async statements => {
    sqlite.exec("BEGIN");
    try { const rows = []; for (const statement of statements) rows.push(await statement.run()); sqlite.exec("COMMIT"); return rows; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  } };
  const origin = "https://beta.example.test";
  const env = { DB, OPS_HOSTNAME: "beta.example.test", OPS_ENVIRONMENT: "staging", CLERK_ISSUER: "https://clerk.example.test", CLERK_JWKS_URL: "https://clerk.example.test/.well-known/jwks.json", CLERK_AUTHORIZED_PARTIES: origin };
  const call = (identity = 901, { method = "GET", payload, path = "/beta/api/production", requestOrigin = origin } = {}) => handleMemberRequest(new Request(origin + path, {
    method, headers: { origin: requestOrigin, "content-type": "application/json" }, ...(payload ? { body: JSON.stringify(payload) } : {}),
  }), env, { verifyClerk: async () => identity === null ? { ok: false } : { ok: true, email: `operator-${identity}@example.test`, userId: `test-identity-${identity}` } });
  return { sqlite, call };
}

test("Production uses Beta identity, operator lifecycle and capabilities before reading data", async t => {
  const { call } = fixture(t);
  assert.equal((await call(null)).status, 401);
  assert.equal((await call(904)).status, 403); // Authenticated member, without an operator record.
  assert.equal((await call(903)).status, 403); // Inactive operator.
  const editor = await call();
  assert.equal(editor.status, 200);
  assert.match(editor.headers.get("cache-control"), /no-store/);
  const data = await editor.json();
  assert.equal(data.canEdit, true);
  assert.equal(data.canManage, false);
  assert.equal(data.ips.length, 9);
  const path = "/beta/api/production?sourceSheet=Calendar";
  assert.equal((await call(901, { path })).status, 403);
  assert.equal((await call(902, { path })).status, 200);
});

test("Beta Production writes use the verified actor and reject cross-origin or unsupported routes", async t => {
  const { call, sqlite } = fixture(t);
  const payload = { action: "create_item", data: { ipId: "wtf-is", title: "Test episode", format: "panel", stage: "planned", owner: "", notes: "", shootLocation: "" } };
  assert.equal((await call(901, { method: "POST", payload, requestOrigin: "https://other.test" })).status, 404);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM production_items").get().n, 0);
  assert.equal((await call(901, { method: "POST", payload })).status, 201);
  assert.equal(sqlite.prepare("SELECT actor_operator_id FROM production_change_log").get().actor_operator_id, 901);
  for (const path of ["/ops/api/production", "/api/ops/production", "/beta/api/production/unknown"]) {
    assert.equal(policyForPath(path, "GET"), null);
    assert.equal((await call(901, { path })).status, 404);
  }
  assert.equal((await call(901, { method: "DELETE" })).status, 404);
});

test("Beta Production reports unavailable when its migrations are absent", async t => {
  const { call } = fixture(t, { productionSchema: false });
  const response = await call();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "production_unavailable" });
});
