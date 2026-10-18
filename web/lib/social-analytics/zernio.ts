import "server-only";
import { createSocialProvider, ZernioError } from "../../../cloudflare/src/social-analytics-provider";
import type { SocialPlatform } from "./contracts";
export { ZernioError };
function provider() { return createSocialProvider({ ZERNIO_API_KEY: process.env.ZERNIO_API_KEY, ZERNIO_PROFILE_ID: process.env.ZERNIO_PROFILE_ID }); }
function profile() { const id = process.env.ZERNIO_PROFILE_ID?.trim(); if (!id)
    throw new ZernioError("Social analytics is not configured locally.", 503, "not_configured"); return id; }
export function socialAnalyticsConfigured() { return Boolean(process.env.ZERNIO_API_KEY?.trim() && process.env.ZERNIO_PROFILE_ID?.trim()); }
export function socialAnalyticsLocalEnabled() { return process.env.NODE_ENV !== "production" && process.env.SOCIAL_ANALYTICS_LOCAL_ENABLED === "1"; }
export const listSocialAccounts = () => provider().accounts(profile(), true);
export const createConnectionUrl = (platform: SocialPlatform, redirectUrl: string) => provider().connect(profile(), platform, redirectUrl);
export const getSocialDashboard = (input: {
    platform: SocialPlatform | "all";
    fromDate: string;
    toDate: string;
}) => provider().dashboard(profile(), input);
