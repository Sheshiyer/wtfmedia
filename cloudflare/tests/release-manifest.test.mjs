import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import { handleOpsRequest } from "../src/ops-router.ts";
import {
  isAuthenticatedChatEnabled,
  resolveAuthenticatedChatRelease,
  RELEASE_STATES,
} from "../src/release-manifest.ts";
import { policyForPath } from "../src/auth/policy.ts";

const root = new URL("..", import.meta.url).pathname;
const baseEnv = {
  OPS_HOSTNAME: "ops.local.test",
  OPS_ORIGIN: "https://origin.local.test",
  OPS_ORIGIN_PROOF: "test-proof",
  OPS_ENVIRONMENT: "staging",
  ACCESS_ISSUER: "https://issuer.test",
  ACCESS_AUDIENCE: "audience",
  ACCESS_JWKS_URL: "https://issuer.test/certs",
  CHAT_HISTORY_ENABLED: "stable",
};

function releaseDb({ row = null, role = "super_admin" } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        bind(...args) {
          calls.push({ sql, args });
          return this;
        },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("release_manifests")) return row;
          if (sql.includes("SELECT id, email")) return { id: 7, email: "operator@example.test", role, active: 1 };
          return null;
        },
        async run() {
          calls.push({ sql, run: true });
          return {};
        },
        async all() { return { results: [] }; },
      };
      return statement;
    },
    async batch(items) {
      calls.push({ batch: items.length });
      return items.map(() => ({}));
    },
  };
}

function authDependencies() {
  return { verifyAccess: async () => ({ ok: true, email: "operator@example.test" }) };
}

test("release migration is environment-scoped, paused by default, and excludes payload fields", () => {
  const sql = readFileSync(join(root, "migrations", "0007_release_manifest.sql"), "utf8");
  assert.match(sql, /CREATE TABLE release_manifests/);
  assert.match(sql, /environment TEXT PRIMARY KEY/);
  assert.match(sql, /state TEXT NOT NULL DEFAULT 'paused'/);
  assert.match(sql, /CHECK \(state IN \('paused', 'preview', 'stable', 'rolled_back'\)\)/);
  assert.match(sql, /CHECK \(environment IN \('local', 'staging'\)\)/);
  assert.doesNotMatch(sql, /content|token|prompt|answer/i);
  assert.deepEqual(RELEASE_STATES, ["paused", "preview", "stable", "rolled_back"]);
});

test("staging defaults paused and ignores the local environment seam", async () => {
  const db = releaseDb();
  const staging = await resolveAuthenticatedChatRelease(db, "staging", "stable");
  assert.equal(staging.state, "paused");
  assert.equal(staging.source, "default");
  assert.equal(isAuthenticatedChatEnabled(staging), false);
});

test("local uses the environment seam only when no manifest row exists", async () => {
  const db = releaseDb();
  const local = await resolveAuthenticatedChatRelease(db, "local", "stable");
  assert.equal(local.state, "stable");
  assert.equal(local.source, "env_fallback");
  assert.equal(isAuthenticatedChatEnabled(local), true);

  const authoritative = await resolveAuthenticatedChatRelease(db, "local", "paused");
  assert.equal(authoritative.source, "default");
  assert.equal(authoritative.state, "paused");
});

test("a manifest row overrides the local seam and enables preview/stable only", async () => {
  const db = releaseDb({ row: { environment: "staging", state: "preview", updated_at: "2026-09-02T00:00:00.000Z", updated_by_operator_id: 7 } });
  const release = await resolveAuthenticatedChatRelease(db, "staging", "paused");
  assert.equal(release.state, "preview");
  assert.equal(release.source, "manifest");
  assert.equal(isAuthenticatedChatEnabled(release), true);

  for (const state of ["paused", "rolled_back"]) {
    const disabled = await resolveAuthenticatedChatRelease(db, "staging", state);
    assert.equal(isAuthenticatedChatEnabled({ ...disabled, state }), false);
  }
});

test("release endpoint is protected and GET returns the server readback", async () => {
  assert.deepEqual(policyForPath("/ops/api/release/authenticated-chat"), ["control_room", "read"]);
  const db = releaseDb({ row: { environment: "staging", state: "stable", updated_at: "2026-09-02T00:00:00.000Z", updated_by_operator_id: 7 } });
  const response = await handleOpsRequest(new Request("https://ops.local.test/ops/api/release/authenticated-chat", {
    headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-release-1" },
  }), { ...baseEnv, DB: db }, authDependencies());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    feature: "authenticated_chat",
    environment: "staging",
    state: "stable",
    source: "manifest",
    updatedAt: "2026-09-02T00:00:00.000Z",
    updatedByOperatorId: 7,
  });
});

test("only super_admin can mutate local/staging release state and every success is audited", async () => {
  for (const state of RELEASE_STATES) {
    const db = releaseDb();
    const response = await handleOpsRequest(new Request("https://ops.local.test/ops/api/release/authenticated-chat", {
      method: "POST",
      headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-release-1", "content-type": "application/json" },
      body: JSON.stringify({ state }),
    }), { ...baseEnv, DB: db }, authDependencies());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).state, state);
    assert.ok(db.calls.some(({ sql, args }) => typeof sql === "string" && sql.includes("audit_events") && args?.includes("authenticated_chat_release")));
  }

  const adminDb = releaseDb({ role: "admin" });
  const adminResponse = await handleOpsRequest(new Request("https://ops.local.test/ops/api/release/authenticated-chat", {
    method: "POST",
    headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-release-2", "content-type": "application/json" },
    body: JSON.stringify({ state: "stable" }),
  }), { ...baseEnv, DB: adminDb }, authDependencies());
  assert.equal(adminResponse.status, 404);
  assert.equal(adminDb.calls.some(({ sql }) => sql.includes("INSERT INTO release_manifests")), false);
});

test("production release mutations fail closed and staging chat consults server state", async () => {
  const productionDb = releaseDb();
  const productionResponse = await handleOpsRequest(new Request("https://ops.local.test/ops/api/release/authenticated-chat", {
    method: "POST",
    headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-release-3", "content-type": "application/json" },
    body: JSON.stringify({ state: "stable" }),
  }), { ...baseEnv, OPS_ENVIRONMENT: "production", DB: productionDb }, authDependencies());
  assert.equal(productionResponse.status, 404);
  assert.equal(productionDb.calls.some(({ sql }) => sql.includes("INSERT INTO release_manifests")), false);

  const pausedDb = releaseDb({ row: { environment: "staging", state: "paused", updated_at: "2026-09-02T00:00:00.000Z", updated_by_operator_id: 7 } });
  let verified = false;
  const chatResponse = await handleOpsRequest(new Request("https://ops.local.test/ops/api/chat", {
    method: "POST",
    headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-chat-1", "content-type": "application/json" },
    body: JSON.stringify({ question: "hello" }),
  }), { ...baseEnv, DB: pausedDb }, { verifyAccess: async () => { verified = true; return { ok: true, email: "operator@example.test" }; } });
  assert.equal(chatResponse.status, 404);
  assert.equal(verified, false);
});
