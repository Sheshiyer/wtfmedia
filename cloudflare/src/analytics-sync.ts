import {
  refreshAnalyticsAccessToken,
  type AnalyticsConnectionRow,
  type AnalyticsDependencies,
  type AnalyticsEnv,
} from "./analytics.ts";
import type { DB } from "./db.ts";

type SyncConnection = AnalyticsConnectionRow & { environment: "local" | "staging" | "production" };
type SyncResult = { connectionId: string; provider: "youtube" | "ga4"; status: "completed" | "retryable" | "failed"; rows: number; errorCode?: string };

const dayMs = 86_400_000;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
const numberOrNull = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function batch(db: DB, statements: D1PreparedStatement[], size = 80): Promise<void> {
  for (let index = 0; index < statements.length; index += size) await db.batch(statements.slice(index, index + size));
}

function providerError(status: number): { status: SyncResult["status"]; code: string } {
  if (status === 401) return { status: "failed", code: "credential_revoked" };
  if (status === 403) return { status: "failed", code: "missing_permission" };
  if (status === 429 || status >= 500) return { status: "retryable", code: status === 429 ? "quota_limited" : "provider_unavailable" };
  return { status: "failed", code: "provider_request_failed" };
}

async function googleJson(fetchGoogle: typeof fetch, url: string | URL, accessToken: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetchGoogle(url, { ...init, headers: { accept: "application/json", authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) } });
  if (!response.ok) {
    const error = providerError(response.status);
    throw Object.assign(new Error(error.code), error, { httpStatus: response.status });
  }
  return response.json();
}

async function syncYouTubeCatalogue(env: AnalyticsEnv, connection: SyncConnection, accessToken: string, fetchGoogle: typeof fetch, now: string): Promise<{ channelKey: string; videos: number }> {
  const channelId = connection.selected_resource_id!;
  const channel = await env.DB.prepare("SELECT id FROM youtube_analytics_channels WHERE connection_id = ? AND youtube_channel_id = ? AND active = 1").bind(connection.id, channelId).first<{ id: string }>();
  if (!channel) throw Object.assign(new Error("resource_not_selected"), { status: "failed", code: "resource_not_selected" });
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "contentDetails");
  channelUrl.searchParams.set("id", channelId);
  const channelPayload = await googleJson(fetchGoogle, channelUrl, accessToken) as { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> };
  const uploads = channelPayload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw Object.assign(new Error("uploads_playlist_unavailable"), { status: "failed", code: "uploads_playlist_unavailable" });

  const videoIds: string[] = [];
  let pageToken = "";
  do {
    const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    playlistUrl.searchParams.set("part", "contentDetails");
    playlistUrl.searchParams.set("playlistId", uploads);
    playlistUrl.searchParams.set("maxResults", "50");
    if (pageToken) playlistUrl.searchParams.set("pageToken", pageToken);
    const payload = await googleJson(fetchGoogle, playlistUrl, accessToken) as { items?: Array<{ contentDetails?: { videoId?: string } }>; nextPageToken?: string };
    for (const item of payload.items ?? []) if (item.contentDetails?.videoId) videoIds.push(item.contentDetails.videoId);
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  const statements: D1PreparedStatement[] = [];
  for (let index = 0; index < videoIds.length; index += 50) {
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,contentDetails");
    videosUrl.searchParams.set("id", videoIds.slice(index, index + 50).join(","));
    const payload = await googleJson(fetchGoogle, videosUrl, accessToken) as { items?: Array<{ id?: string; snippet?: { title?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } }; contentDetails?: { duration?: string } }> };
    for (const item of payload.items ?? []) {
      if (!item.id) continue;
      const title = item.snippet?.title?.slice(0, 500) || item.id;
      const thumbnail = item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? null;
      statements.push(env.DB.prepare("INSERT INTO youtube_analytics_videos (id, channel_id, youtube_video_id, title, published_at, thumbnail_url, raw_metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(channel_id, youtube_video_id) DO UPDATE SET title = excluded.title, published_at = excluded.published_at, thumbnail_url = excluded.thumbnail_url, raw_metadata_json = excluded.raw_metadata_json, updated_at = excluded.updated_at").bind(id("ytvd"), channel.id, item.id, title, item.snippet?.publishedAt ?? null, thumbnail, JSON.stringify(item), now, now));
    }
  }
  await batch(env.DB, statements);
  return { channelKey: channel.id, videos: statements.length };
}

