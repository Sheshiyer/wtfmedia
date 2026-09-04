import {
  PUBLISHED_YOUTUBE_SKILL,
  type TimestampStatus,
} from "./skills/published-youtube.ts";
import { APPROVED_UNCUT_SKILL } from "./skills/approved-uncut.ts";

export const SOURCE_MODES = ["published", "uncut", "both"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];
export type StoredSourceMode = Exclude<SourceMode, "both">;
export const COMPETITIVE_SCORE_DELTA = 0.05;

export const MAPPING_STATUSES = ["mapped", "unmapped", "unavailable", "conflicted"] as const;
export type MappingStatus = (typeof MAPPING_STATUSES)[number];

export type VectorMatchLike = {
  id?: unknown;
  score?: unknown;
  metadata?: Record<string, unknown> | null;
};

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

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

const ENTITY_STOP_WORDS = new Set([
  "about", "after", "all", "also", "any", "are", "ask", "asked", "back",
  "been", "before", "between", "both", "but", "call", "called", "came",
  "can", "come", "could", "did", "does", "each", "end", "even", "ever",
  "every", "far", "feel", "few", "find", "for", "from", "get", "give",
  "goes", "gone", "got", "grew", "grow", "had", "has", "have", "hear",
  "heard", "help", "her", "here", "him", "his", "home", "house", "how",
  "into", "its", "just", "keep", "kept", "kind", "know", "knew", "last",
  "leave", "left", "let", "like", "live", "lived", "lives", "long", "look",
  "made", "make", "many", "may", "mean", "more", "most", "much", "must",
  "near", "need", "new", "next", "not", "now", "off", "old", "once", "only",
  "open", "other", "our", "out", "over", "own", "part", "per", "play",
  "put", "ran", "real", "really", "rent", "rents", "rented", "run", "said",
  "same", "saw", "say", "says", "see", "seen", "seem", "set", "she",
  "should", "show", "some", "start", "stay", "stayed", "stays", "still",
  "such", "take", "talk", "tell", "tend", "told", "than", "that", "the",
  "their", "them", "then", "there", "these", "they", "thing", "think",
  "this", "through", "too", "turn", "two", "use", "very", "want", "was",
  "way", "well", "went", "were", "what", "when", "where", "which", "while",
  "who", "why", "will", "with", "work", "would", "yet", "you", "your",
]);

/** Extract likely multi-token person names, case-insensitive. */
export function extractNamedEntityPhrases(question: string): string[] {
  const explicit = question.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+\b/g) ?? [];
  if (explicit.length > 0) return explicit;

  const titled = question.replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, c: string, r: string) =>
    c.toUpperCase() + r.toLowerCase(),
  );
  const raw = titled.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})+\b/g) ?? [];
  return raw.flatMap((phrase) => {
    const words = phrase.split(/\s+/);
    let start = 0;
    while (start < words.length && ENTITY_STOP_WORDS.has(words[start].toLowerCase())) start += 1;
    let end = words.length;
    while (end > start && ENTITY_STOP_WORDS.has(words[end - 1].toLowerCase())) end -= 1;
    return end - start >= 2 ? [words.slice(start, end).join(" ")] : [];
  });
}

/** Keep explicit named-person questions anchored to matching title/text evidence. */
export function prioritizeMatchesForQuestionWithAnchor<T extends VectorMatchLike>(
  matches: readonly T[],
  question: string,
): { matches: T[]; anchored: boolean } {
  const entities = extractNamedEntityPhrases(question);
  if (entities.length === 0) return { matches: [...matches], anchored: false };

  const anchored = matches.map((match, index) => {
    const metadata = match.metadata ?? {};
    const title = String(metadata.title ?? "");
    const text = String(metadata.text ?? "");
    const titleAnchorScore = entities.reduce(
      (score, entity) => score + (phraseAppearsIn(title, entity) ? 1 : 0),
      0,
    );
    const textAnchorScore = entities.reduce(
      (score, entity) => score + (phraseAppearsIn(text, entity) ? 1 : 0),
      0,
    );
    // Episode titles identify the right conversation. A direct transcript
    // mention is stronger passage evidence and must survive the citation cap.
    const anchorScore = titleAnchorScore + textAnchorScore * (entities.length + 1);
    return { match, index, anchorScore };
  });
  const strongestAnchor = Math.max(...anchored.map((item) => item.anchorScore), 0);
  if (strongestAnchor === 0) return { matches: [...matches], anchored: false };
  const stronglyAnchoredEpisodes = new Set(anchored
    .filter((item) => item.anchorScore === strongestAnchor)
    .map((item) => item.match.metadata?.video_id ?? item.match.metadata?.videoId)
    .filter((videoId): videoId is string => typeof videoId === "string" && videoId.length > 0));

  return {
    anchored: true,
    matches: anchored
    .filter((item) => {
      if (item.anchorScore === strongestAnchor) return true;
      const videoId = item.match.metadata?.video_id ?? item.match.metadata?.videoId;
      return typeof videoId === "string" && stronglyAnchoredEpisodes.has(videoId);
    })
    .sort((left, right) => {
      if (right.anchorScore !== left.anchorScore) return right.anchorScore - left.anchorScore;
      const leftScore = typeof left.match.score === "number" && Number.isFinite(left.match.score) ? left.match.score : -Infinity;
      const rightScore = typeof right.match.score === "number" && Number.isFinite(right.match.score) ? right.match.score : -Infinity;
      return rightScore - leftScore || left.index - right.index;
    })
    .map((item) => item.match),
  };
}

