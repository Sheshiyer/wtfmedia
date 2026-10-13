import { runAlphaChat, type AlphaGatewayEnvironment } from "./chat/alpha-gateway.ts";

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
