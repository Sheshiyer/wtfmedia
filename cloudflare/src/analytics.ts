import type { PrincipalContext } from "./auth/principal-context.ts";
import type { DB } from "./db.ts";

export type AnalyticsProvider = "youtube" | "ga4";

export type AnalyticsEnv = {
  DB: DB;
  OPS_ENVIRONMENT: "local" | "staging" | "production";
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  ANALYTICS_TOKEN_ENCRYPTION_KEY?: string;
};

export type AnalyticsDependencies = {
  fetchGoogle?: typeof fetch;
  now?: () => Date;
  randomUUID?: () => string;
};

type OperatorPrincipal = Extract<PrincipalContext, { kind: "operator" }>;
export type AnalyticsConnectionRow = {
  id: string;
  provider: AnalyticsProvider;
  status: string;
  encrypted_credentials: string | null;
  granted_scopes_json: string;
  token_expires_at: string | null;
  selected_resource_id: string | null;
  selected_resource_name: string | null;
  reporting_timezone: string | null;
  last_attempted_refresh_at: string | null;
  last_successful_refresh_at: string | null;
  last_error_code: string | null;
};

type StoredCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

const responseHeaders = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

const scopes: Record<AnalyticsProvider, readonly string[]> = {
  youtube: [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ],
  ga4: ["https://www.googleapis.com/auth/analytics.readonly"],
};

const configured = (env: AnalyticsEnv): boolean => Boolean(
  env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  && env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  && env.GOOGLE_OAUTH_REDIRECT_URI?.trim()
  && env.ANALYTICS_TOKEN_ENCRYPTION_KEY?.trim(),
);

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: responseHeaders });
}

function providerValue(value: unknown): AnalyticsProvider | null {
  return value === "youtube" || value === "ga4" ? value : null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptAnalyticsCredentials(credentials: StoredCredentials, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(JSON.stringify(credentials)),
  );
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptAnalyticsCredentials(envelope: string, secret: string): Promise<StoredCredentials> {
  const [version, encodedIv, encodedCiphertext] = envelope.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext) throw new Error("invalid_credential_envelope");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(encodedIv) },
    await encryptionKey(secret),
    decodeBase64Url(encodedCiphertext),
  );
  const value = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<StoredCredentials>;
  if (!value.accessToken || !value.refreshToken || !value.expiresAt) throw new Error("invalid_credential_payload");
  return { accessToken: value.accessToken, refreshToken: value.refreshToken, expiresAt: value.expiresAt };
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  return request.json().then((value) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null).catch(() => null);
}

function connectionDto(row: AnalyticsConnectionRow) {
  let grantedScopes: string[] = [];
  try {
    const parsed = JSON.parse(row.granted_scopes_json);
    if (Array.isArray(parsed)) grantedScopes = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    grantedScopes = [];
  }
  return {
    provider: row.provider,
    status: row.status,
    grantedScopes,
    resource: row.selected_resource_id ? {
      id: row.selected_resource_id,
      name: row.selected_resource_name,
      timezone: row.reporting_timezone,
    } : null,
    lastAttemptedRefreshAt: row.last_attempted_refresh_at,
    lastSuccessfulRefreshAt: row.last_successful_refresh_at,
    errorCode: row.last_error_code,
  };
}

async function connections(db: DB, environment: string): Promise<AnalyticsConnectionRow[]> {
  const result = await db.prepare(
    "SELECT id, provider, status, encrypted_credentials, granted_scopes_json, token_expires_at, selected_resource_id, selected_resource_name, reporting_timezone, last_attempted_refresh_at, last_successful_refresh_at, last_error_code FROM analytics_provider_connections WHERE environment = ? ORDER BY provider",
  ).bind(environment).all<AnalyticsConnectionRow>();
  return result.results;
}

async function status(env: AnalyticsEnv): Promise<Response> {
  try {
    const rows = await connections(env.DB, env.OPS_ENVIRONMENT);
    return json({ configured: configured(env), connections: rows.map(connectionDto) });
  } catch {
    return json({ configured: configured(env), connections: [], migrationRequired: true });
  }
}

