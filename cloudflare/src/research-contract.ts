export const tiers = ['snacks', 'appetizers', 'main', 'desserts'] as const;
export const channels = ['web', 'linkedin', 'youtube', 'instagram', 'reddit', 'x'] as const;
export type ResearchChannel = typeof channels[number];
export type ResearchInputV2 = {
    guestName: string;
    companyName: string;
    industry: string;
    audienceCountry: 'IN';
};
export type ResearchFailure = {
    stage: 'resolve' | 'discovery' | typeof tiers[number] | 'storage' | 'runner';
    code: 'timeout' | 'rate_limit' | 'authentication' | 'budget_exhausted' | 'output_truncated' | 'empty_output' | 'invalid_output' | 'storage_failure' | 'provider_unavailable' | 'internal_error';
    retryable: boolean;
    reason?: 'http_error' | 'transport_error' | 'connect_timeout' | 'read_timeout' | 'deadline' | 'stream_error' | 'stream_incomplete' | 'stream_invalid' | 'response_too_large' | 'context_limit' | 'no_matching_sources' | 'invalid_json' | 'invalid_schema' | 'output_truncated' | 'empty_output';
    provider?: 'treg' | 'omniroute' | 'openrouter' | 'anthropic' | 'runner';
    operation?: 'catalog' | 'search' | 'social_search' | 'extract' | 'model';
    httpStatus?: number;
};
export type ChannelCoverage = {
    channel: ResearchChannel;
    status: 'pending' | 'searching' | 'found' | 'no_results' | 'unavailable' | 'failed' | 'budget_limited';
    sourceCount: number;
    method: 'dedicated_tool' | 'web_search';
};
export type ResearchModelInfo = {
    service: 'omniroute' | 'openrouter' | 'anthropic';
    requestedModel: string;
    reportedModel?: string;
};
export const retrievalTools = [
    'perplexity.web.search', 'exa.web.contents.get', 'anyapi.linkedin.search.posts',
    'youtube.youtube.search.videos', 'anyapi.instagram.hashtag.posts',
    'scrapecreators.reddit.search.posts', 'anyapi.x.search.posts',
] as const;
export type ResearchSection = {
    key: typeof tiers[number];
    title: string;
    content: string;
    status: string;
    failure?: ResearchFailure;
};
export type ResearchSource = {
    id: string;
    title: string;
    url: string;
    excerpt: string;
    retrievedAt: string;
    publisher?: string;
    publishedAt?: string;
    kind?: string;
    timestampSeconds?: number;
    platform?: ResearchChannel;
    retrievedVia?: typeof retrievalTools[number];
    evidenceType?: 'page_extract' | 'search_snippet' | 'post' | 'transcript' | 'video_metadata';
};
export type ResearchDocument = {
    schemaVersion?: 2;
    researchInput?: ResearchInputV2;
    coverage?: ChannelCoverage[];
    modelInfo?: ResearchModelInfo;
    failure?: ResearchFailure;
    needsResearch?: boolean;
    skipClarification?: boolean;
    id: string;
    title: string;
    status: string;
    revision: number;
    updatedAt: string;
    notes: string;
    notesApproved: boolean;
    episodeId: string | null;
    shared: boolean;
    sections: ResearchSection[];
    sources: ResearchSource[];
    messages: {
        role: string;
        content: string;
    }[];
    progress: string[];
    warnings: string[];
    clarification: string | null;
    cost: {
        toolMicro: number;
        modelUsd: number | null;
    };
};
export class ResearchError extends Error {
    status: number;
    code: string;
    failure?: ResearchFailure;
    constructor(status: number, code: string, failure?: ResearchFailure) {
        super(code);
        this.status = status;
        this.code = code;
        this.failure = failure ?? (status === 502 ? { stage: 'runner', code: 'invalid_output', retryable: false } : undefined);
    }
}
export const bounded = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function parseResearchInput(value: unknown): ResearchInputV2 {
    if (!record(value) || value.audienceCountry !== 'IN')
        throw new ResearchError(400, 'invalid_request');
    const names = ['guestName', 'companyName', 'industry'] as const;
    if (names.some(k => value[k] !== undefined && typeof value[k] !== 'string'))
        throw new ResearchError(400, 'invalid_request');
    const fields = names.map(k => typeof value[k] === 'string' ? value[k].trim() : '');
    if (!fields.some(Boolean) || fields.some(s => s.length > 120 || s.length > 0 && s.length < 2))
        throw new ResearchError(400, 'invalid_request');
    return { guestName: fields[0], companyName: fields[1], industry: fields[2], audienceCountry: 'IN' };
}
export function researchTitle(input: ResearchInputV2): string {
    return [input.guestName, input.companyName, input.industry].filter(Boolean).join(' — ').slice(0, 200).replace(/[\uD800-\uDBFF]$/, '').trim();
}
export function failureValid(v: unknown): v is ResearchFailure {
    return record(v) && ['resolve', 'discovery', ...tiers, 'storage', 'runner'].includes(v.stage as string)
        && ['timeout', 'rate_limit', 'authentication', 'budget_exhausted', 'output_truncated', 'empty_output', 'invalid_output', 'storage_failure', 'provider_unavailable', 'internal_error'].includes(v.code as string)
        && typeof v.retryable === 'boolean'
        && (v.reason == null || ['http_error', 'transport_error', 'connect_timeout', 'read_timeout', 'deadline', 'stream_error', 'stream_incomplete', 'stream_invalid', 'response_too_large', 'context_limit', 'no_matching_sources', 'invalid_json', 'invalid_schema', 'output_truncated', 'empty_output'].includes(v.reason as string))
        && (v.provider == null || ['treg', 'omniroute', 'openrouter', 'anthropic', 'runner'].includes(v.provider as string))
        && (v.operation == null || ['catalog', 'search', 'social_search', 'extract', 'model'].includes(v.operation as string))
        && (v.httpStatus == null || (typeof v.httpStatus === "number" && Number.isInteger(v.httpStatus) && v.httpStatus >= 100 && v.httpStatus <= 599));
}
const projectFailure = (v: ResearchFailure): ResearchFailure => ({ stage: v.stage, code: v.code, retryable: v.retryable,
    ...(v.reason != null ? { reason: v.reason } : {}), ...(v.provider != null ? { provider: v.provider } : {}),
    ...(v.operation != null ? { operation: v.operation } : {}), ...(v.httpStatus != null ? { httpStatus: v.httpStatus } : {}) });
