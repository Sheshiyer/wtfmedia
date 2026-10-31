import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleAnalyticsRequest, encryptAnalyticsCredentials, decryptAnalyticsCredentials } from "../src/analytics.ts";

const channel = (letter) => `UC${letter.repeat(22)}`;
const now = "2026-10-29T00:00:00.000Z";
const principal = { kind: "operator", operatorId: 7, role: "admin", environment: "local" };

function database(beforeMultiAccount = false) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const root = new URL("../migrations/", import.meta.url);
  for (const file of JSON.parse(readFileSync(new URL("manifest.json", root))).wrangler_order) {
    if (beforeMultiAccount && file === "0029_youtube_multi_account.sql") break;
    sqlite.exec(readFileSync(new URL(file, root), "utf8"));
  }
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ success: true, meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  return { sqlite, prepare: wrap, batch: async statements => { for (const statement of statements) await statement.run(); } };
}

test("three channel grants remain separate, reconnect works, and a fourth is blocked", async (t) => {
  const DB = database();
  const encryption = "local-test-encryption-key-long-enough";
  const env = { DB, OPS_ENVIRONMENT: "local", ANALYTICS_TOKEN_ENCRYPTION_KEY: encryption, GOOGLE_OAUTH_CLIENT_ID: "client", GOOGLE_OAUTH_CLIENT_SECRET: "secret", GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/beta/api/analytics/oauth/callback" };
  let serial = 0;
  const deps = { now: () => new Date(now), randomUUID: () => `${(++serial).toString(16).padStart(8, "0")}-0000-4000-8000-000000000000` };
  const select = async (letter, transaction, grant = letter) => {
    const encrypted = await encryptAnalyticsCredentials({ accessToken: `access-${grant}`, refreshToken: `refresh-${grant}`, expiresAt: "2026-10-30T00:00:00Z" }, encryption);
    DB.sqlite.prepare("INSERT INTO analytics_oauth_transactions(id,state_sha256,operator_id,provider,return_path,expires_at,consumed_at,created_at,pending_credentials,available_resources_json) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(transaction, transaction.slice(5).repeat(2), 7, "youtube", "/beta/settings/workspace/analytics", "2026-10-29T01:00:00.000Z", now, now, encrypted, JSON.stringify([{ id: channel(letter), name: `Channel ${letter}` }]));
    return handleAnalyticsRequest(new Request("http://localhost:3000/beta/api/analytics/selection", { method: "POST", body: JSON.stringify({ provider: "youtube", resourceId: channel(letter), pendingTransactionId: transaction }) }), env, principal, deps);
  };
  for (const letter of ["a", "b", "c"]) assert.equal((await select(letter, `aotx_${letter.repeat(32)}`)).status, 200);
  assert.equal((await select("d", `aotx_${"d".repeat(32)}`)).status, 409);
  assert.equal((await select("b", `aotx_${"e".repeat(32)}`, "e")).status, 200, "a connected channel can refresh its own grant");
  const status = await (await handleAnalyticsRequest(new Request("http://localhost:3000/beta/api/analytics/status"), env, principal, deps)).json();
  const channels = status.connections.filter(connection => connection.provider === "youtube");
  assert.deepEqual(channels.map(connection => connection.resource.id), [channel("a"), channel("b"), channel("c")]);
  assert.equal(DB.sqlite.prepare("SELECT encrypted_credentials FROM analytics_provider_connections WHERE provider='youtube'").get().encrypted_credentials, null);
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS count FROM youtube_analytics_accounts WHERE status <> 'revoked'").get().count, 3);
  for (const letter of ["a", "b", "c"]) {
    const row = DB.sqlite.prepare("SELECT encrypted_credentials FROM youtube_analytics_accounts WHERE youtube_channel_id = ?").get(channel(letter));
    const credentials = await decryptAnalyticsCredentials(row.encrypted_credentials, encryption);
    assert.equal(credentials.refreshToken, letter === "b" ? "refresh-e" : `refresh-${letter}`);
  }
  for (const [letter, views, impressions, ctr] of [["a", 10, 100, 0.01], ["b", 20, 200, 0.02], ["c", 30, 300, 0.03]]) {
    const row = DB.sqlite.prepare("SELECT id FROM youtube_analytics_channels WHERE youtube_channel_id = ?").get(channel(letter));
    DB.sqlite.prepare("INSERT INTO youtube_channel_daily_metrics(channel_id,metric_date,views,watch_minutes,average_view_duration_seconds,thumbnail_impressions,thumbnail_impressions_ctr,subscribers_gained,subscribers_lost,observed_at) VALUES (?,'2026-10-28',?,?,?,?,?,?,0,?)")
      .run(row.id, views, views * 2, 12, impressions, ctr, 1, now);
  }
  const reportUrl = "http://localhost:3000/beta/api/analytics/youtube?startDate=2026-10-28&endDate=2026-10-28";
  const combined = await (await handleAnalyticsRequest(new Request(`${reportUrl}&channelId=all`), env, principal, deps)).json();
  assert.equal(combined.totals.views, 60);
  assert.equal(combined.totals.impressions, 600);
  assert.equal(combined.totals.impressions_ctr, 0.023333333333333334);
  assert.equal(combined.coverage.includedChannels, 3);
  const individual = await (await handleAnalyticsRequest(new Request(`${reportUrl}&channelId=${channel("b")}`), env, principal, deps)).json();
  assert.equal(individual.totals.views, 20);
  assert.equal(individual.resource.id, channel("b"));
  assert.deepEqual(DB.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  await t.test("expired grant reconnects through OAuth start, callback and selection at capacity", async () => {
    const originalAccounts = DB.sqlite.prepare("SELECT youtube_channel_id, encrypted_credentials FROM youtube_analytics_accounts ORDER BY youtube_channel_id").all();
    DB.sqlite.prepare("UPDATE youtube_analytics_accounts SET status='expired' WHERE youtube_channel_id=?").run(channel("b"));
    const start = await handleAnalyticsRequest(new Request("http://localhost:3000/beta/api/analytics/oauth/start", { method: "POST", body: JSON.stringify({ provider: "youtube" }) }), env, principal, deps);
    assert.equal(start.status, 201);
    const authorization = new URL((await start.json()).authorizationUrl);
    const state = authorization.searchParams.get("state");
    let calls = 0;
    const mockGoogle = async (url) => {
      calls++;
      if (String(url) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "replacement-test", refresh_token: "replacement-refresh", expires_in: 3600, scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly" });
      assert.equal(new URL(url).pathname, "/youtube/v3/channels");
      return Response.json({ items: ["b", "d"].map(letter => ({ id: channel(letter), snippet: { title: `Channel ${letter}` } })) });
    };
    const callback = () => new Request(`http://localhost:3000/beta/api/analytics/oauth/callback?state=${encodeURIComponent(state)}&code=test-code`);
    assert.equal((await handleAnalyticsRequest(callback(), env, principal, { ...deps, fetchGoogle: mockGoogle })).status, 303);
    assert.equal(calls, 2);
    await handleAnalyticsRequest(callback(), env, principal, { ...deps, fetchGoogle: mockGoogle });
    assert.equal(calls, 2, "callback replay must not exchange the grant twice");
    const pending = DB.sqlite.prepare("SELECT id FROM analytics_oauth_transactions WHERE pending_credentials IS NOT NULL AND id NOT IN (?,?) ORDER BY created_at DESC").all(`aotx_${"d".repeat(32)}`, `aotx_${"e".repeat(32)}`);
    assert.equal(pending.length, 1);
    const selectPending = letter => new Request("http://localhost:3000/beta/api/analytics/selection", { method: "POST", body: JSON.stringify({ provider: "youtube", resourceId: channel(letter), pendingTransactionId: pending[0].id }) });
    assert.equal((await handleAnalyticsRequest(selectPending("d"), env, principal, deps)).status, 409, "authorized fourth channel cannot consume a new slot");
    assert.equal((await handleAnalyticsRequest(selectPending("a"), env, principal, deps)).status, 403, "existing but unauthorized channel cannot be selected");
    assert.equal((await handleAnalyticsRequest(selectPending("b"), env, principal, deps)).status, 200);
    assert.equal((await handleAnalyticsRequest(selectPending("b"), env, principal, deps)).status, 409, "selection consumes pending credentials");
    const accounts = DB.sqlite.prepare("SELECT youtube_channel_id, encrypted_credentials, status FROM youtube_analytics_accounts ORDER BY youtube_channel_id").all();
    assert.equal(accounts.length, 3);
    assert.equal(accounts[1].status, "connected");
    assert.notEqual(accounts[1].encrypted_credentials, originalAccounts[1].encrypted_credentials);
    for (const index of [0, 2]) assert.equal(accounts[index].encrypted_credentials, originalAccounts[index].encrypted_credentials);
    const preserved = await (await handleAnalyticsRequest(new Request(`${reportUrl}&channelId=${channel("b")}`), env, principal, deps)).json();
    assert.equal(preserved.totals.views, 20, "reconnection preserves stored observations");
  });
  const channelA = DB.sqlite.prepare("SELECT id FROM youtube_analytics_channels WHERE youtube_channel_id=?").get(channel("a")).id;
  const readAll = async (start, end) => (await handleAnalyticsRequest(new Request(`http://localhost:3000/beta/api/analytics/youtube?channelId=all&startDate=${start}&endDate=${end}`), env, principal, deps)).json();
  await t.test("unequal daily coverage cannot publish complete combined totals", async () => {
    DB.sqlite.prepare("INSERT INTO youtube_channel_daily_metrics(channel_id,metric_date,views,observed_at) VALUES (?,'2026-10-27',100,?)").run(channelA, now);
    const partial = await readAll("2026-10-27", "2026-10-28");
    assert.equal(partial.status, "partial");
    assert.equal(partial.coverage.channelDays, 4);
    assert.equal(partial.coverage.expectedChannelDays, 6);
    assert.deepEqual(partial.coverage.incompleteChannels, [channel("b"), channel("c")]);
    assert.ok(Object.values(partial.totals).every(value => value === null));
    assert.equal(partial.periods.current.views, null);
    assert.deepEqual(partial.insights, []);
    assert.deepEqual(partial.trends, []);
  });
  await t.test("complete current data does not mask incomplete comparison windows", async () => {
    const report = await readAll("2026-10-28", "2026-10-28");
    assert.equal(report.status, "connected");
    assert.equal(report.totals.views, 60);
    assert.equal(report.periods.previous.views, null);
    assert.equal(report.periods.trailing28.views, null);
    assert.equal(report.expectations.ctr, null);
    assert.deepEqual(report.coverage.periods, { current: true, previous: false, trailing28: false });
  });
  await t.test("empty windows and unavailable channels stay partial", async () => {
    const empty = await readAll("2026-10-26", "2026-10-26");
    assert.equal(empty.status, "partial");
    assert.equal(empty.totals.views, null);
    DB.sqlite.prepare("UPDATE youtube_analytics_channels SET active=0 WHERE youtube_channel_id=?").run(channel("c"));
    const missing = await readAll("2026-10-28", "2026-10-28");
    assert.equal(missing.status, "partial");
    assert.equal(missing.totals.views, null);
    assert.deepEqual(missing.coverage.unavailableChannels, [channel("c")]);
    DB.sqlite.prepare("UPDATE youtube_analytics_channels SET active=1 WHERE youtube_channel_id=?").run(channel("c"));
  });
  await t.test("observed zero days count as covered, complete comparisons remain available", async () => {
    for (const row of DB.sqlite.prepare("SELECT id FROM youtube_analytics_channels").all()) {
      DB.sqlite.prepare("INSERT INTO youtube_channel_daily_metrics(channel_id,metric_date,views,observed_at) VALUES (?,'2026-10-26',0,?)").run(row.id, now);
      DB.sqlite.prepare("INSERT OR IGNORE INTO youtube_channel_daily_metrics(channel_id,metric_date,views,observed_at) VALUES (?,'2026-10-27',0,?)").run(row.id, now);
    }
    const zero = await readAll("2026-10-26", "2026-10-26");
    assert.equal(zero.status, "connected");
    assert.equal(zero.totals.views, 0);
    const complete = await readAll("2026-10-28", "2026-10-28");
    assert.equal(complete.periods.previous.views, 100);
    assert.equal(complete.coverage.periods.previous, true);
    assert.equal(complete.periods.trailing28.views, null);
  });
  DB.sqlite.close();
});


test("migration preserves the legacy grant, daily history and Reporting job", async () => {
  const DB = database(true);
  const encrypted = await encryptAnalyticsCredentials({ accessToken: "legacy-test", refreshToken: "legacy-refresh", expiresAt: "2026-10-30T00:00:00Z" }, "local-migration-test-key");
  DB.sqlite.prepare("INSERT INTO analytics_provider_connections(id,environment,provider,status,encrypted_credentials,token_expires_at,selected_resource_id,created_at,updated_at) VALUES ('acon_legacy','local','youtube','connected',?,?,?, ?,?)").run(encrypted,"2026-10-30T00:00:00Z",channel("a"),now,now);
  DB.sqlite.prepare("INSERT INTO youtube_analytics_channels(id,connection_id,youtube_channel_id,title,active,created_at,updated_at) VALUES ('ytch_legacy','acon_legacy',?,'Legacy channel',1,?,?)").run(channel("a"),now,now);
  DB.sqlite.prepare("INSERT INTO youtube_channel_daily_metrics(channel_id,metric_date,views,observed_at) VALUES ('ytch_legacy','2026-10-28',42,?)").run(now);
  DB.sqlite.prepare("INSERT INTO youtube_reporting_jobs(connection_id,report_type_id,google_job_id,created_at,updated_at) VALUES ('acon_legacy','channel_reach_basic_a1','test-job',?,?)").run(now,now);
  DB.sqlite.prepare("INSERT INTO youtube_reporting_imports(google_report_id,connection_id,report_type_id,rows_imported,imported_at) VALUES ('test-report','acon_legacy','channel_reach_basic_a1',1,?)").run(now);
  DB.sqlite.exec(readFileSync(new URL('../migrations/0029_youtube_multi_account.sql', import.meta.url),'utf8'));
  const account = DB.sqlite.prepare("SELECT * FROM youtube_analytics_accounts").get();
  assert.equal(account.encrypted_credentials, encrypted);
  assert.equal(account.youtube_channel_id, channel("a"));
  assert.equal(account.status, "connected");
  assert.equal(DB.sqlite.prepare("SELECT encrypted_credentials FROM analytics_provider_connections").get().encrypted_credentials, null);
  assert.equal(DB.sqlite.prepare("SELECT views FROM youtube_channel_daily_metrics").get().views, 42);
  for (const table of ['youtube_reporting_jobs','youtube_reporting_imports']) assert.equal(DB.sqlite.prepare(`SELECT report_type_id FROM ${table}`).get().report_type_id, `channel_reach_basic_a1:${channel("a")}`);
  assert.deepEqual(DB.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  DB.sqlite.close();
});
