import "server-only";

import {
  isSocialPlatform,
  type SocialAccount,
  type SocialDashboard,
  type SocialMetricTotals,
  type SocialPlatform,
} from "@/lib/social-analytics/contracts";

const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

type JsonRecord = Record<string, unknown>;

export class ZernioError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ZernioError";
  }
}
function configuration() {
  const apiKey = process.env.ZERNIO_API_KEY?.trim();
  const profileId = process.env.ZERNIO_PROFILE_ID?.trim();
  if (!apiKey || !profileId) {
    throw new ZernioError("Social analytics is not configured locally.", 503, "not_configured");
  }
  return { apiKey, profileId };
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function listPayload(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = record(payload);
  if (Array.isArray(root[key])) return root[key] as unknown[];
  const data = record(root.data);
  if (Array.isArray(data[key])) return data[key] as unknown[];
  return Array.isArray(root.data) ? root.data as unknown[] : [];
}

async function zernioFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { apiKey } = configuration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${apiKey}`);
    headers.set("accept", "application/json");
    if (init?.body) headers.set("content-type", "application/json");
    const response = await fetch(`${ZERNIO_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const body = record(payload);
      const providerMessage = stringValue(body.message) ?? stringValue(body.error);
      const message = providerMessage ?? (
        response.status === 402 || response.status === 403
          ? "This Zernio feature is not enabled for the workspace."
          : "Zernio could not complete this request."
      );
      throw new ZernioError(message, response.status, `provider_${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof ZernioError) throw error;
    const message = error instanceof Error && error.name === "AbortError"
      ? "Zernio took too long to respond."
      : "Could not reach Zernio.";
    throw new ZernioError(message, 502, "provider_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTotals(value: unknown): SocialMetricTotals {
  const source = record(value);
  return {
    impressions: numberValue(source.impressions),
    reach: numberValue(source.reach),
    likes: numberValue(source.likes),
    comments: numberValue(source.comments),
    shares: numberValue(source.shares),
    saves: numberValue(source.saves),
    clicks: numberValue(source.clicks),
    views: numberValue(source.views),
    engagementRate: numberValue(source.engagementRate),
  };
}

export function socialAnalyticsConfigured(): boolean {
  return Boolean(process.env.ZERNIO_API_KEY?.trim() && process.env.ZERNIO_PROFILE_ID?.trim());
}

export function socialAnalyticsLocalEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SOCIAL_ANALYTICS_LOCAL_ENABLED === "1";
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  const { profileId } = configuration();
  const payload = await zernioFetch(`/accounts?profileId=${encodeURIComponent(profileId)}`);
  const candidates = listPayload(payload, "accounts");
  const accounts = candidates.flatMap((value): SocialAccount[] => {
    const source = record(value);
    if (!isSocialPlatform(source.platform)) return [];
    const id = stringValue(source._id) ?? stringValue(source.id);
    if (!id) return [];
    return [{
      id,
      platform: source.platform,
      username: stringValue(source.username),
      displayName: stringValue(source.displayName),
      profileUrl: stringValue(source.profileUrl),
      isActive: booleanValue(source.isActive) ?? true,
      hasAnalyticsAccess: booleanValue(source.hasAnalyticsAccess),
      health: "unknown",
      healthMessage: null,
    }];
  });

  return Promise.all(accounts.map(async (account) => {
    try {
      const healthPayload = record(await zernioFetch(`/accounts/${encodeURIComponent(account.id)}/health`));
      const health = record(healthPayload.health ?? healthPayload.data ?? healthPayload);
      const permissions = record(health.permissions);
      const status = stringValue(health.status);
      const analyticsAllowed = booleanValue(permissions.canFetchAnalytics);
      const issues = arrayValue(health.issues).map((item) => stringValue(record(item).message) ?? stringValue(item)).filter(Boolean);
      return {
        ...account,
        hasAnalyticsAccess: analyticsAllowed ?? account.hasAnalyticsAccess,
        health: status === "healthy" && analyticsAllowed !== false ? "connected" as const : "attention" as const,
        healthMessage: issues[0] ?? (analyticsAllowed === false ? "Analytics permission needs attention." : null),
      };
    } catch {
      return account;
    }
  }));
}

export async function createConnectionUrl(platform: SocialPlatform, redirectUrl: string): Promise<string> {
  const { profileId } = configuration();
  const query = new URLSearchParams({ profileId, redirect_url: redirectUrl });
  const payload = record(await zernioFetch(`/connect/${platform}?${query.toString()}`));
  const data = record(payload.data);
  const authUrl = stringValue(payload.authUrl) ?? stringValue(data.authUrl);
  if (!authUrl) throw new ZernioError("Zernio did not return a connection URL.", 502, "missing_auth_url");
  const parsed = new URL(authUrl);
  if (parsed.protocol !== "https:") throw new ZernioError("Zernio returned an invalid connection URL.", 502, "invalid_auth_url");
  return authUrl;
}

export async function getSocialDashboard(input: {
  platform: SocialPlatform | "all";
  fromDate: string;
  toDate: string;
}): Promise<SocialDashboard> {
  const { profileId } = configuration();
  const query = new URLSearchParams({
    profileId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    compare: "previous_period",
    topPosts: "8",
    recentPosts: "6",
  });
  if (input.platform !== "all") query.set("platform", input.platform);
  const raw = record(await zernioFetch(`/analytics/dashboard?${query.toString()}`));
  const payload = record(raw.data ?? raw);
  const dates = record(payload.dateRange);
  const followers = record(payload.followers);

  return {
    platform: input.platform,
    dateRange: {
      fromDate: stringValue(dates.fromDate) ?? input.fromDate,
      toDate: stringValue(dates.toDate) ?? input.toDate,
    },
    totals: normalizeTotals(payload.totals),
    followers: {
      current: numberValue(followers.current),
      gained: numberValue(followers.gained),
    },
    daily: arrayValue(payload.daily).map((value) => {
      const day = record(value);
      return {
        date: stringValue(day.date) ?? "",
        impressions: numberValue(day.impressions),
        reach: numberValue(day.reach),
        engagement: numberValue(day.engagement),
        views: numberValue(day.views),
        followersGained: numberValue(day.followersGained),
      };
    }).filter((day) => day.date),
    topPosts: arrayValue(payload.topPosts).flatMap((value) => {
      const post = record(value);
      if (!isSocialPlatform(post.platform)) return [];
      return [{
        postId: stringValue(post.postId) ?? "unknown",
        platform: post.platform,
        publishedAt: stringValue(post.publishedAt),
        text: stringValue(post.text) ?? stringValue(post.caption),
        metrics: normalizeTotals(post.metrics),
      }];
    }),
    dataAsOf: stringValue(payload.dataAsOf),
  };
}
