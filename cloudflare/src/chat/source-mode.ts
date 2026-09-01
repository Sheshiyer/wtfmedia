export const SOURCE_MODES = ["published", "uncut", "both"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];
export type StoredSourceMode = Exclude<SourceMode, "both">;

export const MAPPING_STATUSES = ["mapped", "unmapped", "unavailable", "conflicted"] as const;
export type MappingStatus = (typeof MAPPING_STATUSES)[number];

export type VectorMatchLike = {
  id?: unknown;
  score?: unknown;
  metadata?: Record<string, unknown> | null;
};

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Public episode routes are keyed only by the published YouTube video ID. */
export function parseEpisodeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return YOUTUBE_VIDEO_ID.test(normalized) ? normalized : null;
}

export function buildVectorQueryOptions(episodeId: string | null) {
  return episodeId
    ? { topK: 48, returnMetadata: "all" as const, filter: { video_id: { $eq: episodeId } } }
    : { topK: 48, returnMetadata: "all" as const };
}

const NAME_TOKEN = /[A-Za-z][A-Za-z'-]*/g;

function tokens(value: string): string[] {
  return value.match(NAME_TOKEN)?.map((token) => token.toLocaleLowerCase("en-US")) ?? [];
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let differences = 0;
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    differences += 1;
    if (differences > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return differences + (left.length - leftIndex) + (right.length - rightIndex) <= 1;
}

function phraseAppearsIn(text: string, phrase: string): boolean {
  const haystack = tokens(text);
  const needle = tokens(phrase);
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((word, index) => editDistanceAtMostOne(word, haystack[start + index]))) return true;
  }
  return false;
}

/** Extract likely multi-token person names without treating generic question words as entities. */
export function extractNamedEntityPhrases(question: string): string[] {
  return question.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+\b/g) ?? [];
}

/**
 * Keep semantic retrieval for generic questions, but make explicit names a
 * hard relevance anchor before synthesis. Metadata titles are authoritative
 * for episode membership; fuzzy token matching covers common spelling variants
 * such as Sunil/Suniel without inventing a new identity.
 */
export function prioritizeMatchesForQuestion<T extends VectorMatchLike>(
  matches: readonly T[],
  question: string,
): T[] {
  const entities = extractNamedEntityPhrases(question);
  if (entities.length === 0) return [...matches];

  const anchored = matches.map((match, index) => {
    const metadata = match.metadata ?? {};
    const searchable = `${String(metadata.title ?? "")} ${String(metadata.text ?? "")}`;
    const anchorScore = entities.reduce((score, entity) => score + (phraseAppearsIn(searchable, entity) ? 1 : 0), 0);
    return { match, index, anchorScore };
  });
  const strongestAnchor = Math.max(...anchored.map((item) => item.anchorScore), 0);
  if (strongestAnchor === 0) return [];

  return anchored
    .filter((item) => item.anchorScore === strongestAnchor)
    .sort((left, right) => {
      const scoreDelta = numericScore(right.match) - numericScore(left.match);
      return scoreDelta || left.index - right.index;
    })
    .map((item) => item.match);
}

function numericScore(match: VectorMatchLike): number {
  return typeof match.score === "number" && Number.isFinite(match.score) ? match.score : -Infinity;
}

/** Re-check scope after retrieval so a stale index cannot broaden an episode query. */
export function filterMatchesByEpisodeId<T extends VectorMatchLike>(
  matches: readonly T[],
  episodeId: string | null,
): readonly T[] {
  if (!episodeId) return matches;
  return matches.filter((match) => {
    const metadata = match.metadata ?? {};
    return metadata.video_id === episodeId || metadata.videoId === episodeId;
  });
}

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

function youtubeWatchUrl(videoId: string, start: number | null): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  return start == null ? base : `${base}&t=${Math.floor(start)}s`;
}

/**
 * Published citations may carry a YouTube watch URL.
 * Uncut citations are a direct catalogue ref (`uncut:{id}`), never an http URL.
 */
export function citationRef(
  stored: StoredSourceMode,
  videoId: string,
  start: number | null,
  timestamped: boolean,
): string {
  if (stored === "uncut") return `uncut:${videoId}`;
  return youtubeWatchUrl(videoId, timestamped ? start : null);
}

export function parseSourceMode(value: unknown): SourceMode {
  return value === "uncut" || value === "both" ? value : "published";
}

export function storedSourceMode(metadata: Record<string, unknown> | null | undefined): StoredSourceMode {
  return parseSourceMode(metadata?.sourceMode ?? metadata?.source_mode) === "uncut" ? "uncut" : "published";
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
  const sameMode = requested === "both" || stored === requested;
  const timestamped = metadata.timestamped === true && sameMode && start != null;
  const mappingStatus: MappingStatus = !sameMode
    ? "unavailable"
    : start == null
      ? "unmapped"
      : "mapped";
  const url = citationRef(stored, videoId, timestamped ? start : null, timestamped);

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
  dedupeByEpisode = true,
): DualSourceCitation[] {
  const usedEpisodes = new Set<string>();
  const citations: DualSourceCitation[] = [];

  for (const match of matches) {
    if (typeof match.score === "number" && match.score < minScore) continue;
    if (!matchPassesSourceFilter(match, requested)) continue;
    const projected = projectDualSourceCitation(match, requested, citations.length);
    if (!projected) continue;
    if (dedupeByEpisode && usedEpisodes.has(projected.videoId)) continue;
    if (dedupeByEpisode) usedEpisodes.add(projected.videoId);
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
  options: { dedupeByEpisode?: boolean } = {},
): ResolvedChatSources {
  const dedupeByEpisode = options.dedupeByEpisode ?? true;
  const requestedHits = filterAndProjectMatches(matches, requested, minScore, limit, dedupeByEpisode);
  if (requested !== "uncut") {
    if (requested !== "both") {
      return { citations: requestedHits, sourceMode: "published", uncutUnavailable: false };
    }
    const publishedHits = filterAndProjectMatches(matches, "published", minScore, limit, dedupeByEpisode);
    const uncutHits = filterAndProjectMatches(matches, "uncut", minScore, limit, dedupeByEpisode);
    const usedSegments = new Set<string>();
    const citations = [...uncutHits, ...publishedHits]
      .filter((citation) => {
        if (usedSegments.has(citation.segmentId)) return false;
        usedSegments.add(citation.segmentId);
        return true;
      })
      .slice(0, limit)
      .map((citation, index) => ({ ...citation, n: index + 1 }));
    return {
      citations,
      sourceMode: "both",
      uncutUnavailable: uncutHits.length === 0,
    };
  }
  if (requestedHits.length >= 2) {
    return { citations: requestedHits, sourceMode: "uncut", uncutUnavailable: false };
  }
  const publishedHits = filterAndProjectMatches(matches, "published", minScore, limit, dedupeByEpisode);
  if (publishedHits.length >= 2) {
    return { citations: publishedHits, sourceMode: "published", uncutUnavailable: true };
  }
  return { citations: requestedHits, sourceMode: "uncut", uncutUnavailable: true };
}

export function resolveEpisodeScopedSources(
  matches: readonly VectorMatchLike[],
  requested: SourceMode,
  episodeId: string | null,
  minScore: number,
  limit = 6,
  options: { dedupeByEpisode?: boolean } = {},
): ResolvedChatSources {
  const scopedMatches = filterMatchesByEpisodeId(matches, episodeId);
  return resolveRequestedSources(scopedMatches, requested, minScore, limit, {
    dedupeByEpisode: options.dedupeByEpisode ?? episodeId == null,
  });
}
