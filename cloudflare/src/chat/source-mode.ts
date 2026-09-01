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

export const VECTORIZE_CHAT_TOP_K = 48;

export type DualSourceCitation = {
  n: number;
  score: number;
  videoId: string;
  title: string;
  url: string;
  sourceMode: StoredSourceMode;
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
  if (value === "both") return "both";
  return value === "uncut" ? "uncut" : "published";
}

function parseStoredSourceMode(value: unknown): StoredSourceMode {
  return value === "uncut" ? "uncut" : "published";
}

export function vectorizeQueryOptions(sourceMode?: StoredSourceMode) {
  const options: { topK: number; returnMetadata: "all"; filter?: { source_mode: StoredSourceMode } } = {
    topK: VECTORIZE_CHAT_TOP_K,
    returnMetadata: "all" as const,
  };
  if (sourceMode === "uncut") options.filter = { source_mode: "uncut" };
  return options;
}

function assertionLines(answer: string): string[] {
  const periodSentinel = "\u0000";
  const protectedAnswer = String(answer || "")
    .replace(/\b([A-Z])\.(?=(?:[A-Z]\.)|(?:\s+[A-Z][a-z]))/g, `$1${periodSentinel}`)
    .replace(/\b(Ep|Mr|Ms|Mrs|Dr|Prof|Sr|Jr|Inc|Ltd|vs)\./gi, `$1${periodSentinel}`);
  return String(answer || "")
    .replace(answer, protectedAnswer)
    .split(/(?:\n+|(?<=[.!?])\s+)/)
    .map((line) => line.replaceAll(periodSentinel, ".").replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function isExplicitNoEvidence(line: string): boolean {
  return /\b(?:do not|don't|cannot|can't|couldn'?t)\b[\s\S]{0,80}\b(?:evidence|answer|verify|produce)\b/i.test(line);
}

function isSectionLeadIn(line: string): boolean {
  return line.endsWith(":") && line.length <= 120;
}

function citationNumbers(line: string): number[] | null {
  const numbers: number[] = [];
  for (const match of line.matchAll(/\[(\d+)(?:\s*-\s*(\d+))?\]/g)) {
    const start = Number(match[1]);
    const end = match[2] == null ? start : Number(match[2]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      return null;
    }
    for (let citation = start; citation <= end; citation += 1) {
      numbers.push(citation);
    }
  }
  return numbers;
}

export function answerHasRequiredCitations(answer: string, sourceCount = Number.POSITIVE_INFINITY): boolean {
  const lines = assertionLines(answer);
  if (lines.length === 0) return false;
  for (const line of lines) {
    if (isExplicitNoEvidence(line)) continue;
    if (isSectionLeadIn(line)) continue;
    const citations = citationNumbers(line);
    if (citations == null || citations.length === 0) return false;
    if (citations.some((citation) => citation < 1 || citation > sourceCount)) return false;
  }
  return true;
}

export function storedSourceMode(metadata: Record<string, unknown> | null | undefined): StoredSourceMode {
  return parseStoredSourceMode(metadata?.sourceMode ?? metadata?.source_mode);
}

export function matchPassesSourceFilter(
  match: VectorMatchLike,
  requested: SourceMode,
): boolean {
  if (requested === "both") return true;
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

function sourceKey(source: DualSourceCitation): string {
  return `${source.sourceMode}:${source.segmentId || source.videoId}`;
}

function renumber(sources: DualSourceCitation[]): DualSourceCitation[] {
  return sources.map((source, index) => ({ ...source, n: index + 1 }));
}

function balancedBothSources(
  publishedHits: DualSourceCitation[],
  uncutHits: DualSourceCitation[],
  limit: number,
): DualSourceCitation[] {
  const byKey = new Set<string>();
  const selected: DualSourceCitation[] = [];
  const add = (source: DualSourceCitation | undefined) => {
    if (!source) return;
    const key = sourceKey(source);
    if (byKey.has(key) || selected.length >= limit) return;
    byKey.add(key);
    selected.push(source);
  };

  add(uncutHits[0]);
  add(publishedHits[0]);
  [...uncutHits.slice(1), ...publishedHits.slice(1)]
    .sort((a, b) => b.score - a.score)
    .forEach(add);

  return renumber(selected);
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
): ResolvedChatSources {
  if (requested === "both") {
    const splitLimit = Math.max(limit, Math.ceil(limit / 2));
    const publishedHits = filterAndProjectMatches(matches, "published", minScore, splitLimit);
    const uncutHits = filterAndProjectMatches(matches, "uncut", minScore, splitLimit);
    return {
      citations: balancedBothSources(publishedHits, uncutHits, limit),
      sourceMode: "both",
      uncutUnavailable: false,
    };
  }

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