function modelNameValid(v: unknown): v is string {
    // Route/model identifiers only: never URLs, credentials, headers or provider prose.
    return bounded(v, 120) && /^[A-Za-z0-9][A-Za-z0-9._/:-]*$/.test(v)
        && !v.includes('://') && !/(?:^|[/:._-])(?:sk|key|token|secret|password|authorization|bearer|credential)(?:$|[/:._-])/i.test(v);
}
export function resultMetadata(v: Record<string, unknown>): Pick<ResearchDocument, 'coverage' | 'modelInfo' | 'failure'> {
    if (v.schemaVersion != null && v.schemaVersion !== 2)
        throw new ResearchError(502, 'invalid_research_result');
    if (v.researchInput != null) {
        try { parseResearchInput(v.researchInput); }
        catch { throw new ResearchError(502, 'invalid_research_result'); }
    }
    const result: Pick<ResearchDocument, 'coverage' | 'modelInfo' | 'failure'> = {};
    if (v.coverage != null) {
        const coverage = v.coverage;
        if (!Array.isArray(coverage) || coverage.length > 6 || new Set(coverage.map(c => c?.channel)).size !== coverage.length
            || !coverage.every(c => record(c) && channels.includes(c.channel as ResearchChannel)
                && ['pending', 'searching', 'found', 'no_results', 'unavailable', 'failed', 'budget_limited'].includes(c.status as string)
                && Number.isSafeInteger(c.sourceCount) && (c.sourceCount as number) >= 0
                && ['dedicated_tool', 'web_search'].includes(c.method as string)))
            throw new ResearchError(502, 'invalid_research_result');
        result.coverage = coverage.map(c => ({ channel: c.channel, status: c.status, sourceCount: c.sourceCount, method: c.method }));
    }
    if (v.modelInfo != null) {
        const m = v.modelInfo;
        if (!record(m) || !['omniroute', 'openrouter', 'anthropic'].includes(m.service as string) || !modelNameValid(m.requestedModel) || (m.reportedModel != null && !modelNameValid(m.reportedModel)))
            throw new ResearchError(502, 'invalid_research_result');
        result.modelInfo = { service: m.service as ResearchModelInfo['service'], requestedModel: m.requestedModel, ...(m.reportedModel != null ? { reportedModel: m.reportedModel as string } : {}) };
    }
    if (v.failure != null) {
        if (!failureValid(v.failure))
            throw new ResearchError(502, 'invalid_research_result');
        result.failure = projectFailure(v.failure);
    }
    return result;
}
export function sectionsValid(v: unknown): v is ResearchSection[] { return Array.isArray(v) && v.length <= 4 && new Set(v.map(s => s?.key)).size === v.length && v.every(s => s && tiers.includes(s.key) && bounded(s.title, 200) && bounded(s.content, 24000) && ['queued', 'running', 'completed', 'partial', 'failed', 'cancelled', 'skipped'].includes(s.status) && (s.status !== 'skipped' || s.content === '') && (s.status !== 'completed' || s.content.trim().length > 0) && (s.failure == null || failureValid(s.failure))); }
export function projectSections(sections: ResearchSection[]): ResearchSection[] {
    return sections.map(s => ({ key: s.key, title: s.title, content: s.content, status: s.status, ...(s.failure != null ? { failure: projectFailure(s.failure) } : {}) }));
}
function platformForHost(host: string): ResearchChannel {
    const domains: [ResearchChannel, string[]][] = [
        ['linkedin', ['linkedin.com']], ['youtube', ['youtube.com', 'youtu.be', 'youtube-nocookie.com']],
        ['instagram', ['instagram.com']], ['reddit', ['reddit.com', 'redd.it']], ['x', ['x.com', 'twitter.com']],
    ];
    return domains.find(([, names]) => names.some(d => host === d || host.endsWith('.' + d)))?.[0] ?? 'web';
}
export function sourcesValid(v: unknown): v is ResearchSource[] {
    return Array.isArray(v) && new Set(v.map(s => s?.id)).size === v.length && v.every(s => {
        if (!s || !bounded(s.id, 100) || !/^[A-Za-z0-9_-]{1,100}$/.test(s.id) || !bounded(s.title, 500) || !bounded(s.excerpt, 12000) || !bounded(s.url, 2048) || !bounded(s.retrievedAt, 80) || !Number.isFinite(Date.parse(s.retrievedAt)))
            return false;
        try {
            const u = new URL(s.url);
            const host = u.hostname.replace(/\.$/, '');
            if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || /[\s\\\x00-\x1f]/.test(s.url) || !host.includes('.') || /\.(local|localhost|internal|test|invalid)$/.test(host) || !/^[a-z0-9.-]+$/.test(host) || /^[0-9.]+$/.test(host) || (u.port && !['80', '443'].includes(u.port)))
                return false;
            if ([...u.searchParams.keys(), ...new URLSearchParams(u.hash.slice(1)).keys()].some(k => /token|secret|password|signature|credential|api.?key|authorization/i.test(k)))
                return false;
            if (s.platform != null && s.platform !== platformForHost(host))
                return false;
        }
        catch {
            return false;
        }
        return Object.entries({ publisher: 200, publishedAt: 80, kind: 50 }).every(([k, max]) => s[k] == null || bounded(s[k], max)) && (s.timestampSeconds == null || (Number.isFinite(s.timestampSeconds) && s.timestampSeconds >= 0 && s.timestampSeconds <= 604800))
            && (s.retrievedVia == null || retrievalTools.includes(s.retrievedVia))
            && (s.evidenceType == null || ['page_extract', 'search_snippet', 'post', 'transcript', 'video_metadata'].includes(s.evidenceType));
    });
}
export function validatedResult(value: unknown, id: string): Partial<ResearchDocument> {
    const v = value as ResearchDocument;
    if (!v || v.id !== id || !['queued', 'running', 'completed', 'partial', 'failed', 'cancelled', 'clarification'].includes(v.status))
        throw new ResearchError(502, 'invalid_research_result');
    const metadata = resultMetadata(v);
    if (v.status === 'queued' || v.status === 'running') {
        const progress = v.progress ?? [];
        if (!Array.isArray(progress) || progress.length > 100 || !progress.every(s => bounded(s, 2000)))
            throw new ResearchError(502, 'invalid_research_result');
        return { status: v.status, progress, ...metadata };
    }
    if (!sectionsValid(v.sections) || !sourcesValid(v.sources) || ![v.progress, v.warnings].every(a => Array.isArray(a) && a.length <= 100 && a.every(s => bounded(s, 2000))) || !(v.clarification === null || bounded(v.clarification, 2000)) || !v.cost || !Number.isSafeInteger(v.cost.toolMicro) || v.cost.toolMicro < 0 || !(v.cost.modelUsd === null || (Number.isFinite(v.cost.modelUsd) && v.cost.modelUsd >= 0)))
        throw new ResearchError(502, 'invalid_research_result');
    const sources = v.sources.map(s => ({ id: s.id, title: s.title, url: s.url, excerpt: s.excerpt, retrievedAt: s.retrievedAt, ...(s.publisher ? { publisher: s.publisher } : {}), ...(s.publishedAt ? { publishedAt: s.publishedAt } : {}), ...(s.kind ? { kind: s.kind } : {}), ...(s.timestampSeconds != null ? { timestampSeconds: s.timestampSeconds } : {}), ...(s.platform != null ? { platform: s.platform } : {}), ...(s.retrievedVia != null ? { retrievedVia: s.retrievedVia } : {}), ...(s.evidenceType != null ? { evidenceType: s.evidenceType } : {}) }));
    return { status: v.status === 'completed' && (v.sections.length !== 4 || v.sections.some(s => !['completed', 'skipped'].includes(s.status)) || !v.sections.some(s => s.status === 'completed')) ? 'partial' : v.status, sections: projectSections(v.sections), sources, progress: v.progress, warnings: v.warnings, clarification: v.clarification, cost: { toolMicro: v.cost.toolMicro, modelUsd: v.cost.modelUsd }, ...metadata };
}
export async function boundedText(body: Request | Response, limit: number, status: number): Promise<string> {
    const reader = body.body?.getReader();
    if (!reader)
        return '';
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done)
                break;
            length += chunk.value.byteLength;
            if (length > limit) {
                await reader.cancel();
                throw new ResearchError(status, status === 413 ? 'research_too_large' : 'invalid_research_result');
            }
            chunks.push(chunk.value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
}
