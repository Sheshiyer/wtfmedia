import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleAnalyticsRequest, encryptAnalyticsCredentials } from "../src/analytics.ts";

const channel = (letter) => `UC${letter.repeat(22)}`;
const now = "2026-10-29T00:00:00.000Z";
const principal = { kind: "operator", operatorId: 7, role: "admin", environment: "local" };

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const root = new URL("../migrations/", import.meta.url);
  for (const file of JSON.parse(readFileSync(new URL("manifest.json", root))).wrangler_order) sqlite.exec(readFileSync(new URL(file, root), "utf8"));
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => sqlite.prepare(sql).run(...args),
  });
  return { sqlite, prepare: wrap, batch: async statements => { for (const statement of statements) await statement.run(); } };
}

test("three channel grants remain separate, reconnect works, and a fourth is blocked", async () => {
  const DB = database();
  const encryption = "local-test-encryption-key-long-enough";
  const encrypted = await encryptAnalyticsCredentials({ accessToken: "test", refreshToken: "refresh", expiresAt: "2026-10-30T00:00:00Z" }, encryption);
  const env = { DB, OPS_ENVIRONMENT: "local", ANALYTICS_TOKEN_ENCRYPTION_KEY: encryption, GOOGLE_OAUTH_CLIENT_ID: "client", GOOGLE_OAUTH_CLIENT_SECRET: "secret", GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/beta/api/analytics/oauth/callback" };
  let serial = 0;
  const deps = { now: () => new Date(now), randomUUID: () => `${(++serial).toString(16).padStart(8, "0")}-0000-4000-8000-000000000000` };
  const select = async (letter, transaction) => {
    DB.sqlite.prepare("INSERT INTO analytics_oauth_transactions(id,state_sha256,operator_id,provider,return_path,expires_at,consumed_at,created_at,pending_credentials,available_resources_json) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(transaction, transaction.slice(5).repeat(2), 7, "youtube", "/beta/settings/workspace/analytics", "2026-10-29T01:00:00.000Z", now, now, encrypted, JSON.stringify([{ id: channel(letter), name: `Channel ${letter}` }]));
    return handleAnalyticsRequest(new Request("http://localhost:3000/beta/api/analytics/selection", { method: "POST", body: JSON.stringify({ provider: "youtube", resourceId: channel(letter), pendingTransactionId: transaction }) }), env, principal, deps);
  };
  for (const letter of ["a", "b", "c"]) assert.equal((await select(letter, `aotx_${letter.repeat(32)}`)).status, 200);
  assert.equal((await select("d", `aotx_${"d".repeat(32)}`)).status, 409);
  assert.equal((await select("b", `aotx_${"e".repeat(32)}`)).status, 200, "a connected channel can refresh its own grant");
  const status = await (await handleAnalyticsRequest(new Request("http://localhost:3000/beta/api/analytics/status"), env, principal, deps)).json();
  const channels = status.connections.filter(connection => connection.provider === "youtube");
  assert.deepEqual(channels.map(connection => connection.resource.id), [channel("a"), channel("b"), channel("c")]);
  assert.equal(DB.sqlite.prepare("SELECT encrypted_credentials FROM analytics_provider_connections WHERE provider='youtube'").get().encrypted_credentials, null);
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS count FROM youtube_analytics_accounts WHERE status <> 'revoked'").get().count, 3);
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
  DB.sqlite.close();
});
