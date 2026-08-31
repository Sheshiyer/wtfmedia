export type TimestampOrigin = "source_native" | "published_text_alignment" | "unmapped";
export type TimestampPrecision = "exact" | "estimated" | "unavailable";

export interface PublishedTranscriptSegment {
  publishedSegmentId: string;
  publishedIndex: number;
  startSec: number;
  text: string;
}

export interface UncutTranscriptSegment {
  uncutSegmentId: string;
  uncutIndex: number;
  sourceNativeTimeSec?: number;
  text: string;
}

export interface TranscriptAlignmentOptions {
  confidenceThreshold?: number;
  lexicalAnchorThreshold?: number;
}

export interface PreparedTranscriptTime {
  uncutSegmentId: string;
  uncutIndex: number;
  preparedTimeSec: number | null;
  origin: TimestampOrigin;
  precision: TimestampPrecision;
  confidence: number;
  matchedPublishedSegmentId: string | null;
  matchedPublishedIndex: number | null;
  boundStartSec: number | null;
  boundEndSec: number | null;
  confidenceComponents: {
    lexical: number;
    support: number;
    bounds: number;
  };
}

type ValidPublishedSegment = PublishedTranscriptSegment & {
  normalizedTokens: string[];
  wordOffset: number;
};

type Anchor = {
  uncutPosition: number;
  published: ValidPublishedSegment;
  lexical: number;
  confidence: number;
  uncutWordOffset: number;
  preparedTimeSec: number;
};

const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
const DEFAULT_LEXICAL_ANCHOR_THRESHOLD = 0.75;