type YouTubeReport = { columnHeaders?: Array<{ name?: string }>; rows?: unknown[][] };
function reportRows(payload: YouTubeReport): Array<Record<string, unknown>> {
  const names = (payload.columnHeaders ?? []).map((column) => column.name ?? "unknown");
  return (payload.rows ?? []).map((row) => Object.fromEntries(names.map((name, index) => [name, row[index]])));
}

async function youtubeReport(fetchGoogle: typeof fetch, accessToken: string, startDate: string, endDate: string, dimensions: string): Promise<Array<Record<string, unknown>>> {
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", "channel==MINE");
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("dimensions", dimensions);
  url.searchParams.set("metrics", "views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost");
  url.searchParams.set("sort", dimensions);
  return reportRows(await googleJson(fetchGoogle, url, accessToken) as YouTubeReport);
}

async function syncYouTube(env: AnalyticsEnv, connection: SyncConnection, accessToken: string, fetchGoogle: typeof fetch, startDate: string, endDate: string, now: string): Promise<number> {
  const catalogue = await syncYouTubeCatalogue(env, connection, accessToken, fetchGoogle, now);
  const [channelRows, videoRows] = await Promise.all([
    youtubeReport(fetchGoogle, accessToken, startDate, endDate, "day"),
    youtubeReport(fetchGoogle, accessToken, startDate, endDate, "day,video"),
  ]);
  const statements: D1PreparedStatement[] = [];
  for (const row of channelRows) {
    statements.push(env.DB.prepare("INSERT INTO youtube_channel_daily_metrics (channel_id, metric_date, views, watch_minutes, average_view_duration_seconds, likes, comments_count, shares, subscribers_gained, subscribers_lost, raw_analytics_json, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(channel_id, metric_date) DO UPDATE SET views = excluded.views, watch_minutes = excluded.watch_minutes, average_view_duration_seconds = excluded.average_view_duration_seconds, likes = excluded.likes, comments_count = excluded.comments_count, shares = excluded.shares, subscribers_gained = excluded.subscribers_gained, subscribers_lost = excluded.subscribers_lost, raw_analytics_json = excluded.raw_analytics_json, observed_at = excluded.observed_at").bind(catalogue.channelKey, row.day, numberOrNull(row.views), numberOrNull(row.estimatedMinutesWatched), numberOrNull(row.averageViewDuration), numberOrNull(row.likes), numberOrNull(row.comments), numberOrNull(row.shares), numberOrNull(row.subscribersGained), numberOrNull(row.subscribersLost), JSON.stringify(row), now));
  }
  for (const row of videoRows) {
    statements.push(env.DB.prepare("INSERT INTO youtube_video_daily_metrics (video_id, metric_date, views, watch_minutes, average_view_duration_seconds, likes, comments_count, shares, subscribers_gained, subscribers_lost, raw_analytics_json, observed_at) SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM youtube_analytics_videos WHERE channel_id = ? AND youtube_video_id = ? ON CONFLICT(video_id, metric_date) DO UPDATE SET views = excluded.views, watch_minutes = excluded.watch_minutes, average_view_duration_seconds = excluded.average_view_duration_seconds, likes = excluded.likes, comments_count = excluded.comments_count, shares = excluded.shares, subscribers_gained = excluded.subscribers_gained, subscribers_lost = excluded.subscribers_lost, raw_analytics_json = excluded.raw_analytics_json, observed_at = excluded.observed_at").bind(row.day, numberOrNull(row.views), numberOrNull(row.estimatedMinutesWatched), numberOrNull(row.averageViewDuration), numberOrNull(row.likes), numberOrNull(row.comments), numberOrNull(row.shares), numberOrNull(row.subscribersGained), numberOrNull(row.subscribersLost), JSON.stringify(row), now, catalogue.channelKey, row.video));
  }
  await batch(env.DB, statements);
  await env.DB.prepare("UPDATE youtube_analytics_channels SET last_synced_at = ?, updated_at = ? WHERE id = ?").bind(now, now, catalogue.channelKey).run();
  return catalogue.videos + statements.length;
}

type Ga4Response = {
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string }>;
  rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>;
};

function ga4Rows(payload: Ga4Response): Array<Record<string, unknown>> {
  const dimensions = (payload.dimensionHeaders ?? []).map((header) => header.name ?? "dimension");
  const metrics = (payload.metricHeaders ?? []).map((header) => header.name ?? "metric");
  return (payload.rows ?? []).map((row) => Object.fromEntries([
    ...dimensions.map((name, index) => [name, row.dimensionValues?.[index]?.value]),
    ...metrics.map((name, index) => [name, row.metricValues?.[index]?.value]),
  ]));
}