function safeReturn(request: Request, result: "connected" | "denied" | "failed", provider?: AnalyticsProvider): Response {
  const target = new URL("/beta/settings/workspace/analytics", new URL(request.url).origin);
  target.searchParams.set("oauth", result);
  if (provider) target.searchParams.set("provider", provider);
  return new Response(null, { status: 303, headers: { location: target.toString(), "cache-control": "private, no-store" } });
}

async function startOAuth(request: Request, env: AnalyticsEnv, context: OperatorPrincipal, dependencies: AnalyticsDependencies): Promise<Response> {
  if (!configured(env)) return json({ error: "analytics_oauth_not_configured" }, 503);
  const input = await body(request);
  const provider = providerValue(input?.provider);
  if (!provider) return json({ error: "invalid_provider" }, 400);
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = base64Url(stateBytes);
  const stateHash = await sha256Hex(state);
  const now = dependencies.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
  const id = `aotx_${(dependencies.randomUUID?.() ?? crypto.randomUUID()).replaceAll("-", "")}`;
  await env.DB.prepare(
    "INSERT INTO analytics_oauth_transactions (id, state_sha256, operator_id, provider, return_path, expires_at, created_at) VALUES (?, ?, ?, ?, '/beta/settings/workspace/analytics', ?, ?)",
  ).bind(id, stateHash, context.operatorId, provider, expiresAt, now.toISOString()).run();
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID!.trim());
  authorization.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI!.trim());
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", scopes[provider].join(" "));
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("include_granted_scopes", "true");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("state", state);
  return json({ authorizationUrl: authorization.toString() }, 201);
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

async function exchangeCode(code: string, env: AnalyticsEnv, fetchGoogle: typeof fetch): Promise<TokenResponse> {
  const form = new URLSearchParams({
    code,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!.trim(),
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!.trim(),
    grant_type: "authorization_code",
  });
  const response = await fetchGoogle("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return response.json().catch(() => ({ error: "invalid_token_response" })) as Promise<TokenResponse>;
}

async function oauthCallback(request: Request, env: AnalyticsEnv, context: OperatorPrincipal, dependencies: AnalyticsDependencies): Promise<Response> {
  if (!configured(env)) return safeReturn(request, "failed");
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return safeReturn(request, "denied");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!state || !code) return safeReturn(request, "failed");
  const stateHash = await sha256Hex(state);
  const now = dependencies.now?.() ?? new Date();
  const transaction = await env.DB.prepare(
    "SELECT id, provider FROM analytics_oauth_transactions WHERE state_sha256 = ? AND operator_id = ? AND consumed_at IS NULL AND expires_at > ?",
  ).bind(stateHash, context.operatorId, now.toISOString()).first<{ id: string; provider: AnalyticsProvider }>();
  if (!transaction || !providerValue(transaction.provider)) return safeReturn(request, "failed");
  // Consume before exchanging the code so concurrent callback replays cannot
  // both reach Google. A failed exchange requires a fresh authorization start.
  const consumed = await env.DB.prepare("UPDATE analytics_oauth_transactions SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").bind(now.toISOString(), transaction.id).run();
  if ((consumed.meta?.changes ?? 0) !== 1) return safeReturn(request, "failed", transaction.provider);
  const token = await exchangeCode(code, env, dependencies.fetchGoogle ?? fetch);
  const grantedScopes = (token.scope ?? "").split(/\s+/u).filter(Boolean);
  const missingScope = scopes[transaction.provider].some((scope) => !grantedScopes.includes(scope));
  if (!token.access_token || !token.refresh_token || !token.expires_in || missingScope) {
    return safeReturn(request, "failed", transaction.provider);
  }
  const expiresAt = new Date(now.getTime() + token.expires_in * 1_000).toISOString();
  const encrypted = await encryptAnalyticsCredentials({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt }, env.ANALYTICS_TOKEN_ENCRYPTION_KEY!.trim());
  const connectionId = `acon_${(dependencies.randomUUID?.() ?? crypto.randomUUID()).replaceAll("-", "")}`;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO analytics_provider_connections (id, environment, provider, status, encrypted_credentials, encryption_key_version, granted_scopes_json, token_expires_at, connected_by_operator_id, created_at, updated_at) VALUES (?, ?, ?, 'connected', ?, 'v1', ?, ?, ?, ?, ?) ON CONFLICT(environment, provider) DO UPDATE SET status = 'connected', encrypted_credentials = excluded.encrypted_credentials, encryption_key_version = excluded.encryption_key_version, granted_scopes_json = excluded.granted_scopes_json, token_expires_at = excluded.token_expires_at, connected_by_operator_id = excluded.connected_by_operator_id, last_error_code = NULL, revoked_at = NULL, updated_at = excluded.updated_at",
    ).bind(connectionId, env.OPS_ENVIRONMENT, transaction.provider, encrypted, JSON.stringify(grantedScopes), expiresAt, context.operatorId, now.toISOString(), now.toISOString()),
  ]);
  return safeReturn(request, "connected", transaction.provider);
}

