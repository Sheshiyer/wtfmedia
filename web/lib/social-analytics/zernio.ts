import "server-only";
import { createSocialProvider, defaultSocialProfile, ZernioError } from "../../../cloudflare/src/social-analytics-provider";
import type { SocialPlatform } from "./contracts";
export { ZernioError };
function provider() { return createSocialProvider({ ZERNIO_API_KEY: process.env.ZERNIO_API_KEY, ZERNIO_PROFILE_ID: process.env.ZERNIO_PROFILE_ID }); }
async function profile(client: ReturnType<typeof createSocialProvider>) {
    const profiles = await client.profiles();
    const override = process.env.ZERNIO_PROFILE_ID?.trim();
    const selected = override ? profiles.find(profile => profile.id === override) : defaultSocialProfile(profiles);
    if (!selected) throw new ZernioError(
        override || !profiles.length ? "No accessible Zernio profile is available." : "Several Zernio profiles are available without a unique default. Use the authenticated workspace to select one as an admin.",
        409, override || !profiles.length ? "profile_unavailable" : "profile_ambiguous");
    return selected.id;
}
export const discoverZernioProfileId = () => profile(provider());
export function socialAnalyticsConfigured() { return Boolean(process.env.ZERNIO_API_KEY?.trim()); }
export function socialAnalyticsLocalEnabled() { return process.env.NODE_ENV !== "production" && process.env.SOCIAL_ANALYTICS_LOCAL_ENABLED === "1"; }
export const listSocialAccounts = async () => { const client = provider(); return client.accounts(await profile(client), true); };
export const listLinkedInOrganizations = async (accountId: string) => { const client = provider(); return client.linkedInOrganizations(await profile(client), accountId); };
export const selectLinkedInOrganization = async (accountId: string, organizationId: string) => { const client = provider(); return client.selectLinkedInOrganization(await profile(client), accountId, organizationId); };
export const disconnectSocialAccount = async (accountId: string) => { const client = provider(); return client.disconnectAccount(await profile(client), accountId); };
export const createConnectionUrl = async (platform: SocialPlatform, redirectUrl: string) => { const client = provider(); return client.connect(await profile(client), platform, redirectUrl); };
export const getSocialDashboard = async (input: {
    platform: SocialPlatform | "all";
    fromDate: string;
    toDate: string;
}) => { const client = provider(); return client.dashboard(await profile(client), input); };
