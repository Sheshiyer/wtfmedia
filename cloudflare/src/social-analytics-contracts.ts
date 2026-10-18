export const SOCIAL_PLATFORMS = ["linkedin", "instagram", "facebook", "twitter"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type PlatformDefinition = {
    id: SocialPlatform;
    label: string;
    description: string;
};
export const PLATFORM_DEFINITIONS: readonly PlatformDefinition[] = [
    {
        id: "linkedin",
        label: "LinkedIn",
        description: "Company page and professional audience performance.",
    },
    {
        id: "instagram",
        label: "Instagram",
        description: "Reach, saves, shares, reels, and follower momentum.",
    },
    {
        id: "facebook",
        label: "Facebook",
        description: "Page distribution, clicks, engagement, and audience growth.",
    },
    {
        id: "twitter",
        label: "X (Twitter)",
        description: "Post impressions, conversation signals, and follower change.",
    },
] as const;
export function isSocialPlatform(value: unknown): value is SocialPlatform {
    return typeof value === "string" && SOCIAL_PLATFORMS.includes(value as SocialPlatform);
}
export type SocialAccount = {
    id: string;
    platform: SocialPlatform;
    username: string | null;
    displayName: string | null;
    profileUrl: string | null;
    isActive: boolean;
    hasAnalyticsAccess: boolean | null;
    health: "connected" | "attention" | "unknown";
    healthMessage: string | null;
};
export type SocialStatusResponse = {
    configured: boolean;
    profileId: string | null;
    accounts: SocialAccount[];
    checkedAt: string;
};
export type SocialMetricTotals = {
    impressions: number | null;
    reach: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    clicks: number | null;
    views: number | null;
    engagementRate: number | null;
};
export type SocialDashboard = {
    platform: SocialPlatform | "all";
    dateRange: {
        fromDate: string;
        toDate: string;
    };
    totals: SocialMetricTotals;
    followers: {
        current: number | null;
        gained: number | null;
    };
    daily: Array<{
        date: string;
        impressions: number | null;
        reach: number | null;
        engagement: number | null;
        views: number | null;
        followersGained: number | null;
    }>;
    topPosts: Array<{
        postId: string;
        platform: SocialPlatform;
        publishedAt: string | null;
        text: string | null;
        metrics: SocialMetricTotals;
    }>;
    dataAsOf: string | null;
};
export function localHostnameAllowed(hostname: string): boolean {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
export function hostnameFromHostHeader(host: string | null): string {
    if (!host)
        return "";
    if (host.startsWith("[")) {
        const closing = host.indexOf("]");
        return closing > 0 ? host.slice(1, closing) : "";
    }
    return host.split(":")[0];
}
export const SOCIAL_METRICS = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks', 'views', 'engagementRate', 'followers', 'followersGained'] as const;
export type SocialMetric = typeof SOCIAL_METRICS[number];
export type SocialScope = {
    platform: SocialPlatform | 'all';
    fromDate: string;
    toDate: string;
};
export type SocialEntity = {
    kind: 'platform' | 'post';
    accountId?: string;
    platform: SocialPlatform;
    id: string;
    label: string;
    url?: string;
};
export type SocialQueryPlan = {
    intent: 'summary' | 'platform_comparison' | 'period_comparison' | 'post_comparison' | 'ranking' | 'trend' | 'clarification';
    platforms: SocialPlatform[];
    metrics: SocialMetric[];
    fromDate: string;
    toDate: string;
    previous?: {
        fromDate: string;
        toDate: string;
    };
    posts: {
        id?: string;
        query?: string;
        platform?: SocialPlatform;
        accountId?: string;
    }[];
    target: 'platform' | 'post';
    limit: number;
    order: 'asc' | 'desc';
    basis: 'received_period' | 'lifetime' | 'matched_age';
    clarification?: string;
};
export type SocialEvidence = {
    entity: SocialEntity;
    metric: SocialMetric;
    value: number | null;
    unit: string;
    basis: string;
    fromDate: string;
    toDate: string;
    fetchedAt: string;
    dataAsOf: string | null;
    reason?: string;
    sourceUrl?: string;
};
export type SocialChatAnswer = {
    status: 'answered' | 'partial' | 'clarification_required' | 'unavailable';
    scope: SocialScope;
    summary: string;
    columns: string[];
    rows: {
        label: string;
        values: (number | null)[];
        unit: string;
        difference?: number | null;
        percentChange?: number | null;
    }[];
    evidence: SocialEvidence[];
    entities: SocialEntity[];
    limitations: string[];
    retryable: boolean;
    candidates?: SocialEntity[];
};
export type SocialChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    answer?: SocialChatAnswer;
};
export type SocialWorkspaceStatus = SocialStatusResponse & {
    canManage: boolean;
    profiles?: {
        id: string;
        name: string;
    }[];
    profileName?: string;
    selectionRequired?: boolean;
    configuredOverride?: boolean;
};
export function validSocialRange(from: string, to: string, today = new Date().toISOString().slice(0, 10)): boolean {
    const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
    return valid(from) && valid(to) && from <= to && to <= today && (Date.parse(to) - Date.parse(from)) / 86400000 < 366;
}
export function socialDifference(current: number | null, previous: number | null, rate = false) {
    return { difference: current === null || previous === null ? null : current - previous,
        percentChange: rate || current === null || previous === null || previous === 0 ? null : (current - previous) / Math.abs(previous) * 100 };
}