export async function refreshAnalyticsAccessToken(row: AnalyticsConnectionRow, env: AnalyticsEnv, dependencies: AnalyticsDependencies = {}): Promise<string> {
  if (!row.encrypted_credentials || !env.ANALYTICS_TOKEN_ENCRYPTION_KEY || !env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) throw new Error("connection_unavailable");
  const now = dependencies.now?.() ?? new Date();
  const stored = await decryptAnalyticsCredentials(row.encrypted_credentials, env.ANALYTICS_TOKEN_ENCRYPTION_KEY.trim());
  if (new Date(stored.expiresAt).getTime() > now.getTime() + 60_000) return stored.accessToken;
  const response = await (dependencies.fetchGoogle ?? fetch)("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID.trim(),
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET.trim(),
      refresh_token: stored.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const token = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !token?.access_token || !token.expires_in) {
    await env.DB.prepare("UPDATE analytics_provider_connections SET status = 'expired', last_error_code = 'token_refresh_failed', updated_at = ? WHERE id = ?").bind(now.toISOString(), row.id).run();
    throw new Error("token_refresh_failed");
  }
  const expiresAt = new Date(now.getTime() + token.expires_in * 1_000).toISOString();
  const encrypted = await encryptAnalyticsCredentials({ accessToken: token.access_token, refreshToken: stored.refreshToken, expiresAt }, env.ANALYTICS_TOKEN_ENCRYPTION_KEY.trim());
  await env.DB.prepare("UPDATE analytics_provider_connections SET encrypted_credentials = ?, token_expires_at = ?, status = 'connected', last_error_code = NULL, updated_at = ? WHERE id = ?").bind(encrypted, expiresAt, now.toISOString(), row.id).run();
  return token.access_token;
}

async function connectionFor(env: AnalyticsEnv, provider: AnalyticsProvider): Promise<AnalyticsConnectionRow | null> {
  return env.DB.prepare(
    "SELECT id, provider, status, encrypted_credentials, granted_scopes_json, token_expires_at, selected_resource_id, selected_resource_name, reporting_timezone, last_attempted_refresh_at, last_successful_refresh_at, last_error_code FROM analytics_provider_connections WHERE environment = ? AND provider = ?",
  ).bind(env.OPS_ENVIRONMENT, provider).first<AnalyticsConnectionRow>();
}

