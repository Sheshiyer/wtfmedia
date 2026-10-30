import { runAlphaChat, type AlphaGatewayEnvironment } from "./chat/alpha-gateway.ts";

/** Public Alpha synthesis, deliberately NOT a verbatim transcript or speaker receipt. */
export async function readAlphaInterviewContext(env: AlphaGatewayEnvironment, subject: string, episodeId?: string | null) {
  const unavailable = { status: "unavailable" as const, summary: "", sources: [] };
  if (!env.WTFMEDIA_ALPHA_WEB) return unavailable;
  const service = env.WTFMEDIA_ALPHA_WEB;
  try {
    const result = await runAlphaChat({
      question: `About ${subject.slice(0, 1250)}: summarize questions actually asked in previous published WTF episodes and the discussion they opened. Focus on Nikhil's questions only when the transcript establishes the speaker; otherwise say speaker unknown. Cite each historical reference. Separate what was asked from unanswered angles. Do not invent questions, quotes, speakers or new interview questions. If no relevant questions are retrieved, say so.`,
      sourceMode: "published", ...(episodeId ? { episodeId } : {}),
    }, { WTFMEDIA_ALPHA_WEB: { fetch: request => service.fetch(new Request(request, { signal: AbortSignal.timeout(40_000) })) } });
    if (!result.grounded || result.answer.length > 6000) return unavailable;
    const cited = new Set(result.citedIndices ?? []);
    const sources = result.sources.filter(s => cited.has(s.n));
    // Never retain a summary whose citations were dropped or point to another source mode.
    if (!sources.length || sources.length > 12 || new Set(sources.map(s => s.n)).size !== sources.length
      || sources.some(s => s.n > 100 || s.sourceMode !== "published" || (episodeId && s.videoId !== episodeId))) return unavailable;
    return {
      status: "available" as const,
      summary: result.answer,
      sources: sources.map(s => ({ id: `alpha_${s.videoId}_${s.n}`, title: s.title,
        url: `https://www.youtube.com/watch?v=${s.videoId}`, excerpt: "", publisher: "WTF",
        kind: "alpha_reference", retrievedAt: new Date().toISOString(),
        ...(s.timestamped && s.start !== null && s.start <= 604800 ? { timestampSeconds: s.start } : {}),
        citationNumber: s.n,
      })),
    };
  } catch { return unavailable; }
}

/** Alpha exposes source references, not transcript excerpts. Keep that distinction. */
export async function readAlphaResearchEvidence(env: AlphaGatewayEnvironment, title: string, episodeId?: string | null) {
  if (!episodeId || !env.WTFMEDIA_ALPHA_WEB) return [];
  const service = env.WTFMEDIA_ALPHA_WEB;
  try {
    const result = await runAlphaChat({ question: `Find relevant published discussion of ${title.slice(0, 200)} in this episode. Cite the sources.`, sourceMode: "published", episodeId }, {
      WTFMEDIA_ALPHA_WEB: { fetch: request => service.fetch(new Request(request, { signal: AbortSignal.timeout(20_000) })) },
    });
    if (!result.grounded) return [];
    const cited = new Set(result.citedIndices ?? []);
    return result.sources.filter(source => cited.has(source.n) && source.videoId === episodeId && source.sourceMode === "published")
      .slice(0, 12).map(source => ({
        id: `alpha_${source.videoId}_${source.n}`, title: source.title,
        url: `https://www.youtube.com/watch?v=${source.videoId}`,
        excerpt: "", publisher: "WTF", kind: "alpha_reference",
        retrievedAt: new Date().toISOString(),
        ...(source.timestamped && source.start !== null ? { timestampSeconds: source.start } : {}),
      }));
  } catch { return []; }
}