function boundedUnit(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .normalize("NFKD")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function lexicalSimilarity(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const leftCounts = new Map<string, number>();
  for (const token of left) leftCounts.set(token, (leftCounts.get(token) ?? 0) + 1);
  let overlap = 0;
  for (const token of right) {
    const remaining = leftCounts.get(token) ?? 0;
    if (remaining <= 0) continue;
    overlap += 1;
    leftCounts.set(token, remaining - 1);
  }
  return round((2 * overlap) / (left.length + right.length));
}

function unavailable(segment: UncutTranscriptSegment): PreparedTranscriptTime {
  return {
    uncutSegmentId: segment.uncutSegmentId,
    uncutIndex: segment.uncutIndex,
    preparedTimeSec: null,
    origin: "unmapped",
    precision: "unavailable",
    confidence: 0,
    matchedPublishedSegmentId: null,
    matchedPublishedIndex: null,
    boundStartSec: null,
    boundEndSec: null,
    confidenceComponents: {
      lexical: 0,
      support: 0,
      bounds: 0,
    },
  };
}

function exact(segment: UncutTranscriptSegment): PreparedTranscriptTime {
  const time = segment.sourceNativeTimeSec as number;
  return {
    uncutSegmentId: segment.uncutSegmentId,
    uncutIndex: segment.uncutIndex,
    preparedTimeSec: time,
    origin: "source_native",
    precision: "exact",
    confidence: 1,
    matchedPublishedSegmentId: null,
    matchedPublishedIndex: null,
    boundStartSec: time,
    boundEndSec: time,
    confidenceComponents: {
      lexical: 1,
      support: 1,
      bounds: 1,
    },
  };
}

function hasExplicitNativeTime(segment: UncutTranscriptSegment): boolean {
  return Object.prototype.hasOwnProperty.call(segment, "sourceNativeTimeSec");
}

function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function chooseAnchors(
  published: readonly ValidPublishedSegment[],
  uncut: readonly UncutTranscriptSegment[],
  uncutTokens: readonly string[][],
  lexicalThreshold: number,
): Map<number, Anchor> {
  const anchors = new Map<number, Anchor>();
  let lastPublishedIndex = Number.NEGATIVE_INFINITY;
  let lastPublishedTime = Number.NEGATIVE_INFINITY;
  let uncutWordOffset = 0;

  for (let uncutPosition = 0; uncutPosition < uncut.length; uncutPosition += 1) {
    const segment = uncut[uncutPosition];
    const segmentWordOffset = uncutWordOffset;
    uncutWordOffset += uncutTokens[uncutPosition].length;
    if (hasExplicitNativeTime(segment) || uncutTokens[uncutPosition].length === 0) continue;

    let best: ValidPublishedSegment | null = null;
    let bestLexical = 0;
    for (const candidate of published) {
      if (candidate.publishedIndex <= lastPublishedIndex || candidate.startSec < lastPublishedTime) continue;
      const lexical = lexicalSimilarity(uncutTokens[uncutPosition], candidate.normalizedTokens);
      if (lexical < lexicalThreshold) continue;
      if (
        best === null
        || lexical > bestLexical
        || (lexical === bestLexical && candidate.publishedIndex < best.publishedIndex)
      ) {
        best = candidate;
        bestLexical = lexical;
      }
    }

    if (!best) continue;
    const confidence = round(0.8 * bestLexical + 0.2);
    anchors.set(uncutPosition, {
      uncutPosition,
      published: best,
      lexical: bestLexical,
      confidence,
      uncutWordOffset: segmentWordOffset,
      preparedTimeSec: best.startSec,
    });
    lastPublishedIndex = best.publishedIndex;
    lastPublishedTime = best.startSec;
  }

  return anchors;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function secondsPerWord(published: readonly ValidPublishedSegment[]): number | null {
  const samples = [];
  for (let index = 1; index < published.length; index += 1) {
    const duration = published[index].startSec - published[index - 1].startSec;
    const words = published[index].wordOffset - published[index - 1].wordOffset;
    if (duration <= 0 || words <= 0) continue;
    const sample = duration / words;
    if (sample >= 0.05 && sample <= 2) samples.push(sample);
  }
  const value = median(samples);
  return value == null ? null : round(value);
}

function projectAnchorTimes(
  anchors: Map<number, Anchor>,
  published: readonly ValidPublishedSegment[],
): void {
  const rate = secondsPerWord(published);
  if (rate == null) return;
  let previous = 0;
  for (const anchor of [...anchors.values()].sort((left, right) => left.uncutPosition - right.uncutPosition)) {
    const insertedWordDelta = anchor.uncutWordOffset - anchor.published.wordOffset;
    const projected = Math.max(0, anchor.published.startSec + insertedWordDelta * rate);
    anchor.preparedTimeSec = round(Math.max(previous, projected));
    previous = anchor.preparedTimeSec;
  }
}

function estimatedFromAnchor(
  segment: UncutTranscriptSegment,
  anchor: Anchor,
  confidenceThreshold: number,
): PreparedTranscriptTime {
  if (anchor.confidence < confidenceThreshold) return unavailable(segment);
  return {
    uncutSegmentId: segment.uncutSegmentId,
    uncutIndex: segment.uncutIndex,
    preparedTimeSec: anchor.preparedTimeSec,
    origin: "published_text_alignment",
    precision: "estimated",
    confidence: anchor.confidence,
    matchedPublishedSegmentId: anchor.published.publishedSegmentId,
    matchedPublishedIndex: anchor.published.publishedIndex,
    boundStartSec: anchor.preparedTimeSec,
    boundEndSec: anchor.preparedTimeSec,
    confidenceComponents: {
      lexical: anchor.lexical,
      support: 1,
      bounds: 1,
    },
  };
}

function estimatedBetweenAnchors(
  segment: UncutTranscriptSegment,
  position: number,
  previous: Anchor,
  next: Anchor,
  confidenceThreshold: number,
): PreparedTranscriptTime {
  const span = next.uncutPosition - previous.uncutPosition;
  if (span <= 0 || next.preparedTimeSec < previous.preparedTimeSec) return unavailable(segment);
  const fraction = (position - previous.uncutPosition) / span;
  const preparedTimeSec = round(
    previous.preparedTimeSec
    + (next.preparedTimeSec - previous.preparedTimeSec) * fraction,
  );
  const insertedCount = Math.max(1, span - 1);
  const duration = next.preparedTimeSec - previous.preparedTimeSec;
  const components = {
    lexical: round((previous.lexical + next.lexical) / 2),
    support: round(1 / (1 + insertedCount / 8)),
    bounds: round(Math.max(0, 1 - duration / 600)),
  };
  const confidence = round(Math.min(
    0.95,
    0.6 * components.lexical + 0.2 * components.support + 0.2 * components.bounds,
  ));
  if (confidence < confidenceThreshold) return unavailable(segment);
  return {
    uncutSegmentId: segment.uncutSegmentId,
    uncutIndex: segment.uncutIndex,
    preparedTimeSec,
    origin: "published_text_alignment",
    precision: "estimated",
    confidence,
    matchedPublishedSegmentId: null,
    matchedPublishedIndex: null,
    boundStartSec: previous.preparedTimeSec,
    boundEndSec: next.preparedTimeSec,
    confidenceComponents: components,
  };
}

/**
 * Produces privacy-safe timing metadata for uncut transcript segments.
 *
 * Source-native clocks remain exact. Published transcript clocks may only
 * produce explicitly estimated coordinates after monotonic lexical matching;
 * the function never returns transcript text, URLs, storage keys, or bodies.
 */
export function prepareTranscriptAlignment(
  publishedSegments: readonly PublishedTranscriptSegment[],
  uncutSegments: readonly UncutTranscriptSegment[],
  options: TranscriptAlignmentOptions = {},
): PreparedTranscriptTime[] {
  const confidenceThreshold = boundedUnit(
    options.confidenceThreshold,
    DEFAULT_CONFIDENCE_THRESHOLD,
  );
  const lexicalThreshold = boundedUnit(
    options.lexicalAnchorThreshold,
    DEFAULT_LEXICAL_ANCHOR_THRESHOLD,
  );
  const publishedBase = publishedSegments
    .filter((segment) => (
      validTime(segment.startSec)
      && Number.isInteger(segment.publishedIndex)
      && segment.publishedIndex >= 0
    ))
    .map((segment) => ({ ...segment, normalizedTokens: normalizeTokens(segment.text) }))
    .filter((segment) => segment.normalizedTokens.length > 0)
    .sort((left, right) => (
      left.publishedIndex - right.publishedIndex
      || left.startSec - right.startSec
      || left.publishedSegmentId.localeCompare(right.publishedSegmentId)
    ));
  let publishedWordOffset = 0;
  const published: ValidPublishedSegment[] = publishedBase.map((segment) => {
    const prepared = { ...segment, wordOffset: publishedWordOffset };
    publishedWordOffset += segment.normalizedTokens.length;
    return prepared;
  });
  const uncut = uncutSegments.map((segment) => ({ ...segment }));
  const uncutTokens = uncut.map((segment) => normalizeTokens(segment.text));
  const anchors = chooseAnchors(published, uncut, uncutTokens, lexicalThreshold);
  projectAnchorTimes(anchors, published);
  const anchorList = [...anchors.values()].sort((left, right) => left.uncutPosition - right.uncutPosition);

  return uncut.map((segment, position) => {
    if (hasExplicitNativeTime(segment)) {
      return validTime(segment.sourceNativeTimeSec) && uncutTokens[position].length > 0
        ? exact(segment)
        : unavailable(segment);
    }
    if (uncutTokens[position].length === 0) return unavailable(segment);

    const anchor = anchors.get(position);
    if (anchor) return estimatedFromAnchor(segment, anchor, confidenceThreshold);

    const previous = anchorList.findLast((candidate) => candidate.uncutPosition < position);
    const next = anchorList.find((candidate) => candidate.uncutPosition > position);
    if (!previous || !next) return unavailable(segment);
    return estimatedBetweenAnchors(segment, position, previous, next, confidenceThreshold);
  });
}