async function selectResource(request: Request, env: AnalyticsEnv, dependencies: AnalyticsDependencies): Promise<Response> {
  const input = await body(request);
  const provider = providerValue(input?.provider);
  const resourceId = typeof input?.resourceId === "string" ? input.resourceId.trim() : "";
  const timezone = typeof input?.timezone === "string" && /^[A-Za-z_+\/-]{1,64}$/u.test(input.timezone) ? input.timezone : "UTC";
  if (!provider) return json({ error: "invalid_provider" }, 400);
  if (provider === "youtube" && !/^UC[A-Za-z0-9_-]{22}$/u.test(resourceId)) return json({ error: "invalid_channel_id" }, 400);
  if (provider === "ga4" && !/^\d{5,24}$/u.test(resourceId)) return json({ error: "invalid_property_id" }, 400);
  const row = await connectionFor(env, provider);
  if (!row || !row.encrypted_credentials || row.status === "revoked") return json({ error: "connection_required" }, 409);
  let accessToken: string;
  try { accessToken = await refreshAnalyticsAccessToken(row, env, dependencies); }
  catch { return json({ error: "connection_expired" }, 409); }
  const fetchGoogle = dependencies.fetchGoogle ?? fetch;
  let resourceName = typeof input?.resourceName === "string" ? input.resourceName.trim().slice(0, 160) : "";
  if (provider === "youtube") {
    const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelsUrl.searchParams.set("part", "id,snippet");
    channelsUrl.searchParams.set("mine", "true");
    const response = await fetchGoogle(channelsUrl, { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } });
    const payload = await response.json().catch(() => null) as { items?: Array<{ id?: string; snippet?: { title?: string } }> } | null;
    const channel = response.ok ? payload?.items?.find((item) => item.id === resourceId) : null;
    if (!channel) return json({ error: response.status === 403 ? "missing_permission" : "resource_not_authorized" }, 403);
    resourceName = channel.snippet?.title?.slice(0, 160) || resourceName || resourceId;
  } else {
    const response = await fetchGoogle(`https://analyticsdata.googleapis.com/v1beta/properties/${resourceId}/metadata`, { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } });
    if (!response.ok) return json({ error: response.status === 403 ? "missing_permission" : "resource_not_authorized" }, 403);
    resourceName = resourceName || `GA4 property ${resourceId}`;
  }
  const now = dependencies.now?.() ?? new Date();
  if (provider === "youtube") {
    const id = `ytch_${(dependencies.randomUUID?.() ?? crypto.randomUUID()).replaceAll("-", "")}`;
    await env.DB.batch([
      env.DB.prepare("UPDATE youtube_analytics_channels SET active = 0, updated_at = ? WHERE connection_id = ?").bind(now.toISOString(), row.id),
      env.DB.prepare("INSERT INTO youtube_analytics_channels (id, connection_id, youtube_channel_id, title, reporting_timezone, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(connection_id, youtube_channel_id) DO UPDATE SET title = excluded.title, reporting_timezone = excluded.reporting_timezone, active = 1, updated_at = excluded.updated_at").bind(id, row.id, resourceId, resourceName, timezone, now.toISOString(), now.toISOString()),
      env.DB.prepare("UPDATE analytics_provider_connections SET selected_resource_id = ?, selected_resource_name = ?, reporting_timezone = ?, status = 'connected', last_validated_at = ?, last_error_code = NULL, updated_at = ? WHERE id = ?").bind(resourceId, resourceName, timezone, now.toISOString(), now.toISOString(), row.id),
    ]);
  } else {
    const id = `ga4p_${(dependencies.randomUUID?.() ?? crypto.randomUUID()).replaceAll("-", "")}`;
    await env.DB.batch([
      env.DB.prepare("UPDATE ga4_analytics_properties SET active = 0, updated_at = ? WHERE connection_id = ?").bind(now.toISOString(), row.id),
      env.DB.prepare("INSERT INTO ga4_analytics_properties (id, connection_id, ga4_property_id, display_name, reporting_timezone, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(connection_id, ga4_property_id) DO UPDATE SET display_name = excluded.display_name, reporting_timezone = excluded.reporting_timezone, active = 1, updated_at = excluded.updated_at").bind(id, row.id, resourceId, resourceName, timezone, now.toISOString(), now.toISOString()),
      env.DB.prepare("UPDATE analytics_provider_connections SET selected_resource_id = ?, selected_resource_name = ?, reporting_timezone = ?, status = 'connected', last_validated_at = ?, last_error_code = NULL, updated_at = ? WHERE id = ?").bind(resourceId, resourceName, timezone, now.toISOString(), now.toISOString(), row.id),
    ]);
  }
  return json({ connection: { ...connectionDto({ ...row, status: "connected", selected_resource_id: resourceId, selected_resource_name: resourceName, reporting_timezone: timezone }), resource: { id: resourceId, name: resourceName, timezone } } });
}

