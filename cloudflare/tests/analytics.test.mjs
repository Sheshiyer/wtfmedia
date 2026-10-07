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
import { aggregateYouTubePeriod, impressionTier, performanceGroup, writtenInsights, YOUTUBE_FORMULA_VERSION } from "../src/analytics-derivations.ts";

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
  assert.deepEqual(policyForPath("/beta/api/analytics/youtube/retention", "GET"), ["analytics", "read"]);
  assert.deepEqual(policyForPath("/beta/api/analytics/youtube/episodes/compare", "GET"), ["analytics", "read"]);
  assert.deepEqual(policyForPath("/beta/api/analytics/youtube/retention", "POST"), ["analytics", "manage"]);
  assert.deepEqual(policyForPath("/beta/api/analytics/sync", "POST"), ["analytics", "manage"]);
  assert.deepEqual(policyForPath("/beta/api/analytics/oauth/start", "POST"), ["analytics", "manage"]);
  assert.equal(policyForPath("/beta/api/analytics/oauth/start", "GET"), null);
  assert.ok(capabilitiesForRole("editor").includes("analytics:read"));
  assert.ok(!capabilitiesForRole("editor").includes("analytics:manage"));
  assert.ok(capabilitiesForRole("admin").includes("analytics:manage"));
});

test("YouTube decision formulas preserve provider absence and use weighted observations", () => {
  const period = aggregateYouTubePeriod([
    { date: "2026-09-01", views: 100, watchMinutes: 50, averageViewDurationSeconds: 30, averageViewPercentage: 25, impressions: 1_000, impressionsCtr: 0.04, subscribersGained: 2, subscribersLost: 1, subscribedViews: 40, unsubscribedViews: 60 },
    { date: "2026-09-02", views: 300, watchMinutes: 200, averageViewDurationSeconds: 40, averageViewPercentage: 35, impressions: 3_000, impressionsCtr: 0.06, subscribersGained: 6, subscribersLost: 2, subscribedViews: 120, unsubscribedViews: 180 },
  ]);
  assert.equal(YOUTUBE_FORMULA_VERSION, "wtfos-youtube-v1");
  assert.equal(period.views, 400);
  assert.equal(period.impressions, 4_000);
  assert.equal(period.impressionsCtr, 0.055);
  assert.equal(period.estimatedImpressionClicks, 220);
  assert.equal(period.averageViewPercentage, 32.5);
  assert.equal(period.stvRate, 0.02);
  assert.equal(period.conversionRate, 8 / 240);
  assert.equal(period.subscribersPerMillionImpressions, 2_000);
  assert.equal(impressionTier(9_000_000)?.id, "tier_4");
  assert.equal(performanceGroup(0.06, 0.05, 32, 30), "reach_and_attention_leader");
  assert.ok(writtenInsights(period, { ...period, impressions: 5_000 }, { ...period, impressionsCtr: 0.06 }).some((item) => item.kind === "test"));

  const absent = aggregateYouTubePeriod([{ date: "2026-09-03", views: null, watchMinutes: null, averageViewDurationSeconds: null, averageViewPercentage: null, impressions: null, impressionsCtr: null, subscribersGained: null, subscribersLost: null, subscribedViews: null, unsubscribedViews: null }]);
  assert.equal(absent.views, null);
  assert.equal(absent.stvRate, null);
  assert.equal(absent.estimatedImpressionClicks, null);
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
    body: JSON.stringify({ provider: "youtube", returnPath: "/ops/settings/analytics" }),
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
  assert.equal(inserted[0].values[4], "/beta/settings/workspace/analytics", "must satisfy migration 0018 return_path constraint");
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

test("YouTube sync filters day-by-video reports to the owned catalogue and keeps optional reach non-blocking", async () => {
  const secret = "test-filtered-video-sync-key";
  const encrypted = await encryptAnalyticsCredentials({ accessToken: "test-access", refreshToken: "test-refresh", expiresAt: "2026-10-08T00:00:00Z" }, secret);
  const videoIds = ["video-id-01", "video-id-02"];
  const analyticsRequests = [];
  const db = {
    prepare(sql) {
      return statement({
        async first() {
          if (sql.includes("SELECT id FROM youtube_analytics_channels")) return { id: "ytch_test" };
          if (sql.includes("SELECT attempt_count")) return { attempt_count: 1 };
          return null;
        },
      });
    },
    async batch(statements) { for (const item of statements) await item.run(); },
  };
  const result = await syncAnalyticsConnection({
    DB: db,
    OPS_ENVIRONMENT: "staging",
    ANALYTICS_TOKEN_ENCRYPTION_KEY: secret,
    GOOGLE_OAUTH_CLIENT_ID: "test-client",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
  }, {
    id: "acon_test",
    environment: "staging",
    provider: "youtube",
    status: "connected",
    encrypted_credentials: encrypted,
    granted_scopes_json: "[]",
    token_expires_at: "2026-10-08T00:00:00Z",
    selected_resource_id: `UC${"a".repeat(22)}`,
    selected_resource_name: "Test channel",
    reporting_timezone: "UTC",
    last_attempted_refresh_at: null,
    last_successful_refresh_at: null,
    last_error_code: null,
  }, "2026-09-10", "2026-10-07", {
    now: () => new Date("2026-10-07T00:00:00Z"),
    fetchGoogle: async (input, init) => {
      const url = new URL(input);
      if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/channels")) return Response.json({ items: [{ contentDetails: { relatedPlaylists: { uploads: "UU-test" } } }] });
      if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/playlistItems")) return Response.json({ items: videoIds.map(videoId => ({ contentDetails: { videoId } })) });
      if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/videos")) return Response.json({ items: videoIds.map(videoId => ({ id: videoId, snippet: { title: videoId, publishedAt: "2026-09-01T00:00:00Z" } })) });
      if (url.hostname === "youtubeanalytics.googleapis.com") {
        analyticsRequests.push(url);
        const dimensions = url.searchParams.get("dimensions");
        if (dimensions === "day,video") return Response.json({ columnHeaders: [{ name: "day" }, { name: "video" }, { name: "views" }], rows: [["2026-10-01", videoIds[0], 10]] });
        if (dimensions === "day,subscribedStatus") return Response.json({ columnHeaders: [{ name: "day" }, { name: "subscribedStatus" }, { name: "views" }], rows: [["2026-10-01", "SUBSCRIBED", 4]] });
        return Response.json({ columnHeaders: [{ name: "day" }, { name: "views" }], rows: [["2026-10-01", 10]] });
      }
      if (url.hostname === "youtubereporting.googleapis.com" && init?.method === "POST") return Response.json({ error: { status: "SERVICE_DISABLED" } }, { status: 403 });
      throw new Error(`unexpected_provider_request:${url.hostname}${url.pathname}`);
    },
  });
  assert.equal(result.status, "completed");
  const videoRequest = analyticsRequests.find(url => url.searchParams.get("dimensions") === "day,video");
  assert.equal(videoRequest?.searchParams.get("filters"), `video==${videoIds.join(",")}`);
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
  assert.equal(response.headers.get("location"), "http://localhost:3000/beta/analytics?oauth=denied");
});

test("OAuth denial returns to the allowlisted primary operator analytics page", async () => {
  const db = {
    prepare(sql) {
      if (sql.startsWith("SELECT id, provider, return_path")) return statement({
        async first() { return { id: "aotx_test", provider: "youtube", return_path: "/ops/settings/analytics" }; },
      });
      if (sql.startsWith("UPDATE analytics_oauth_transactions")) return statement({
        async run() { return { success: true, meta: { changes: 1 } }; },
      });
      return statement();
    },
  };
  const response = await handleAnalyticsRequest(new Request("http://localhost:8787/beta/api/analytics/oauth/callback?error=access_denied&state=test-state"), {
    DB: db,
    GOOGLE_OAUTH_CLIENT_ID: "test-client",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/beta/api/analytics/oauth/callback",
    ANALYTICS_TOKEN_ENCRYPTION_KEY: "test-encryption-secret",
  }, operator, { now: () => new Date("2026-09-29T00:00:00.000Z") });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "http://localhost:3000/beta/analytics?oauth=denied&provider=youtube");
});

test("YouTube connection discovers owned channels without manual IDs and never guesses between channels", async () => {
  const secret = "test-channel-discovery-key";
  const encrypted = await encryptAnalyticsCredentials({ accessToken: "test-access", refreshToken: "test-refresh", expiresAt: "2026-10-05T00:00:00Z" }, secret);
  const first = { id: `UC${"a".repeat(22)}`, snippet: { title: "First channel" } };
  const second = { id: `UC${"b".repeat(22)}`, snippet: { title: "Second channel" } };
  for (const items of [[first], [first, second], []]) {
    const writes = [];
    const db = {
      prepare() { return statement({ async first() { return { id: "connection-test", provider: "youtube", status: "connected", encrypted_credentials: encrypted }; } }); },
      async batch(statements) { writes.push(...statements); return []; },
    };
    const response = await handleAnalyticsRequest(new Request("https://app.test/beta/api/analytics/selection", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "youtube" }),
    }), { DB: db, OPS_ENVIRONMENT: "staging", ANALYTICS_TOKEN_ENCRYPTION_KEY: secret, GOOGLE_OAUTH_CLIENT_ID: "test-client", GOOGLE_OAUTH_CLIENT_SECRET: "test-secret" }, operator, {
      now: () => new Date("2026-10-04T00:00:00Z"),
      fetchGoogle: async (url) => {
        assert.equal(new URL(url).searchParams.get("mine"), "true");
        return Response.json({ items });
      },
    });
    const result = await response.json();
    if (items.length === 1) {
      assert.equal(response.status, 200);
      assert.equal(result.connection.resource.id, first.id);
      assert.equal(writes.length, 3);
    } else if (items.length === 2) {
      assert.equal(response.status, 200);
      assert.deepEqual(result.channels.map(channel => channel.name), ["First channel", "Second channel"]);
      assert.equal(writes.length, 0);
    } else {
      assert.equal(response.status, 403);
      assert.equal(writes.length, 0);
    }
  }
});

test("members can read analytics and submit chat but cannot manage the channel", async () => {
  const member = { kind: "member", role: "member", memberId: 12, environment: "staging", email: "member@example.test" };
  assert.ok(capabilitiesForRole("member").includes("analytics:read"));
  assert.ok(!capabilitiesForRole("member").includes("analytics:manage"));
  assert.deepEqual(policyForPath("/beta/api/analytics/assistant", "POST"), ["analytics", "read"]);
  const env = { DB: { prepare() { return statement(); } }, OPS_ENVIRONMENT: "staging" };
  assert.equal((await handleAnalyticsRequest(new Request("https://app.test/beta/api/analytics/status"), env, member)).status, 200);
  for (const path of ["oauth/start", "selection", "disconnect"]) {
    const result = await handleAnalyticsRequest(new Request(`https://app.test/beta/api/analytics/${path}`, { method: "POST" }), env, member);
    assert.equal(result.status, 403);
  }
  assert.equal((await handleAnalyticsRequest(new Request("https://app.test/beta/api/analytics/oauth/callback"), env, member)).status, 403);
});
