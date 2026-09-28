import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decryptAnalyticsCredentials,
  encryptAnalyticsCredentials,
  handleAnalyticsRequest,
} from "../src/analytics.ts";
import { capabilitiesForRole, policyForPath } from "../src/auth/policy.ts";
import { handleMemberRequest } from "../src/member-router.ts";
import { syncAnalyticsConnection, syncConfiguredAnalytics } from "../src/analytics-sync.ts";

const operator = {
  kind: "operator",
  operatorId: 7,
  role: "admin",
  email: "admin@example.test",
  displayName: "Admin",
  environment: "staging",
  correlationId: "analytics-test-correlation",
};

function statement(overrides = {}) {
  return {
    values: [],
    bind(...values) { this.values = values; return this; },
    async first() { return null; },
    async all() { return { results: [] }; },
    async run() { return { success: true }; },
    ...overrides,
  };
}

test("analytics credentials use an authenticated encrypted envelope", async () => {
  const secret = "test-only-encryption-key-with-sufficient-entropy";
  const credentials = { accessToken: "access-test", refreshToken: "refresh-test", expiresAt: "2026-09-29T00:00:00.000Z" };
  const envelope = await encryptAnalyticsCredentials(credentials, secret);
  assert.match(envelope, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
  assert.doesNotMatch(envelope, /access-test|refresh-test/u);
  assert.deepEqual(await decryptAnalyticsCredentials(envelope, secret), credentials);
  await assert.rejects(() => decryptAnalyticsCredentials(envelope, `${secret}-wrong`));
});

test("edge policy separates analytics read and management", () => {
  assert.deepEqual(policyForPath("/beta/settings/workspace/analytics"), ["analytics", "read"]);
  assert.deepEqual(policyForPath("/beta/api/analytics/status", "GET"), ["analytics", "read"]);
  assert.deepEqual(policyForPath("/beta/api/analytics/oauth/start", "POST"), ["analytics", "manage"]);
  assert.equal(policyForPath("/beta/api/analytics/oauth/start", "GET"), null);
  assert.ok(capabilitiesForRole("editor").includes("analytics:read"));
  assert.ok(!capabilitiesForRole("editor").includes("analytics:manage"));
  assert.ok(capabilitiesForRole("admin").includes("analytics:manage"));
});

test("OAuth start persists only hashed state and returns a read-only Google consent URL", async () => {
  const inserted = [];
  const db = {
    prepare(sql) {
      return statement({
        bind(...values) { inserted.push({ sql, values }); return this; },
      });
    },
  };
  const response = await handleAnalyticsRequest(new Request("https://ops.staging.test/beta/api/analytics/oauth/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "youtube" }),
  }), {
    DB: db,
    OPS_ENVIRONMENT: "staging",
    GOOGLE_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.test",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://ops.staging.test/beta/api/analytics/oauth/callback",
    ANALYTICS_TOKEN_ENCRYPTION_KEY: "test-encryption-secret",
  }, operator, {
    now: () => new Date("2026-09-28T00:00:00.000Z"),
    randomUUID: () => "11111111-2222-4333-8444-555555555555",
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  const authorization = new URL(payload.authorizationUrl);
  assert.equal(authorization.origin, "https://accounts.google.com");
  assert.equal(authorization.searchParams.get("access_type"), "offline");
  assert.equal(authorization.searchParams.get("response_type"), "code");
  assert.match(authorization.searchParams.get("scope"), /youtube\.readonly/u);
  assert.match(authorization.searchParams.get("scope"), /yt-analytics\.readonly/u);
  assert.ok(authorization.searchParams.get("state"));
  assert.equal(inserted.length, 1);
  const persisted = inserted[0].values.join(" ");
  assert.doesNotMatch(persisted, new RegExp(authorization.searchParams.get("state"), "u"));
  assert.doesNotMatch(JSON.stringify(payload), /test-secret|test-encryption-secret/u);
});

test("status remains truthful before the analytics migration and never invents a connection", async () => {
  const db = { prepare() { return statement({ async all() { throw new Error("no such table"); } }); } };
  const response = await handleAnalyticsRequest(new Request("https://ops.staging.test/beta/api/analytics/status"), { DB: db, OPS_ENVIRONMENT: "staging" }, operator);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: false, connections: [], migrationRequired: true });
});