async function disconnect(request: Request, env: AnalyticsEnv, dependencies: AnalyticsDependencies): Promise<Response> {
  const input = await body(request);
  const provider = providerValue(input?.provider);
  if (!provider) return json({ error: "invalid_provider" }, 400);
  const row = await connectionFor(env, provider);
  if (!row) return json({ error: "connection_not_found" }, 404);
  let providerRevocation: "confirmed" | "unconfirmed" = "unconfirmed";
  if (row.encrypted_credentials && env.ANALYTICS_TOKEN_ENCRYPTION_KEY) {
    try {
      const stored = await decryptAnalyticsCredentials(row.encrypted_credentials, env.ANALYTICS_TOKEN_ENCRYPTION_KEY.trim());
      const revoke = await (dependencies.fetchGoogle ?? fetch)("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: stored.refreshToken }).toString(),
      });
      if (revoke.ok) providerRevocation = "confirmed";
    } catch {
      providerRevocation = "unconfirmed";
    }
  }
  const now = dependencies.now?.() ?? new Date();
  const statements = [
    env.DB.prepare("UPDATE analytics_provider_connections SET status = 'revoked', encrypted_credentials = NULL, token_expires_at = NULL, revoked_at = ?, last_error_code = NULL, updated_at = ? WHERE id = ?").bind(now.toISOString(), now.toISOString(), row.id),
  ];
  if (provider === "youtube") statements.push(env.DB.prepare("UPDATE youtube_analytics_channels SET active = 0, updated_at = ? WHERE connection_id = ?").bind(now.toISOString(), row.id));
  else statements.push(env.DB.prepare("UPDATE ga4_analytics_properties SET active = 0, updated_at = ? WHERE connection_id = ?").bind(now.toISOString(), row.id));
  await env.DB.batch(statements);
  return json({ provider, status: "revoked", providerRevocation });
}

function dateRange(url: URL): { startDate: string; endDate: string } | null {
  const startDate = url.searchParams.get("startDate") ?? "";
  const endDate = url.searchParams.get("endDate") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(endDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start > 366 * 86_400_000) return null;
  return { startDate, endDate };
}

async function youtubeReport(request: Request, env: AnalyticsEnv): Promise<Response> {
  const range = dateRange(new URL(request.url));
  if (!range) return json({ error: "invalid_date_range" }, 400);
  const connection = await connectionFor(env, "youtube");
  if (!connection?.selected_resource_id) return json({ error: "channel_not_selected" }, 409);
  const channel = await env.DB.prepare("SELECT id, youtube_channel_id, title, reporting_timezone FROM youtube_analytics_channels WHERE connection_id = ? AND youtube_channel_id = ? AND active = 1").bind(connection.id, connection.selected_resource_id).first<{ id: string; youtube_channel_id: string; title: string; reporting_timezone: string }>();
  if (!channel) return json({ error: "channel_not_selected" }, 409);
  const totals = await env.DB.prepare("SELECT SUM(views) AS views, SUM(watch_minutes) AS watch_minutes, CASE WHEN SUM(views) > 0 THEN SUM(average_view_duration_seconds * views) / SUM(views) END AS average_view_duration_seconds, SUM(likes) AS likes, SUM(comments_count) AS comments_count, SUM(shares) AS shares, SUM(subscribers_gained) AS subscribers_gained, SUM(subscribers_lost) AS subscribers_lost FROM youtube_channel_daily_metrics WHERE channel_id = ? AND metric_date BETWEEN ? AND ?").bind(channel.id, range.startDate, range.endDate).first<Record<string, number | null>>();
  const trends = await env.DB.prepare("SELECT metric_date AS date, views, watch_minutes AS watchMinutes, subscribers_gained AS subscribersGained, subscribers_lost AS subscribersLost FROM youtube_channel_daily_metrics WHERE channel_id = ? AND metric_date BETWEEN ? AND ? ORDER BY metric_date").bind(channel.id, range.startDate, range.endDate).all();
  const videos = await env.DB.prepare("SELECT v.youtube_video_id AS videoId, v.title, v.published_at AS publishedAt, SUM(m.views) AS views, SUM(m.watch_minutes) AS watchMinutes, CASE WHEN SUM(m.views) > 0 THEN SUM(m.average_view_duration_seconds * m.views) / SUM(m.views) END AS averageViewDurationSeconds, SUM(m.likes) AS likes, SUM(m.comments_count) AS comments, SUM(m.shares) AS shares, SUM(m.subscribers_gained) - SUM(m.subscribers_lost) AS subscriberChange FROM youtube_analytics_videos v LEFT JOIN youtube_video_daily_metrics m ON m.video_id = v.id AND m.metric_date BETWEEN ? AND ? WHERE v.channel_id = ? GROUP BY v.id ORDER BY views DESC LIMIT 100").bind(range.startDate, range.endDate, channel.id).all();
  return json({ provider: "youtube", resource: { id: channel.youtube_channel_id, name: channel.title, timezone: channel.reporting_timezone }, range, freshness: connection.last_successful_refresh_at, status: connection.status, totals: totals ?? {}, trends: trends.results, videos: videos.results });
}

