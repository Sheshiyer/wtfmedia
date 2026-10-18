import { isSocialPlatform, type SocialAccount, type SocialDashboard, type SocialMetricTotals, type SocialPlatform, } from "./social-analytics-contracts.ts";
const ZERNIO_BASE_URL = "https://zernio.com/api/v1";
type JsonRecord = Record<string, unknown>;
export class ZernioError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(message: string, status: number, code: string) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "ZernioError";
    }
}
function record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function stringValue(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}
function numberValue(value: unknown): number | null {
    if (typeof value !== "number" && (typeof value !== "string" || !value.trim()))
        return null;
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
    if (Array.isArray(payload))
        return payload;
    const root = record(payload);
    if (Array.isArray(root[key]))
        return root[key] as unknown[];
    const data = record(root.data);
    if (Array.isArray(data[key]))
        return data[key] as unknown[];
    return Array.isArray(root.data) ? root.data as unknown[] : [];
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
export type SocialProviderEnv = {
    ZERNIO_API_KEY?: string;
    ZERNIO_PROFILE_ID?: string;
    SOCIAL_ANALYTICS_ENABLED?: string;
};
export function createSocialProvider(env: SocialProviderEnv, fetcher: typeof fetch = fetch, deadline = Date.now() + 60000) {
    let requests = 0;
    async function zernioFetch(path: string, retry = true): Promise<unknown> {
        if (!env.ZERNIO_API_KEY?.trim())
            throw new ZernioError('Social analytics is not configured.', 503, 'not_configured');
        if (++requests > 12 || Date.now() >= deadline)
            throw new ZernioError('Query limit reached. Narrow the dates or platforms.', 429, 'query_budget');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.min(15000, Math.max(1, deadline - Date.now())));
        try {
            const response = await fetcher(`${ZERNIO_BASE_URL}${path}`, { headers: new Headers({ authorization: `Bearer ${env.ZERNIO_API_KEY}`, accept: 'application/json' }), signal: controller.signal, cache: 'no-store' });
            if (response.status === 202)
                throw new ZernioError('Analytics synchronization is pending.', 202, 'sync_pending');
            if (!response.ok) {
                if (retry && [429, 502, 503, 504].includes(response.status) && requests < 12 && Date.now() + 1000 < deadline)
                    return await zernioFetch(path, false);
                const message = response.status === 402 ? 'Analytics add-on is unavailable.' : response.status === 401 || response.status === 403 ? 'Analytics permission is missing. Ask an admin to reconnect.' : 'Provider analytics are unavailable.';
                throw new ZernioError(message, response.status, `provider_${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof ZernioError)
                throw error;
            throw new ZernioError(controller.signal.aborted ? 'Analytics request timed out.' : 'Could not reach analytics provider.', 502, 'provider_unavailable');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async function profiles() {
        return listPayload(await zernioFetch('/profiles'), 'profiles').flatMap(value => {
            const p = record(value);
            const id = stringValue(p._id) ?? stringValue(p.id);
            return id ? [{ id, name: stringValue(p.name) ?? 'Workspace' }] : [];
        });
    }
    async function accounts(profileId: string, includeHealth = false): Promise<SocialAccount[]> {
        const payload = await zernioFetch(`/accounts?profileId=${encodeURIComponent(profileId)}`);
        const candidates = listPayload(payload, "accounts");
        const accounts = candidates.flatMap((value): SocialAccount[] => {
            const source = record(value);
            if (!isSocialPlatform(source.platform))
                return [];
            const id = stringValue(source._id) ?? stringValue(source.id);
            if (!id)
                return [];
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
        if (!includeHealth)
            return accounts;
        return Promise.all(accounts.slice(0, 8).map(async (account) => {
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
            }
            catch {
                return account;
            }
        }));
    }
    async function connect(profileId: string, platform: SocialPlatform, redirectUrl: string): Promise<string> {
        const query = new URLSearchParams({ profileId, redirect_url: redirectUrl });
        const payload = record(await zernioFetch(`/connect/${platform}?${query.toString()}`, false));
        const data = record(payload.data);
        const authUrl = stringValue(payload.authUrl) ?? stringValue(data.authUrl);
        if (!authUrl)
            throw new ZernioError("Zernio did not return a connection URL.", 502, "missing_auth_url");
        const parsed = new URL(authUrl);
        if (parsed.protocol !== "https:")
            throw new ZernioError("Zernio returned an invalid connection URL.", 502, "invalid_auth_url");
        return authUrl;
    }
    async function dashboard(profileId: string, input: {
        platform: SocialPlatform | "all";
        fromDate: string;
        toDate: string;
    }): Promise<SocialDashboard> {
        const query = new URLSearchParams({
            profileId,
            fromDate: input.fromDate,
            toDate: input.toDate,
            compare: "previous_period",
            topPosts: "8",
            recentPosts: "6",
        });
        if (input.platform !== "all")
            query.set("platform", input.platform);
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
                if (!isSocialPlatform(post.platform))
                    return [];
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
    async function posts(profileId: string, input: {
        platform?: SocialPlatform;
        fromDate: string;
        toDate: string;
        sortBy?: string;
        order?: string;
        page?: number;
    }) {
        const query = new URLSearchParams({ profileId, fromDate: input.fromDate, toDate: input.toDate, limit: '100', page: String(input.page ?? 1), sortBy: input.sortBy ?? 'date', order: input.order ?? 'desc' });
        if (input.platform)
            query.set('platform', input.platform);
        const payload = record(await zernioFetch(`/analytics?${query}`));
        const data = record(payload.data ?? payload);
        const rows = listPayload(payload, 'posts');
        const pagination = record(data.pagination ?? payload.pagination);
        const totalPages = numberValue(pagination.pages) ?? numberValue(pagination.totalPages);
        const total = numberValue(pagination.total);
        const page = input.page ?? 1;
        const complete = totalPages !== null ? page >= totalPages : total !== null ? page * 100 >= total : rows.length < 100;
        return { posts: rows.flatMap(normalizePost), complete };
    }
    return { profiles, accounts, connect, dashboard, posts };
}
export type SocialProvider = ReturnType<typeof createSocialProvider>;
export type SocialPost = {
    id: string;
    platform: SocialPlatform;
    accountId: string | null;
    label: string;
    url?: string;
    publishedAt: string | null;
    dataAsOf: string | null;
    metrics: SocialMetricTotals;
};
export function safeSocialUrl(value: unknown): string | undefined {
    if (typeof value !== 'string')
        return;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
    }
    catch {
        return;
    }
}
function normalizePost(value: unknown): SocialPost[] {
    const post = record(value);
    const id = stringValue(post.postId) ?? stringValue(post._id) ?? stringValue(post.id);
    if (!id)
        return [];
    const items = post.platformAnalytics ?? post.platforms;
    const variants = Array.isArray(items) && items.length ? items : [post];
    return variants.flatMap(value => {
        const variant = record(value);
        if (!isSocialPlatform(variant.platform))
            return [];
        const rawMetrics = record(variant.analytics ?? variant.metrics);
        const pending = variant.syncStatus === 'pending' || variant.syncStatus === 'failed' || variant.status === 'failed';
        return [{ id, platform: variant.platform, accountId: stringValue(variant.accountId), label: (stringValue(post.content) ?? stringValue(post.text) ?? `Post ${id}`).slice(0, 240),
                url: safeSocialUrl(variant.platformPostUrl), publishedAt: stringValue(post.publishedAt), dataAsOf: stringValue(rawMetrics.lastUpdated), metrics: normalizeTotals(pending ? {} : rawMetrics) }];
    });
}
