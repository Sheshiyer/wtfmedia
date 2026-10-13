export const tiers = ['snacks', 'appetizers', 'main', 'desserts'] as const;
export type ResearchSection = {
    key: typeof tiers[number];
    title: string;
    content: string;
    status: string;
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
};
export type ResearchDocument = {
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
    constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
export const bounded = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
export function sectionsValid(v: unknown): v is ResearchSection[] { return Array.isArray(v) && v.length <= 4 && new Set(v.map(s => s?.key)).size === v.length && v.every(s => s && tiers.includes(s.key) && bounded(s.title, 200) && bounded(s.content, 24000) && ['queued', 'running', 'completed', 'partial', 'failed', 'cancelled'].includes(s.status)); }
export function sourcesValid(v: unknown): v is ResearchSource[] {
    return Array.isArray(v) && v.length <= 80 && new Set(v.map(s => s?.id)).size === v.length && v.every(s => {
        if (!s || !bounded(s.id, 100) || !/^[A-Za-z0-9_-]{1,100}$/.test(s.id) || !bounded(s.title, 500) || !bounded(s.excerpt, 12000) || !bounded(s.url, 2048) || !bounded(s.retrievedAt, 80) || !Number.isFinite(Date.parse(s.retrievedAt)))
            return false;
        try {
            const u = new URL(s.url);
            if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || /[\s\\\x00-\x1f]/.test(s.url) || !u.hostname.includes('.') || /\.(local|localhost|internal|test|invalid)$/.test(u.hostname) || /^[0-9.]+$/.test(u.hostname) || u.hostname.includes(':') || (u.port && !['80', '443'].includes(u.port)))
                return false;
        }
        catch {
            return false;
        }
        return Object.entries({ publisher: 200, publishedAt: 80, kind: 50 }).every(([k, max]) => s[k] == null || bounded(s[k], max)) && (s.timestampSeconds == null || (Number.isFinite(s.timestampSeconds) && s.timestampSeconds >= 0 && s.timestampSeconds <= 604800));
    });
}
export function validatedResult(value: unknown, id: string): Partial<ResearchDocument> {
    const v = value as ResearchDocument;
    if (!v || v.id !== id || !['queued', 'running', 'completed', 'partial', 'failed', 'cancelled', 'clarification'].includes(v.status))
        throw new ResearchError(502, 'invalid_research_result');
    if (v.status === 'queued' || v.status === 'running') {
        const progress = v.progress ?? [];
        if (!Array.isArray(progress) || progress.length > 100 || !progress.every(s => bounded(s, 2000)))
            throw new ResearchError(502, 'invalid_research_result');
        return { status: v.status, progress };
    }
    if (!sectionsValid(v.sections) || !sourcesValid(v.sources) || ![v.progress, v.warnings].every(a => Array.isArray(a) && a.length <= 100 && a.every(s => bounded(s, 2000))) || !(v.clarification === null || bounded(v.clarification, 2000)) || !v.cost || !Number.isSafeInteger(v.cost.toolMicro) || v.cost.toolMicro < 0 || !(v.cost.modelUsd === null || (Number.isFinite(v.cost.modelUsd) && v.cost.modelUsd >= 0)))
        throw new ResearchError(502, 'invalid_research_result');
    const sources = v.sources.map(s => ({ id: s.id, title: s.title, url: s.url, excerpt: s.excerpt, retrievedAt: s.retrievedAt, ...(s.publisher ? { publisher: s.publisher } : {}), ...(s.publishedAt ? { publishedAt: s.publishedAt } : {}), ...(s.kind ? { kind: s.kind } : {}), ...(s.timestampSeconds != null ? { timestampSeconds: s.timestampSeconds } : {}) }));
    return { status: v.status === 'completed' && (v.sections.length !== 4 || v.sections.some(s => s.status !== 'completed')) ? 'partial' : v.status, sections: v.sections.map(s => ({ key: s.key, title: s.title, content: s.content, status: s.status })), sources, progress: v.progress, warnings: v.warnings, clarification: v.clarification, cost: { toolMicro: v.cost.toolMicro, modelUsd: v.cost.modelUsd } };
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
