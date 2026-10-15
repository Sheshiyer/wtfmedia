import { ResearchError, boundedText } from './research-contract.ts';
export type ResearchRunnerEnv = {
    RESEARCH_RUNNER_URL?: string;
    RESEARCH_RUNNER_TOKEN?: string;
    OPS_ENVIRONMENT?: string;
    DEPLOYMENT_ENVIRONMENT?: string;
};
export function researchConfigured(env: ResearchRunnerEnv): boolean {
    try {
        const u = new URL(env.RESEARCH_RUNNER_URL || '');
        return !!env.RESEARCH_RUNNER_TOKEN && !u.username && !u.password && !u.search && !u.hash && (u.protocol === 'https:' || ((env.OPS_ENVIRONMENT === 'local' || env.DEPLOYMENT_ENVIRONMENT === 'local') && u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)));
    }
    catch {
        return false;
    }
}
export async function researchRunner(env: ResearchRunnerEnv, path: string, method = 'GET', body?: unknown, fetchRunner: typeof fetch = fetch): Promise<any> {
    if (!researchConfigured(env))
        throw new ResearchError(503, 'research_not_configured');
    try {
        const response = await fetchRunner(env.RESEARCH_RUNNER_URL!.replace(/\/$/, '') + path, { method, headers: { authorization: `Bearer ${env.RESEARCH_RUNNER_TOKEN}`, 'content-type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: AbortSignal.timeout(path === '/chat' ? 100000 : 20000) });
        if (method === 'DELETE' && response.status === 404)
            return {};
        if (response.status === 422 || response.status === 400)
            throw new ResearchError(502, 'invalid_research_request');
        if (!response.ok)
            throw new ResearchError(503, 'research_runner_unavailable');
        const raw = await boundedText(response, 1200000, 502);
        try { return raw ? JSON.parse(raw) : {}; }
        catch { throw new ResearchError(502, 'invalid_research_result'); }
    }
    catch (e) {
        if (e instanceof ResearchError)
            throw e;
        if (path === '/chat' && e instanceof Error && ['TimeoutError','AbortError'].includes(e.name)) throw new ResearchError(504,'research_chat_timeout');
        throw new ResearchError(503, 'research_runner_unavailable');
    }
}
export async function deleteResearchRun(env: ResearchRunnerEnv, runId: string, fetchRunner: typeof fetch = fetch): Promise<void> {
    if (!/^rrun_[0-9a-f-]{36}$/.test(runId))
        throw new ResearchError(400, 'invalid_run');
    await researchRunner(env, `/jobs/${runId}`, 'DELETE', undefined, fetchRunner);
}
export async function researchAvailable(env: ResearchRunnerEnv, fetchRunner: typeof fetch = fetch): Promise<boolean> {
    if (!researchConfigured(env))
        return false;
    try {
        return (await researchRunner(env, '/health', 'GET', undefined, fetchRunner)).configured === true;
    }
    catch {
        return false;
    }
}
