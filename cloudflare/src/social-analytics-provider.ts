import { isSocialPlatform, type LinkedInOrganization, type SocialAccount, type SocialDashboard, type SocialMetricTotals, type SocialPlatform, } from "./social-analytics-contracts.ts";
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
function safeHttpsUrl(value: unknown): string | null {
    const url = safeSocialUrl(value);
    return url ?? null;
}
function safeThumbnailUrl(value: unknown): string | null {
    const url = safeHttpsUrl(value);
    if (!url) return null;
    const host = new URL(url).hostname.toLowerCase();
    return ['cdninstagram.com', 'fbcdn.net'].some(domain => host === domain || host.endsWith(`.${domain}`)) ? url : null;
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
export function defaultSocialProfile<T extends { isDefault?: boolean }>(profiles: T[]): T | undefined {
    if (profiles.length === 1) return profiles[0];
    const defaults = profiles.filter(profile => profile.isDefault === true);
    return defaults.length === 1 ? defaults[0] : undefined;
}
export function createSocialProvider(env: SocialProviderEnv, fetcher: typeof fetch = fetch, deadline = Date.now() + 60000) {
    let requests = 0;
    async function zernioFetch(path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; retry?: boolean } = {}): Promise<unknown> {
        if (!env.ZERNIO_API_KEY?.trim())
            throw new ZernioError('Social analytics is not configured.', 503, 'not_configured');
        if (++requests > 12 || Date.now() >= deadline)
            throw new ZernioError('Query limit reached. Narrow the dates or platforms.', 429, 'query_budget');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.min(15000, Math.max(1, deadline - Date.now())));
        try {
            const response = await fetcher(`${ZERNIO_BASE_URL}${path}`, { method: options.method ?? 'GET', headers: new Headers({ authorization: `Bearer ${env.ZERNIO_API_KEY}`, accept: 'application/json', ...(options.body === undefined ? {} : { 'content-type': 'application/json' }) }), ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }), signal: controller.signal, cache: 'no-store' });
            if (response.status === 202)
                throw new ZernioError('Analytics synchronization is pending.', 202, 'sync_pending');
            if (!response.ok) {
                if (options.method === undefined && options.retry !== false && [429, 502, 503, 504].includes(response.status) && requests < 12 && Date.now() + 1000 < deadline)
                    return await zernioFetch(path, { retry: false });
                const message = response.status === 402 ? 'Analytics add-on is unavailable.' : response.status === 401 || response.status === 403 ? 'Analytics permission is missing. Ask an admin to reconnect.' : 'Provider analytics are unavailable.';
                throw new ZernioError(message, response.status, `provider_${response.status}`);
            }
            if (response.status === 204) return {};
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
        const payload = await zernioFetch('/profiles');
        const root = record(payload), data = record(root.data);
        if (![payload, root.profiles, root.data, data.profiles].some(Array.isArray))
            throw new ZernioError('Zernio did not return a profile list.', 502, 'invalid_profiles_response');
        return listPayload(payload, 'profiles').flatMap(value => {
            const p = record(value);
            const id = stringValue(p._id) ?? stringValue(p.id);
            return id ? [{ id, name: stringValue(p.name) ?? 'Workspace', isDefault: p.isDefault === true }] : [];
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
            const accountType = stringValue(record(source.metadata).accountType);
            return [{
                    id,
                    platform: source.platform,
                    accountType: source.platform === 'linkedin' && (accountType === 'personal' || accountType === 'organization') ? accountType : null,
                    username: stringValue(source.username),
                    displayName: stringValue(source.displayName),
                    profileUrl: stringValue(source.profileUrl),
                    isActive: booleanValue(source.isActive) ?? true,
                    hasAnalyticsAccess: booleanValue(source.hasAnalyticsAccess),
                    health: "unknown",
                    healthMessage: null,
                    analyticsSyncStatus: null,
                    analyticsNote: source.platform === 'linkedin' && accountType === 'personal' ? 'LinkedIn personal analytics cover posts published through Zernio or imported by post URL.' : null,
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
                const analyticsSync = record(health.analyticsSync);
                const issues = arrayValue(health.issues).map((item) => stringValue(record(item).message) ?? stringValue(item)).filter(Boolean);
                return {
                    ...account,
                    hasAnalyticsAccess: analyticsAllowed ?? account.hasAnalyticsAccess,
                    health: status === "healthy" && analyticsAllowed !== false ? "connected" as const : "attention" as const,
                    healthMessage: issues[0] ?? (analyticsAllowed === false ? "Analytics permission needs attention." : null),
                    analyticsSyncStatus: stringValue(analyticsSync.status),
                };
            }
            catch {
                return account;
            }
        }));
    }
    async function connect(profileId: string, platform: SocialPlatform, redirectUrl: string): Promise<string> {
        const query = new URLSearchParams({ profileId, redirect_url: redirectUrl });
        const payload = record(await zernioFetch(`/connect/${platform}?${query.toString()}`, { retry: false }));
        const data = record(payload.data);
        const authUrl = stringValue(payload.authUrl) ?? stringValue(data.authUrl);
        if (!authUrl)
            throw new ZernioError("Zernio did not return a connection URL.", 502, "missing_auth_url");
        const parsed = new URL(authUrl);
        if (parsed.protocol !== "https:")
            throw new ZernioError("Zernio returned an invalid connection URL.", 502, "invalid_auth_url");
        return authUrl;
    }
    async function linkedInOrganizations(profileId: string, accountId: string): Promise<LinkedInOrganization[]> {
        const account = (await accounts(profileId)).find(a => a.id === accountId && a.isActive && a.platform === 'linkedin');
        if (!account) throw new ZernioError('This LinkedIn connection is not available in the selected workspace.', 404, 'account_not_found');
        const payload = await zernioFetch(`/accounts/${encodeURIComponent(accountId)}/linkedin-organizations`);
        return listPayload(payload, 'organizations').flatMap(value => {
            const item = record(value);
            const id = stringValue(item.id), name = stringValue(item.name) ?? stringValue(item.localizedName);
            return id && name ? [{ id, name, vanityName: stringValue(item.vanityName) }] : [];
        });
    }
    async function selectLinkedInOrganization(profileId: string, accountId: string, organizationId: string): Promise<{ postsSync: 'complete' | 'pending' }> {
        const organization = (await linkedInOrganizations(profileId, accountId)).find(item => item.id === organizationId);
        if (!organization) throw new ZernioError('Choose a company page you administer.', 400, 'organization_not_found');
        await zernioFetch(`/accounts/${encodeURIComponent(accountId)}/linkedin-organization`, { method: 'PUT', body: { accountType: 'organization', selectedOrganization: { id: organization.id, urn: `urn:li:organization:${organization.id}`, name: organization.name, ...(organization.vanityName ? { vanityName: organization.vanityName } : {}) } } });
        try {
            const result = record(await zernioFetch('/posts/sync-external', { method: 'POST', body: { accountId } }));
            return { postsSync: record(result.synced).skipped === true ? 'pending' : 'complete' };
        } catch {
            return { postsSync: 'pending' };
        }
    }
    async function disconnectAccount(profileId: string, accountId: string): Promise<void> {
        const account = (await accounts(profileId)).find(a => a.id === accountId && a.isActive);
        if (!account) throw new ZernioError('This connection is not available in the selected workspace.', 404, 'account_not_found');
        await zernioFetch(`/accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' });
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
        const summaries = arrayValue(payload.topPosts).flatMap(value => {
            const post = record(value);
            if (!isSocialPlatform(post.platform)) return [];
            return [{ postId: stringValue(post.postId) ?? 'unknown', platform: post.platform, publishedAt: stringValue(post.publishedAt), text: stringValue(post.text) ?? stringValue(post.caption), thumbnailUrl: null, postUrl: null, metrics: normalizeTotals(post.metrics) }];
        });
        let details = new Map<string, JsonRecord>();
        if (summaries.length) {
            try {
                const query = new URLSearchParams({ profileId, fromDate: input.fromDate, toDate: input.toDate, source: 'all', limit: '100', page: '1' });
                if (input.platform !== 'all') query.set('platform', input.platform);
                const payload = await zernioFetch(`/analytics?${query}`);
                details = new Map(listPayload(payload, 'posts').flatMap(value => {
                    const post = record(value);
                    return [stringValue(post._id), stringValue(post.postId), stringValue(post.latePostId)].filter((id): id is string => Boolean(id)).map(id => [id, post] as [string, JsonRecord]);
                }));
            } catch { /* Optional post enrichment must not hide aggregate metrics. */ }
        }
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
            topPosts: summaries.map(post => {
                const detail = details.get(post.postId) ?? {};
                const media = record(arrayValue(detail.mediaItems)[0]);
                return { ...post, text: stringValue(detail.content) ?? stringValue(detail.text) ?? stringValue(detail.caption) ?? post.text, thumbnailUrl: safeThumbnailUrl(detail.thumbnailUrl) ?? safeThumbnailUrl(media.thumbnail) ?? safeThumbnailUrl(media.url), postUrl: safeHttpsUrl(detail.platformPostUrl) };
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
    return { profiles, accounts, connect, dashboard, posts, linkedInOrganizations, selectLinkedInOrganization, disconnectAccount };
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
