export const SOURCE_MODES = ["published", "uncut"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];

export const MAPPING_STATUSES = ["mapped", "unmapped", "unavailable", "conflicted"] as const;
export type MappingStatus = (typeof MAPPING_STATUSES)[number];

export type VectorMatchLike = {
  id?: unknown;
  score?: unknown;
  metadata?: Record<string, unknown> | null;
};

export type DualSourceCitation = {
  n: number;
  score: number;
  videoId: string;
  title: string;
  url: string;
  sourceMode: SourceMode;
  segmentId: string;
  start: number | null;
  timestamped: boolean;
  mappingStatus: MappingStatus;
};

export function parseSourceMode(value: unknown): SourceMode {
  return value === "uncut" ? "uncut" : "published";
}

export function storedSourceMode(metadata: Record<string, unknown> | null | undefined): SourceMode {
  return parseSourceMode(metadata?.sourceMode ?? metadata?.source_mode);
}

export function matchPassesSourceFilter(
  match: VectorMatchLike,
  requested: SourceMode,
): boolean {
  return storedSourceMode(match.metadata ?? undefined) === requested;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

/**
 * Project a retrieval match into a dual-source citation.
 * A published timestamp is never rewritten as an uncut timestamp.
 */
export function projectDualSourceCitation(
  match: VectorMatchLike,
  requested: SourceMode,
  index: number,
): DualSourceCitation | null {
  const metadata = match.metadata ?? {};
  const stored = storedSourceMode(metadata);
  const videoId = text(metadata.video_id ?? metadata.videoId);
  if (!videoId) return null;

  const chunk = metadata.chunk;
  const segmentId = text(
    match.id,
    typeof chunk === "number" ? `${videoId}:${chunk}` : `${videoId}:${index}`,
  );
  const start = nonNegativeNumber(metadata.start);
  const sameMode = stored === requested;
  const timestamped = metadata.timestamped === true && sameMode && start != null;
  const mappingStatus: MappingStatus = !sameMode
    ? "unavailable"
    : start == null
      ? "unmapped"
      : "mapped";
  const sourceUrl = text(metadata.source, `https://www.youtube.com/watch?v=${videoId}`);
  const url = timestamped && start != null
    ? `${sourceUrl}${sourceUrl.includes("?") ? "&" : "?"}t=${Math.floor(start)}s`
    : sourceUrl;

  return {
    n: index + 1,
    score: typeof match.score === "number" ? Number(match.score.toFixed(3)) : 0,
    videoId,
    title: text(metadata.title, videoId).slice(0, 500),
    url,
    sourceMode: stored,
    segmentId,
    start: timestamped ? start : null,
    timestamped,
    mappingStatus,
  };
}

export function filterAndProjectMatches(
  matches: readonly VectorMatchLike[],
  requested: SourceMode,
  minScore: number,
  limit = 6,
): DualSourceCitation[] {
  const usedEpisodes = new Set<string>();
  const citations: DualSourceCitation[] = [];

  for (const match of matches) {
    if (typeof match.score === "number" && match.score < minScore) continue;
    if (!matchPassesSourceFilter(match, requested)) continue;
    const projected = projectDualSourceCitation(match, requested, citations.length);
    if (!projected) continue;
    if (usedEpisodes.has(projected.videoId)) continue;
    usedEpisodes.add(projected.videoId);
    citations.push(projected);
    if (citations.length >= limit) break;
  }

  return citations;
}

export type ResolvedChatSources = {
  citations: DualSourceCitation[];
  sourceMode: SourceMode;
  uncutUnavailable: boolean;
};

/**
 * Prefer the requested mode. If uncut has no corpus, use published YouTube
 * and name it published. Never relabel a published timestamp as uncut.
 */
export function resolveRequestedSources(
  matches: readonly VectorMatchLike[],
  requested: SourceMode,
  minScore: number,
  limit = 6,
): ResolvedChatSources {
  const requestedHits = filterAndProjectMatches(matches, requested, minScore, limit);
  if (requested !== "uncut") {
    return { citations: requestedHits, sourceMode: "published", uncutUnavailable: false };
  }
  if (requestedHits.length >= 2) {
    return { citations: requestedHits, sourceMode: "uncut", uncutUnavailable: false };
  }
  const publishedHits = filterAndProjectMatches(matches, "published", minScore, limit);
  if (publishedHits.length >= 2) {
    return { citations: publishedHits, sourceMode: "published", uncutUnavailable: true };
  }
  return { citations: requestedHits, sourceMode: "uncut", uncutUnavailable: true };
}
