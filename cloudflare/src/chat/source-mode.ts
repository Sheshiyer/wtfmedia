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
 * Targeted per-episode lookup for the counterpart timeline a both-mode result
 * is missing. The catalogue window (topK per mode) can exclude an episode's
 * other timeline entirely when its chunks score low, so pairing alone cannot
 * surface it — a filtered query pinned to the episode always can.
 */
export function buildCounterpartQueryOptions(videoId: string, sourceMode: StoredSourceMode) {
  return {
    topK: 8,
    returnMetadata: "all" as const,
    filter: {
      video_id: { $eq: videoId },
      source_mode: { $eq: sourceMode },
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
 * Re-label a both-mode resolution after counterpart backfill re-attached the
 * timeline the competitiveness gate had dropped. The gate resolves to a
 * single mode (e.g. "uncut" when published scored > 0.05 below uncut's best),
 * but the backfill then restores published counterparts — leaving the stale
 * single-mode label on a response that now carries both timelines. The public
 * layer reads that label and strips the counterpart's verified timestamps as
 * cross-timeline, which is exactly the "published time unavailable" bug.
 * When the final evidence is dual, the response mode must say so; the
 * not-competitive caveat no longer applies once both timelines are present.
 * The same staleness applies in the other direction: once uncut-only
 * episodes are dropped from the evidence (dropUncutOnlyEpisodes), an
 * "uncut" label over published-only rows must read "published".
 */
export function withRestoredDualMode(
  resolved: ResolvedChatSources,
  citations: readonly Pick<DualSourceCitation, "sourceMode">[],
): ResolvedChatSources {
  if (resolved.requestedSourceMode !== "both" || resolved.sourceMode === "both") return resolved;
  const modes = new Set(citations.map((citation) => citation.sourceMode));
  const evidenceMode = modes.size === 2
    ? "both"
    : modes.has("published") && resolved.sourceMode === "uncut"
      ? "published"
      : null;
  if (!evidenceMode) return resolved;
  return {
    ...resolved,
    sourceMode: evidenceMode,
    evidenceSourceMode: evidenceMode,
    fallbackReason: resolved.fallbackReason === "requested_mode_not_competitive"
      ? null
      : resolved.fallbackReason,
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

  // Every catalogue episode has both timelines, so once an episode earns its
  // place above the score floor, attach the other timeline's chunk even when
  // that chunk scored below the floor on its own. The counterpart is chosen by
  // text overlap with the episode's above-floor chunk, so both entries show
  // the SAME MOMENT of the conversation — a few seconds of edit offset apart,
  // never two unrelated passages an hour apart. When nothing overlaps, the
  // strongest-scoring chunk is the honest fallback.
  const bestRawByModeAndEpisode = new Map<string, VectorMatchLike>();
  const candidatesByModeAndEpisode = new Map<string, VectorMatchLike[]>();
  for (const match of matches) {
    if (typeof match?.score !== "number" || !Number.isFinite(match.score)) continue;
    const metadata = match.metadata ?? {};
    const videoId = text(metadata.video_id ?? metadata.videoId);
    if (!videoId) continue;
    const key = `${storedSourceMode(metadata)}:${videoId}`;
    const bucket = candidatesByModeAndEpisode.get(key);
    if (bucket) bucket.push(match);
    else candidatesByModeAndEpisode.set(key, [match]);
    const current = bestRawByModeAndEpisode.get(key);
    const currentScore = typeof current?.score === "number" ? current.score : -Infinity;
    if (match.score > currentScore) bestRawByModeAndEpisode.set(key, match);
  }

  const paired: DualSourceCitation[] = [];
  for (const videoId of orderedEpisodes) {
    if (paired.length >= limit) break;
    const pair = [uncutByEpisode.get(videoId), publishedByEpisode.get(videoId)]
      .filter((hit): hit is DualSourceCitation => hit != null)
      .sort((left, right) => right.score - left.score);
    for (const stored of ["uncut", "published"] as const) {
      if (pair.some((hit) => hit.sourceMode === stored)) continue;
      const anchorMode: StoredSourceMode = stored === "uncut" ? "published" : "uncut";
      const anchorText = text(bestRawByModeAndEpisode.get(`${anchorMode}:${videoId}`)?.metadata?.text);
      const candidates = candidatesByModeAndEpisode.get(`${stored}:${videoId}`) ?? [];
      const picked = pickProjectableCounterpart(
        anchorText || null,
        candidates.length > 0 ? candidates : [bestRawByModeAndEpisode.get(`${stored}:${videoId}`)].filter((m): m is VectorMatchLike => m != null),
        "both",
        paired.length + pair.length,
      );
      if (picked) pair.push(picked.citation);
    }
    pair.sort((left, right) => right.score - left.score);
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

/**
 * Word-shingle containment: how much of `anchor` appears in `candidate`.
 * Used to pair the same conversation moment across timelines — chunking and
 * wording differ slightly between uncut and published transcripts, so exact
 * matching fails where shingle overlap holds.
 */
export function textOverlapScore(anchor: string, candidate: string): number {
  const anchorTokens = tokens(anchor);
  if (anchorTokens.length === 0) return 0;
  const candidateTokens = new Set(tokens(candidate));
  if (candidateTokens.size === 0) return 0;
  if (anchorTokens.length < 3) {
    const hits = anchorTokens.filter((token) => candidateTokens.has(token)).length;
    return hits / anchorTokens.length;
  }
  const shingles: string[] = [];
  for (let i = 0; i + 3 <= anchorTokens.length; i += 1) {
    shingles.push(anchorTokens.slice(i, i + 3).join(" "));
  }
  const candidateText = ` ${tokens(candidate).join(" ")} `;
  const hits = shingles.filter((shingle) => candidateText.includes(` ${shingle} `)).length;
  return hits / shingles.length;
}

/**
 * Pick the counterpart chunk carrying the same conversation moment as the
 * anchor citation. Falls back to the strongest-scoring candidate when no
 * candidate shares text with the anchor.
 */
export function pickSameMomentCounterpart(
  anchorText: string,
  candidates: readonly VectorMatchLike[],
): VectorMatchLike | null {
  if (candidates.length === 0) return null;
  let best: VectorMatchLike | null = null;
  let bestOverlap = 0;
  for (const candidate of candidates) {
    const overlap = textOverlapScore(anchorText, text(candidate.metadata?.text));
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = candidate;
    }
  }
  if (best) return best;
  return candidates.reduce<VectorMatchLike | null>((strongest, candidate) => {
    const score = typeof candidate.score === "number" ? candidate.score : -Infinity;
    const strongestScore = typeof strongest?.score === "number" ? strongest.score : -Infinity;
    return score > strongestScore ? candidate : strongest;
  }, null);
}


/**
 * Order counterpart candidates by text overlap with the anchor (strongest
 * score breaks ties) and return the first one that survives projection.
 * Legacy duplicate chunks whose uncut identity equals the public video id
 * fail closed in projection; skipping unprojectable candidates keeps that
 * guard intact while the properly-ingested copy still pairs.
 */
export function pickProjectableCounterpart(
  anchorText: string | null,
  candidates: readonly VectorMatchLike[],
  requested: SourceMode,
  index: number,
): { match: VectorMatchLike; citation: DualSourceCitation } | null {
  const overlapCache = new Map<VectorMatchLike, number>();
  const overlapOf = (candidate: VectorMatchLike): number => {
    if (!anchorText) return 0;
    const cached = overlapCache.get(candidate);
    if (cached !== undefined) return cached;
    const value = textOverlapScore(anchorText, text(candidate.metadata?.text));
    overlapCache.set(candidate, value);
    return value;
  };
  const ordered = [...candidates].sort((left, right) => {
    const overlapDelta = overlapOf(right) - overlapOf(left);
    if (overlapDelta !== 0) return overlapDelta;
    const leftScore = typeof left.score === "number" ? left.score : -Infinity;
    const rightScore = typeof right.score === "number" ? right.score : -Infinity;
    return rightScore - leftScore;
  });
  for (const match of ordered) {
    const citation = projectDualSourceCitation(match, requested, index);
    if (citation) return { match, citation };
  }
  return null;
}

/**
 * Run the per-episode counterpart query. Published pairing is a hard
 * guarantee — an uncut excerpt must never render alone while its published
 * cut is ingested — so a transient Vectorize failure on the published
 * direction is retried once instead of leaving the episode single-timeline.
 * The uncut direction stays single-attempt: a missing uncut copy is
 * acceptable, a missing published copy is not.
 */
export async function queryCounterpartMatches(
  vectorize: { query: (vector: unknown, options: unknown) => Promise<{ matches?: readonly VectorMatchLike[] }> },
  vector: unknown,
  videoId: string,
  missing: StoredSourceMode,
): Promise<readonly VectorMatchLike[]> {
  const options = buildCounterpartQueryOptions(videoId, missing);
  try {
    const result = await vectorize.query(vector, options);
    return result?.matches ?? [];
  } catch (error) {
    if (missing !== "published") throw error;
    const retried = await vectorize.query(vector, options);
    return retried?.matches ?? [];
  }
}

/**
 * Published is the floor of every answer: an episode that can only show an
 * uncut excerpt is dropped from the evidence set entirely. Uncut survives
 * only alongside its published cut. The one exception is a result with no
 * published evidence at all — dropping everything would leave the answer
 * unsourced, so the uncut-only set passes through unchanged (an explicit
 * "uncut" request never reaches this helper).
 */
export function dropUncutOnlyEpisodes<T extends { videoId: string; sourceMode: string }>(
  sources: readonly T[],
): T[] {
  const publishedEpisodes = new Set<string>();
  for (const source of sources) {
    if (source.sourceMode !== "uncut") publishedEpisodes.add(source.videoId);
  }
  if (publishedEpisodes.size === 0) return [...sources];
  return sources.filter(
    (source) => source.sourceMode !== "uncut" || publishedEpisodes.has(source.videoId),
  );
}

/**
 * Episodes in a resolved result that show only one timeline. In "both" mode
 * every episode has both timelines ingested, so a gap means the counterpart
 * fell outside the retrieval window — the caller should backfill it with a
 * buildCounterpartQueryOptions query.
 */
export function findSingleTimelineGaps(
  citations: readonly DualSourceCitation[],
): Array<{ videoId: string; missing: StoredSourceMode }> {
  const modesByEpisode = new Map<string, Set<StoredSourceMode>>();
  for (const citation of citations) {
    const stored: StoredSourceMode = citation.sourceMode === "uncut" ? "uncut" : "published";
    const modes = modesByEpisode.get(citation.videoId) ?? new Set<StoredSourceMode>();
    modes.add(stored);
    modesByEpisode.set(citation.videoId, modes);
  }
  const gaps: Array<{ videoId: string; missing: StoredSourceMode }> = [];
  for (const [videoId, modes] of modesByEpisode) {
    if (!modes.has("uncut")) gaps.push({ videoId, missing: "uncut" });
    if (!modes.has("published")) gaps.push({ videoId, missing: "published" });
  }
  return gaps;
}

/**
 * KV key holding the measured uncut-vs-published clock offset for an episode.
 * Some uncut transcripts were ingested on a different timeline clock than the
 * published cut (pre-roll, cold open); the alignment job measures the drift
 * and stores `alignment:uncut-offset:{videoId}` as JSON
 * `{ "offset": <seconds>, "pairs": <aligned chunk pairs> }`.
 */
export const UNCUT_OFFSET_KEY_PREFIX = "alignment:uncut-offset:";

/** Drift below this threshold is normal chunking jitter — leave it alone. */
export const UNCUT_OFFSET_MIN_SECONDS = 5;

export interface UncutClockOffset {
  offset: number;
  pairs: number;
}

export function parseUncutClockOffset(raw: string | null): UncutClockOffset | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { offset?: unknown; pairs?: unknown };
    const offset = typeof parsed.offset === "number" ? parsed.offset : Number.NaN;
    if (!Number.isFinite(offset)) return null;
    return { offset, pairs: typeof parsed.pairs === "number" ? parsed.pairs : 0 };
  } catch {
    return null;
  }
}

/**
 * Shift an uncut citation onto the published clock by subtracting the
 * measured offset. Only verified-timestamp uncut citations move — unverified
 * ones already render as "time unavailable", and offsetting an unverified
 * number would only make it wrong with more confidence. Drift below
 * UNCUT_OFFSET_MIN_SECONDS is chunking jitter and is left alone.
 */
export function applyUncutClockOffset(
  citation: DualSourceCitation,
  offset: UncutClockOffset | null,
): DualSourceCitation {
  if (
    !offset
    || citation.sourceMode !== "uncut"
    || citation.start == null
    || !citation.timestamped
    || Math.abs(offset.offset) < UNCUT_OFFSET_MIN_SECONDS
  ) {
    return citation;
  }
  const corrected = Math.max(0, Math.round((citation.start - offset.offset) * 10) / 10);
  return { ...citation, start: corrected };
}

/**
 * How certain we are that a citation's timestamp is exact — this is what the
 * public confidence badge reports (it is NOT the content-match score).
 *
 * - verified published timing is the reference clock: 98%
 * - verified uncut timing corrected by a measured alignment scales with the
 *   number of aligned chunk pairs behind the measurement: 90–97%
 * - verified uncut timing with no alignment measurement: 85%
 * - uncut timing we tried but failed to align (pairs: 0 marker): 55%
 * - anything without a verified timestamp: 25%
 */
export function timestampConfidenceFor(
  citation: Pick<DualSourceCitation, "sourceMode" | "timestampStatus">,
  offset: UncutClockOffset | null,
): number {
  // >90% is reserved for moments we are genuinely sure of; estimated and
  // weak timing land in the 50–60% band so the badge never overstates.
  if (citation.timestampStatus !== "verified") return 0.25;
  if (citation.sourceMode !== "uncut") return 0.97;
  if (!offset) return 0.6;
  if (offset.pairs <= 0) return 0.5;
  const scaled = 0.9 + 0.07 * (Math.min(offset.pairs, 20) / 20);
  return Math.round(scaled * 1000) / 1000;
}