function ga4Date(value: unknown): string | null {
  const text = String(value ?? "");
  return /^\d{8}$/u.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : null;
}

async function syncGa4(env: AnalyticsEnv, connection: SyncConnection, accessToken: string, fetchGoogle: typeof fetch, startDate: string, endDate: string, now: string): Promise<number> {
  const property = await env.DB.prepare("SELECT id FROM ga4_analytics_properties WHERE connection_id = ? AND ga4_property_id = ? AND active = 1").bind(connection.id, connection.selected_resource_id).first<{ id: string }>();
  if (!property) throw Object.assign(new Error("resource_not_selected"), { status: "failed", code: "resource_not_selected" });
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${connection.selected_resource_id}:runReport`;
  const metrics = [{ name: "activeUsers" }, { name: "sessions" }, { name: "engagedSessions" }, { name: "engagementRate" }];
  const [totalsPayload, sourcesPayload] = await Promise.all([
    googleJson(fetchGoogle, endpoint, accessToken, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ dateRanges: [{ startDate, endDate }], dimensions: [{ name: "date" }], metrics, limit: 100000 }),
    }),
    googleJson(fetchGoogle, endpoint, accessToken, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ dateRanges: [{ startDate, endDate }], dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }], metrics, limit: 100000 }),
    }),
  ]);
  const totalRows = ga4Rows(totalsPayload as Ga4Response);
  const sourceRows = ga4Rows(sourcesPayload as Ga4Response);
  const statements: D1PreparedStatement[] = [];
  for (const row of sourceRows) {
    const date = ga4Date(row.date);
    if (!date) continue;
    const users = numberOrNull(row.activeUsers) ?? 0;
    const sessions = numberOrNull(row.sessions) ?? 0;
    const engaged = numberOrNull(row.engagedSessions) ?? 0;
    const source = String(row.sessionDefaultChannelGroup || "(unassigned)").slice(0, 160);
    statements.push(env.DB.prepare("INSERT INTO ga4_daily_metrics (property_id, metric_date, traffic_source, users, sessions, engaged_sessions, engagement_rate, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(property_id, metric_date, traffic_source) DO UPDATE SET users = excluded.users, sessions = excluded.sessions, engaged_sessions = excluded.engaged_sessions, engagement_rate = excluded.engagement_rate, observed_at = excluded.observed_at").bind(property.id, date, source, users, sessions, engaged, numberOrNull(row.engagementRate), now));
  }
  // User counts are non-additive across traffic-source dimensions. Store a
  // second no-source report for truthful daily totals instead of summing rows.
  for (const row of totalRows) {
    const date = ga4Date(row.date);
    if (!date) continue;
    statements.push(env.DB.prepare("INSERT INTO ga4_daily_metrics (property_id, metric_date, traffic_source, users, sessions, engaged_sessions, engagement_rate, observed_at) VALUES (?, ?, '(all)', ?, ?, ?, ?, ?) ON CONFLICT(property_id, metric_date, traffic_source) DO UPDATE SET users = excluded.users, sessions = excluded.sessions, engaged_sessions = excluded.engaged_sessions, engagement_rate = excluded.engagement_rate, observed_at = excluded.observed_at").bind(property.id, date, numberOrNull(row.activeUsers), numberOrNull(row.sessions), numberOrNull(row.engagedSessions), numberOrNull(row.engagementRate), now));
  }
  await batch(env.DB, statements);
  await env.DB.prepare("UPDATE ga4_analytics_properties SET last_synced_at = ?, updated_at = ? WHERE id = ?").bind(now, now, property.id).run();
  return statements.length;
}

export async function syncAnalyticsConnection(env: AnalyticsEnv, connection: SyncConnection, startDate: string, endDate: string, dependencies: AnalyticsDependencies = {}): Promise<SyncResult> {
  const now = (dependencies.now?.() ?? new Date()).toISOString();
  const runId = id("asyn");
  await env.DB.prepare("INSERT INTO analytics_sync_runs (id, connection_id, resource_id, provider, requested_start_date, requested_end_date, status, attempt_count, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'running', 1, ?, ?, ?) ON CONFLICT(connection_id, resource_id, requested_start_date, requested_end_date) DO UPDATE SET status = 'running', attempt_count = analytics_sync_runs.attempt_count + 1, started_at = excluded.started_at, last_error_code = NULL, updated_at = excluded.updated_at").bind(runId, connection.id, connection.selected_resource_id, connection.provider, startDate, endDate, now, now, now).run();
  await env.DB.prepare("UPDATE analytics_provider_connections SET status = 'syncing', last_attempted_refresh_at = ?, updated_at = ? WHERE id = ?").bind(now, now, connection.id).run();
  try {
    if (!connection.selected_resource_id) throw Object.assign(new Error("resource_not_selected"), { status: "failed", code: "resource_not_selected" });
    const accessToken = await refreshAnalyticsAccessToken(connection, env, dependencies);
    const fetchGoogle = dependencies.fetchGoogle ?? fetch;
    const rows = connection.provider === "youtube"
      ? await syncYouTube(env, connection, accessToken, fetchGoogle, startDate, endDate, now)
      : await syncGa4(env, connection, accessToken, fetchGoogle, startDate, endDate, now);
    await env.DB.batch([
      env.DB.prepare("UPDATE analytics_sync_runs SET status = 'completed', completed_at = ?, updated_at = ? WHERE connection_id = ? AND resource_id = ? AND requested_start_date = ? AND requested_end_date = ?").bind(now, now, connection.id, connection.selected_resource_id, startDate, endDate),
      env.DB.prepare("UPDATE analytics_provider_connections SET status = 'connected', last_successful_refresh_at = ?, last_error_code = NULL, updated_at = ? WHERE id = ?").bind(now, now, connection.id),
    ]);
    return { connectionId: connection.id, provider: connection.provider, status: "completed", rows };
  } catch (cause) {
    const error = cause as { status?: SyncResult["status"]; code?: string; message?: string };
    const resultStatus = error.status === "retryable" ? "retryable" : "failed";
    const code = error.code ?? error.message ?? "analytics_sync_failed";
    const run = await env.DB.prepare("SELECT attempt_count FROM analytics_sync_runs WHERE connection_id = ? AND resource_id = ? AND requested_start_date = ? AND requested_end_date = ?").bind(connection.id, connection.selected_resource_id, startDate, endDate).first<{ attempt_count: number }>();
    const attempt = Math.max(1, Math.min(run?.attempt_count ?? 1, 8));
    const baseDelay = Math.min(6 * 60 * 60_000, 15 * 60_000 * 2 ** (attempt - 1));
    const jitter = crypto.getRandomValues(new Uint32Array(1))[0] % Math.max(1, Math.floor(baseDelay / 5));
    const nextRetry = resultStatus === "retryable" ? new Date(Date.parse(now) + baseDelay + jitter).toISOString() : null;
    const connectionStatus = code === "credential_revoked" || code === "token_refresh_failed"
      ? "expired"
      : code === "missing_permission"
        ? "missing_scope"
        : resultStatus === "retryable" && connection.last_successful_refresh_at
          ? "stale"
          : "provider_error";
    await env.DB.batch([
      env.DB.prepare("UPDATE analytics_sync_runs SET status = ?, next_retry_at = ?, last_error_code = ?, completed_at = ?, updated_at = ? WHERE connection_id = ? AND resource_id = ? AND requested_start_date = ? AND requested_end_date = ?").bind(resultStatus, nextRetry, code, now, now, connection.id, connection.selected_resource_id, startDate, endDate),
      env.DB.prepare("UPDATE analytics_provider_connections SET status = ?, last_error_code = ?, updated_at = ? WHERE id = ?").bind(connectionStatus, code, now, connection.id),
    ]);
    return { connectionId: connection.id, provider: connection.provider, status: resultStatus, rows: 0, errorCode: code };
  }
}

export async function syncConfiguredAnalytics(env: AnalyticsEnv, scheduledAt = new Date(), dependencies: AnalyticsDependencies = {}): Promise<SyncResult[]> {
  if (env.OPS_ENVIRONMENT === "production") return [];
  const end = new Date(scheduledAt.getTime() - dayMs);
  const start = new Date(end.getTime() - 6 * dayMs);
  const result = await env.DB.prepare("SELECT id, environment, provider, status, encrypted_credentials, granted_scopes_json, token_expires_at, selected_resource_id, selected_resource_name, reporting_timezone, last_attempted_refresh_at, last_successful_refresh_at, last_error_code FROM analytics_provider_connections WHERE environment = ? AND status IN ('connected', 'stale', 'provider_error') AND encrypted_credentials IS NOT NULL AND selected_resource_id IS NOT NULL ORDER BY provider").bind(env.OPS_ENVIRONMENT).all<SyncConnection>();
  const summaries: SyncResult[] = [];
  for (const connection of result.results) summaries.push(await syncAnalyticsConnection(env, connection, isoDate(start), isoDate(end), { ...dependencies, now: () => scheduledAt }));
  return summaries;
}