export function prioritizeMatchesForQuestion<T extends VectorMatchLike>(
  matches: readonly T[],
  question: string,
): T[] {
  return prioritizeMatchesForQuestionWithAnchor(matches, question).matches;
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
  timestampStatus: TimestampStatus;
  timestampReason: string | null;
};

function youtubeWatchUrl(videoId: string, start: number | null): string {
  const base = `https://www.youtube.com/watch?v=${videoId}`;
  return start == null ? base : `${base}&t=${Math.floor(start)}s`;
}

function frameIoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const allowedHost = hostname === "f.io" || hostname === "frame.io" || hostname.endsWith(".frame.io");
    return parsed.protocol === "https:" && allowedHost ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Published citations carry a YouTube watch URL. Uncut citations carry the
 * approved Frame.io episode URL when one was persisted, otherwise a direct
 * catalogue ref (`uncut:{id}`).
 */
export function citationRef(
  stored: StoredSourceMode,
  videoId: string,
  start: number | null,
  timestamped: boolean,
  approvedFrameIoUrl: string | null = null,
): string {
  if (stored === "uncut") return approvedFrameIoUrl ?? `uncut:${videoId}`;
  return youtubeWatchUrl(videoId, timestamped ? start : null);
}

export function parseSourceMode(value: unknown): SourceMode {
  return value === "uncut" || value === "both" ? value : "published";
}

/**
 * Public episode routes are keyed by the published YouTube video id.
 * Internal row hashes and storage keys are deliberately not valid scopes.
 */
export function parseEpisodeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return YOUTUBE_VIDEO_ID.test(normalized) ? normalized : null;
}

export function buildVectorQueryOptions(episodeId: string | null, sourceMode: StoredSourceMode) {
  return {
    topK: 48,
    returnMetadata: "all" as const,
    filter: {
      source_mode: { $eq: sourceMode },
      ...(episodeId ? { video_id: { $eq: episodeId } } : {}),
    },
  };
}

/**
 * Re-check the requested scope after Vectorize returns. This prevents a
 * missing or stale metadata index from broadening an episode query.
 */
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