test("operator analytics API is readable by editors but management remains denied", async () => {
  const db = {
    prepare(sql) {
      if (sql.includes("member_beta_releases")) return statement({ async first() { return { state: "stable" }; } });
      if (sql.includes("FROM operators")) return statement({ async first() { return { id: 7, email: "editor@example.test", display_name: "Editor", role: "editor", active: 1 }; } });
      if (sql.includes("analytics_provider_connections")) return statement();
      return statement();
    },
  };
  const env = {
    DB: db,
    OPS_HOSTNAME: "ops.staging.test",
    OPS_ORIGIN: "https://ops.staging.test",
    OPS_ENVIRONMENT: "staging",
    CLERK_ISSUER: "https://clerk.example.test",
    CLERK_JWKS_URL: "https://clerk.example.test/.well-known/jwks.json",
    CLERK_AUTHORIZED_PARTIES: "https://ops.staging.test",
  };
  const dependencies = { verifyClerk: async () => ({ ok: true, email: "editor@example.test", userId: "user_editor" }) };
  const read = await handleMemberRequest(new Request("https://ops.staging.test/beta/api/analytics/status"), env, dependencies);
  assert.equal(read.status, 200);
  const manage = await handleMemberRequest(new Request("https://ops.staging.test/beta/api/analytics/oauth/start", { method: "POST", headers: { origin: "https://ops.staging.test" } }), env, dependencies);
  assert.equal(manage.status, 403);
});

test("scheduled analytics remains held in production and skips provider access", async () => {
  let prepared = false;
  const summaries = await syncConfiguredAnalytics({
    DB: { prepare() { prepared = true; return statement(); } },
    OPS_ENVIRONMENT: "production",
  }, new Date("2026-09-28T00:00:00.000Z"), {
    fetchGoogle: async () => { throw new Error("provider_must_not_be_called"); },
  });
  assert.deepEqual(summaries, []);
  assert.equal(prepared, false);
});

test("a sync without an approved resource fails before token or provider access", async () => {
  const operations = [];
  const db = {
    prepare(sql) {
      return statement({
        bind(...values) { operations.push({ sql, values }); this.values = values; return this; },
        async first() { return sql.includes("attempt_count") ? { attempt_count: 1 } : null; },
      });
    },
    async batch(statements) { for (const item of statements) await item.run(); },
  };
  const result = await syncAnalyticsConnection({ DB: db, OPS_ENVIRONMENT: "staging" }, {
    id: "acon_test",
    environment: "staging",
    provider: "youtube",
    status: "connected",
    encrypted_credentials: "not-read",
    granted_scopes_json: "[]",
    token_expires_at: null,
    selected_resource_id: null,
    selected_resource_name: null,
    reporting_timezone: null,
    last_attempted_refresh_at: null,
    last_successful_refresh_at: null,
    last_error_code: null,
  }, "2026-09-20", "2026-09-27", {
    now: () => new Date("2026-09-28T00:00:00.000Z"),
    fetchGoogle: async () => { throw new Error("provider_must_not_be_called"); },
  });
  assert.deepEqual(result, { connectionId: "acon_test", provider: "youtube", status: "failed", rows: 0, errorCode: "resource_not_selected" });
  assert.ok(operations.some(({ sql }) => sql.includes("analytics_sync_runs")));
});


test("OAuth callback returns to the configured frontend through a local edge proxy", async () => {
  const response = await handleAnalyticsRequest(new Request("http://localhost:8787/beta/api/analytics/oauth/callback?error=access_denied&returnTo=https://untrusted.test"), {
    DB: { prepare() { throw new Error("no database access expected"); } },
    GOOGLE_OAUTH_CLIENT_ID: "test-client",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/beta/api/analytics/oauth/callback",
    ANALYTICS_TOKEN_ENCRYPTION_KEY: "test-encryption-secret",
  }, operator);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost:3000/beta/settings/workspace/analytics?oauth=denied");
});