async function ga4Report(request: Request, env: AnalyticsEnv): Promise<Response> {
  const range = dateRange(new URL(request.url));
  if (!range) return json({ error: "invalid_date_range" }, 400);
  const connection = await connectionFor(env, "ga4");
  if (!connection?.selected_resource_id) return json({ error: "property_not_selected" }, 409);
  const property = await env.DB.prepare("SELECT id, ga4_property_id, display_name, reporting_timezone FROM ga4_analytics_properties WHERE connection_id = ? AND ga4_property_id = ? AND active = 1").bind(connection.id, connection.selected_resource_id).first<{ id: string; ga4_property_id: string; display_name: string; reporting_timezone: string }>();
  if (!property) return json({ error: "property_not_selected" }, 409);
  const totals = await env.DB.prepare("SELECT SUM(users) AS users, SUM(sessions) AS sessions, SUM(engaged_sessions) AS engaged_sessions, CASE WHEN SUM(sessions) > 0 THEN CAST(SUM(engaged_sessions) AS REAL) / SUM(sessions) END AS engagement_rate FROM ga4_daily_metrics WHERE property_id = ? AND metric_date BETWEEN ? AND ? AND traffic_source = '(all)'").bind(property.id, range.startDate, range.endDate).first<Record<string, number | null>>();
  const trends = await env.DB.prepare("SELECT metric_date AS date, users, sessions, engaged_sessions AS engagedSessions, engagement_rate AS engagementRate FROM ga4_daily_metrics WHERE property_id = ? AND metric_date BETWEEN ? AND ? AND traffic_source = '(all)' ORDER BY metric_date").bind(property.id, range.startDate, range.endDate).all();
  const sources = await env.DB.prepare("SELECT traffic_source AS trafficSource, SUM(users) AS users, SUM(sessions) AS sessions, SUM(engaged_sessions) AS engagedSessions FROM ga4_daily_metrics WHERE property_id = ? AND metric_date BETWEEN ? AND ? AND traffic_source <> '(all)' GROUP BY traffic_source ORDER BY sessions DESC LIMIT 50").bind(property.id, range.startDate, range.endDate).all();
  return json({ provider: "ga4", resource: { id: property.ga4_property_id, name: property.display_name, timezone: property.reporting_timezone }, range, freshness: connection.last_successful_refresh_at, status: connection.status, totals: totals ?? {}, trends: trends.results, trafficSources: sources.results });
}

export async function handleAnalyticsRequest(
  request: Request,
  env: AnalyticsEnv,
  context: OperatorPrincipal,
  dependencies: AnalyticsDependencies = {},
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  try {
    if (pathname === "/beta/api/analytics/status" && request.method === "GET") return status(env);
    if (pathname === "/beta/api/analytics/oauth/start" && request.method === "POST") return startOAuth(request, env, context, dependencies);
    if (pathname === "/beta/api/analytics/oauth/callback" && request.method === "GET") return oauthCallback(request, env, context, dependencies);
    if (pathname === "/beta/api/analytics/selection" && request.method === "POST") return selectResource(request, env, dependencies);
    if (pathname === "/beta/api/analytics/disconnect" && request.method === "POST") return disconnect(request, env, dependencies);
    if (pathname === "/beta/api/analytics/youtube" && request.method === "GET") return youtubeReport(request, env);
    if (pathname === "/beta/api/analytics/ga4" && request.method === "GET") return ga4Report(request, env);
    return json({ error: "analytics_route_not_found" }, 404);
  } catch {
    return json({ error: "analytics_unavailable" }, 503);
  }
}