function uncutSourceIdentity(metadata: Record<string, unknown>, publicVideoId: string): string | null {
  const explicit = text(metadata.source_asset_id ?? metadata.sourceAssetId);
  if (explicit && explicit !== publicVideoId && explicit.length <= 128 && !/^https?:/i.test(explicit)) {
    return explicit;
  }
  const source = text(metadata.source);
  const match = /^uncut:([^/\s:][^\s]{0,127})$/.exec(source);
  return match && match[1] !== publicVideoId ? match[1] : null;
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
  const citationIdentity = stored === "uncut" ? uncutSourceIdentity(metadata, videoId) : videoId;
  if (!citationIdentity) return null;
  const approvedFrameIoUrl = stored === "uncut"
    ? frameIoUrl(metadata.frame_io_url ?? metadata.frameIoFinalEpUrl ?? metadata.frame_io_final_ep_url)
    : null;
  const url = citationRef(stored, citationIdentity, timestamped ? start : null, timestamped, approvedFrameIoUrl);
  const skill = stored === "uncut" ? APPROVED_UNCUT_SKILL : PUBLISHED_YOUTUBE_SKILL;
  const timestampStatus: TimestampStatus = !sameMode
    ? "requested_timeline_unavailable"
    : timestamped
      ? "verified"
      : "source_timing_unavailable";
  const timestampReason = timestampStatus === "verified"
    ? null
    : timestampStatus === "requested_timeline_unavailable"
      ? skill.crossTimelineReason
      : skill.missingTimestampReason;

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
    timestampStatus,
    timestampReason,
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

  // Preserve the caller's ranking. Vectorize already supplies score order, and
  // named-entity anchoring may intentionally promote a lower-score passage.
  for (const match of matches) {
    if (typeof match.score !== "number" || !Number.isFinite(match.score) || match.score < minScore) continue;
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
  requestedSourceMode: SourceMode;
  evidenceSourceMode: SourceMode | null;
  fallbackReason: "requested_mode_insufficient" | "requested_mode_not_competitive" | null;
  /** Compatibility alias for the evidence mode when evidence exists. */
  sourceMode: SourceMode;
  uncutUnavailable: boolean;
};

function evidenceMode(citations: readonly DualSourceCitation[]): SourceMode | null {
  const modes = new Set(citations.map((citation) => citation.sourceMode));
  if (modes.size === 0) return null;
  return modes.size > 1 ? "both" : citations[0].sourceMode;
}

function resolvedSources(
  requestedSourceMode: SourceMode,
  citations: DualSourceCitation[],
  uncutUnavailable: boolean,
  fallbackReason: ResolvedChatSources["fallbackReason"] = null,
): ResolvedChatSources {
  const renumbered = citations.map((citation, index) => ({ ...citation, n: index + 1 }));
  const evidenceSourceMode = evidenceMode(renumbered);
  return {
    citations: renumbered,
    requestedSourceMode,
    evidenceSourceMode,
    fallbackReason,
    sourceMode: evidenceSourceMode ?? requestedSourceMode,
    uncutUnavailable,
  };
}

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
  if (requested === "published") {
    const publishedHits = filterAndProjectMatches(matches, "published", minScore, limit, dedupeByEpisode);
    return resolvedSources(requested, publishedHits, false);
  }

  const publishedHits = filterAndProjectMatches(matches, "published", minScore, limit, dedupeByEpisode);
  const uncutHits = filterAndProjectMatches(matches, "uncut", minScore, limit, dedupeByEpisode);
  const publishedBest = publishedHits.reduce((best, hit) => Math.max(best, hit.score), -Infinity);
  const uncutBest = uncutHits.reduce((best, hit) => Math.max(best, hit.score), -Infinity);

  if (requested === "uncut") {
    if (uncutHits.length === 0 && publishedHits.length > 0) {
      return resolvedSources(requested, publishedHits, true, "requested_mode_insufficient");
    }
    if (publishedHits.length > 0 && publishedBest > uncutBest + COMPETITIVE_SCORE_DELTA) {
      return resolvedSources(requested, publishedHits, false, "requested_mode_not_competitive");
    }
    const publishedFallbackAvailable = publishedHits.length >= 2;
    if (publishedFallbackAvailable && uncutHits.length < 2) {
      return resolvedSources(
        requested,
        publishedHits,
        uncutHits.length === 0,
        "requested_mode_insufficient",
      );
    }
    return resolvedSources(
      requested,
      uncutHits,
      uncutHits.length === 0,
      uncutHits.length < 2 ? "requested_mode_insufficient" : null,
    );
  }

  const best = Math.max(publishedBest, uncutBest);
  const publishedCompetitive = publishedHits.length > 0
    && publishedBest >= best - COMPETITIVE_SCORE_DELTA;
  const uncutCompetitive = uncutHits.length > 0
    && uncutBest >= best - COMPETITIVE_SCORE_DELTA;
  if (!publishedCompetitive) {
    return resolvedSources(
      requested,
      uncutHits,
      uncutHits.length === 0,
      publishedHits.length === 0
        ? "requested_mode_insufficient"
        : "requested_mode_not_competitive",
    );
  }
  if (!uncutCompetitive) {
    return resolvedSources(
      requested,
      publishedHits,
      uncutHits.length === 0,
      uncutHits.length === 0
        ? "requested_mode_insufficient"
        : "requested_mode_not_competitive",
    );
  }

  if (!dedupeByEpisode) {
    // Episode-scoped or anchor-prioritized rankings carry multiple chunks per
    // episode — keep the plain per-mode interleave so anchored passages survive.
    const reservedPerMode = Math.max(1, Math.floor(limit / 2));
    const usedSegments = new Set<string>();
    const citations = [
      ...uncutHits.slice(0, reservedPerMode),
      ...publishedHits.slice(0, reservedPerMode),
      ...uncutHits.slice(reservedPerMode),
      ...publishedHits.slice(reservedPerMode),
    ].filter((citation) => {
      if (usedSegments.has(citation.segmentId)) return false;
      usedSegments.add(citation.segmentId);
      return true;
    }).slice(0, limit);
    return resolvedSources(requested, citations, false);
  }

  // Catalogue-scope "both": pair timelines per episode. An episode that is
  // relevant in uncut must also surface its published chunk (and vice versa),
  // so the viewer always sees the same conversation on both timelines.
  // Episodes rank by their best chunk score; each pair lists its stronger
  // timeline first, preserving most-matched-first order.
  const uncutByEpisode = new Map(uncutHits.map((hit) => [hit.videoId, hit]));
  const publishedByEpisode = new Map(publishedHits.map((hit) => [hit.videoId, hit]));
  const episodeBestScore = new Map<string, number>();
  for (const hit of [...uncutHits, ...publishedHits]) {
    episodeBestScore.set(hit.videoId, Math.max(episodeBestScore.get(hit.videoId) ?? -Infinity, hit.score));
  }
  const orderedEpisodes = [...episodeBestScore.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([videoId]) => videoId);
  const paired: DualSourceCitation[] = [];
  for (const videoId of orderedEpisodes) {
    if (paired.length >= limit) break;
    const pair = [uncutByEpisode.get(videoId), publishedByEpisode.get(videoId)]
      .filter((hit): hit is DualSourceCitation => hit != null)
      .sort((left, right) => right.score - left.score);
    for (const hit of pair) {
      if (paired.length >= limit) break;
      paired.push(hit);
    }
  }
  return resolvedSources(requested, paired, false);
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
