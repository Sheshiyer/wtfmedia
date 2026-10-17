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
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
  engagementRate: number;
};

export type SocialDashboard = {
  platform: SocialPlatform | "all";
  dateRange: { fromDate: string; toDate: string };
  totals: SocialMetricTotals;
  followers: {
    current: number;
    gained: number;
  };
  daily: Array<{
    date: string;
    impressions: number;
    reach: number;
    engagement: number;
    views: number;
    followersGained: number;
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
  if (!host) return "";
  if (host.startsWith("[")) {
    const closing = host.indexOf("]");
    return closing > 0 ? host.slice(1, closing) : "";
  }
  return host.split(":")[0];
}
