import type { DB } from './db.ts';
import type { PrincipalContext } from './auth/principal-context.ts';
import { decide } from './auth/policy.ts';
import { createSocialProvider, ZernioError, type SocialProvider, type SocialProviderEnv } from './social-analytics-provider.ts';
import { isSocialPlatform, validSocialRange } from './social-analytics-contracts.ts';
import { handleSocialAnalyticsAssistant } from './social-analytics-assistant.ts';
import { handleSocialAnalyticsInvestigations } from './social-analytics-investigations.ts';
import type { OpenRouterEnv, openRouterChat } from './chat/openrouter.ts';
const headers = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
export type SocialEnv = SocialProviderEnv & OpenRouterEnv & {
    DB: DB;
    OPS_ORIGIN: string;
};
export async function resolveSocialWorkspace(db: DB, env: SocialProviderEnv, provider: SocialProvider) {
    const profiles = await provider.profiles();
    const stored = env.ZERNIO_PROFILE_ID?.trim() || (await db.prepare('SELECT profile_id FROM social_analytics_workspace WHERE id = 1').first<{
        profile_id: string;
    }>())?.profile_id;
    const profile = profiles.find(p => p.id === stored);
    if (stored && !profile)
        throw new ZernioError('The selected workspace is no longer accessible. Ask an admin to select an accessible profile.', 409, 'profile_unavailable');
    return { profiles, profile, profileId: profile?.id ?? null };
}
export async function handleSocialAnalytics(request: Request, env: SocialEnv, context: PrincipalContext, memberId: number, dependencies: {
    fetchSocial?: typeof fetch;
    planSocial?: typeof openRouterChat;
} = {}) {
    if (env.SOCIAL_ANALYTICS_ENABLED !== '1')
        return reply({ error: 'not_found' }, 404);
    const url = new URL(request.url);
    const action = url.pathname.slice('/beta/api/social-analytics/'.length);
    const canManage = decide(context.role, 'analytics', 'manage', { environment: context.environment });
    if (['connect', 'selection'].includes(action) && !canManage)
        return reply({ error: 'forbidden' }, 403);
    try {
        if (action === 'investigations' || action.startsWith('investigations/'))
            return handleSocialAnalyticsInvestigations(request, env.DB, memberId);
        const deadline = Date.now() + 60000;
        const provider = createSocialProvider(env, dependencies.fetchSocial, deadline);
        if (action === 'selection' && request.method === 'POST') {
            if (env.ZERNIO_PROFILE_ID?.trim())
                return reply({ error: 'configured_override', message: 'This workspace is selected by server configuration.' }, 409);
            const input = await request.json().catch(() => null) as {
                profileId?: unknown;
            } | null;
            const profiles = await provider.profiles();
            if (typeof input?.profileId !== 'string' || !profiles.some(p => p.id === input.profileId))
                return reply({ error: 'invalid_profile' }, 400);
            await env.DB.prepare('INSERT INTO social_analytics_workspace (id,profile_id,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,updated_at=excluded.updated_at').bind(input.profileId, new Date().toISOString()).run();
            return reply({ selected: true });
        }
        if (action === 'status' && !env.ZERNIO_API_KEY?.trim())
            return reply({ configured: false, profileId: null, accounts: [], checkedAt: new Date().toISOString(), canManage, profiles: [] });
        // Rate limit before discovery or model use, scoped to the verified member identity.
        if (action === 'assistant') {
            const window = Math.floor(Date.now() / 60000);
            const quota = await env.DB.prepare('INSERT INTO social_analytics_rate_limits (member_id,window_start,requests) VALUES (?,?,1) ON CONFLICT(member_id) DO UPDATE SET window_start=excluded.window_start, requests=CASE WHEN window_start=excluded.window_start THEN requests+1 ELSE 1 END RETURNING requests').bind(memberId, window).first<{
                requests: number;
            }>();
            if (!quota || quota.requests > 10)
                return reply({ error: 'rate_limited', message: 'Please wait a minute before asking another question.' }, 429);
        }
        let selected: Awaited<ReturnType<typeof resolveSocialWorkspace>>;
        try {
            selected = await resolveSocialWorkspace(env.DB, env, provider);
        }
        catch (error) {
            // A stale persisted selection must still let an admin choose its replacement.
            if (action === 'status' && error instanceof ZernioError && error.code === 'profile_unavailable') {
                return reply({ configured: false, profileId: null, accounts: [], checkedAt: new Date().toISOString(), canManage, selectionRequired: true, configuredOverride: Boolean(env.ZERNIO_PROFILE_ID?.trim()), ...(canManage ? { profiles: await provider.profiles() } : {}), message: error.message });
            }
            throw error;
        }
        const accounts = selected.profileId ? await provider.accounts(selected.profileId) : [];
        if (action === 'status' && request.method === 'GET')
            return reply({ configured: Boolean(selected.profileId), profileId: selected.profileId, profileName: selected.profile?.name, accounts, checkedAt: new Date().toISOString(), canManage, ...(canManage ? { profiles: selected.profiles } : {}), selectionRequired: !selected.profileId, configuredOverride: Boolean(env.ZERNIO_PROFILE_ID?.trim()) });
        if (!selected.profileId)
            return reply({ error: 'selection_required', message: 'Ask an admin to select the social workspace first.' }, 409);
        if (action === 'connect' && request.method === 'POST') {
            const input = await request.json().catch(() => null) as {
                platform?: unknown;
            } | null;
            if (!isSocialPlatform(input?.platform))
                return reply({ error: 'invalid_platform' }, 400);
            return reply({ authUrl: await provider.connect(selected.profileId, input.platform, new URL('/beta/social-analytics', env.OPS_ORIGIN).href) });
        }
        if (action === 'dashboard' && request.method === 'GET') {
            const platform = url.searchParams.get('platform') ?? 'all', fromDate = url.searchParams.get('fromDate') ?? '', toDate = url.searchParams.get('toDate') ?? '';
            if ((platform !== 'all' && !isSocialPlatform(platform)) || !validSocialRange(fromDate, toDate))
                return reply({ error: 'invalid_scope' }, 400);
            if (platform !== 'all' && !accounts.some(a => a.platform === platform && a.isActive && a.hasAnalyticsAccess !== false))
                return reply({ error: 'not_connected', message: 'This platform is not connected or analytics access is unavailable.' }, 409);
            return reply({ dashboard: await provider.dashboard(selected.profileId, { platform, fromDate, toDate }) });
        }
        if (action === 'assistant' && request.method === 'POST')
            return handleSocialAnalyticsAssistant(request, env, { profileId: selected.profileId, profileName:selected.profile?.name, accounts }, provider, dependencies.planSocial, deadline);
        return reply({ error: 'not_found' }, 404);
    }
    catch (error) {
        return reply({ error: error instanceof ZernioError ? error.code : 'social_analytics_unavailable', message: error instanceof ZernioError ? error.message : 'Social analytics is unavailable. Please try again.' }, error instanceof ZernioError && error.status >= 400 ? error.status : 503);
    }
}
