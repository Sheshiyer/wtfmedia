/**
 * @file web/lib/provenance/timeline-engine.ts
 * @description High-performance piecewise continuous linear timeline alignment engine.
 * Provides O(log K) bidirectional coordinate conversion between Uncut studio time
 * and Published YouTube video time with mathematical symmetry guarantee (|U(P(t)) - t| < 10^-3s).
 */

import type {
  TimelineSystem,
  IntervalStatus,
  ConversionStatus,
  TimelineInterval,
  NormalizedTimelineInterval,
  TimelineAlignmentRecord,
  CoordinateConversionResult,
  TimelineConversionOptions,
  SymmetryCheckResult,
} from './types';

export * from './types';

/**
 * Normalizes any raw or D1 snake_case / camelCase interval into a strict NormalizedTimelineInterval.
 */
export function normalizeInterval(
  raw: Partial<TimelineInterval>,
  fallbackIndex = 0
): NormalizedTimelineInterval {
  const uncutStart = Number(raw.uncutStartSec ?? raw.uncut_start_sec);
  const uncutEnd = Number(raw.uncutEndSec ?? raw.uncut_end_sec);
  const pubStart = Number(raw.pubStartSec ?? raw.pub_start_sec);
  const pubEnd = Number(raw.pubEndSec ?? raw.pub_end_sec);
  const intervalIndex = Number(raw.intervalIndex ?? raw.interval_index ?? fallbackIndex);
  const status: IntervalStatus =
    (raw.status ?? raw.interval_status ?? '__invalid__') as IntervalStatus;
  const confidence = Number(raw.confidence);

  return {
    intervalIndex,
    uncutStartSec: uncutStart,
    uncutEndSec: uncutEnd,
    pubStartSec: pubStart,
    pubEndSec: pubEnd,
    status,
    confidence,
    note: raw.note,
  };
}

/**
 * Parses and validates an array of interval objects.
 * Enforces monotonicity, detects overlapping intervals, and sorts appropriately.
 */
export function parseAndValidateIntervals(
  rawIntervals: Array<Partial<TimelineInterval>>
): NormalizedTimelineInterval[] {
  if (!Array.isArray(rawIntervals) || rawIntervals.length === 0) {
    return [];
  }

  const normalized = rawIntervals.map((raw, idx) => normalizeInterval(raw, idx));
  const validStatuses = new Set<IntervalStatus>([
    "matched",
    "cut_from_published",
    "added_in_published",
    "conflicted",
  ]);
  const invalid = normalized.some((item) =>
    !Number.isInteger(item.intervalIndex) ||
    item.intervalIndex < 0 ||
    !Number.isFinite(item.uncutStartSec) ||
    !Number.isFinite(item.uncutEndSec) ||
    !Number.isFinite(item.pubStartSec) ||
    !Number.isFinite(item.pubEndSec) ||
    item.uncutStartSec < 0 ||
    item.uncutEndSec < item.uncutStartSec ||
    item.pubStartSec < 0 ||
    item.pubEndSec < item.pubStartSec ||
    !Number.isFinite(item.confidence) ||
    item.confidence < 0 ||
    item.confidence > 1 ||
    !validStatuses.has(item.status)
  );
  if (invalid) return [];

  // Sort primarily by uncutStartSec, then pubStartSec
  normalized.sort((a, b) => {
    if (a.uncutStartSec !== b.uncutStartSec) {
      return a.uncutStartSec - b.uncutStartSec;
    }
    return a.pubStartSec - b.pubStartSec;
  });

  const hasOverlap = (items: NormalizedTimelineInterval[], start: keyof NormalizedTimelineInterval, end: keyof NormalizedTimelineInterval): boolean => {
    let previousEnd = -1;
    for (const item of items) {
      const itemStart = item[start] as number;
      const itemEnd = item[end] as number;
      if (itemStart < previousEnd) return true;
      previousEnd = Math.max(previousEnd, itemEnd);
    }
    return false;
  };
  const uncutIntervals = normalized
    .filter((item) => item.status !== "added_in_published")
    .sort((a, b) => a.uncutStartSec - b.uncutStartSec);
  const publishedIntervals = normalized
    .filter((item) => item.status !== "cut_from_published")
    .sort((a, b) => a.pubStartSec - b.pubStartSec);
  if (
    hasOverlap(uncutIntervals, "uncutStartSec", "uncutEndSec") ||
    hasOverlap(publishedIntervals, "pubStartSec", "pubEndSec")
  ) {
    return [];
  }

  return normalized;
}

/**
 * Piecewise continuous linear timeline alignment engine.
 * Fast binary-search index over sorted piecewise segments.
 */
export class TimelineEngine {
  private readonly _allIntervals: NormalizedTimelineInterval[];
  private readonly _uncutIntervals: NormalizedTimelineInterval[];
  private readonly _pubIntervals: NormalizedTimelineInterval[];
  private readonly _totalUncutDuration: number;
  private readonly _totalPubDuration: number;

  constructor(
    intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord
  ) {
    const rawList = Array.isArray(intervalsOrRecord)
      ? intervalsOrRecord
      : intervalsOrRecord.intervals;

    this._allIntervals = parseAndValidateIntervals(rawList ?? []);

    // Filter and sort for Uncut search (includes 'matched' and 'cut_from_published')
    this._uncutIntervals = this._allIntervals
      .filter((inv) => inv.status !== 'added_in_published' && inv.uncutEndSec >= inv.uncutStartSec)
      .sort((a, b) => a.uncutStartSec - b.uncutStartSec);

    // Filter and sort for Published search (includes 'matched' and 'added_in_published')
    this._pubIntervals = this._allIntervals
      .filter((inv) => inv.status !== 'cut_from_published' && inv.pubEndSec >= inv.pubStartSec)
      .sort((a, b) => a.pubStartSec - b.pubStartSec);

    this._totalUncutDuration = this._uncutIntervals.reduce(
      (max, inv) => Math.max(max, inv.uncutEndSec),
      0
    );
    this._totalPubDuration = this._pubIntervals.reduce(
      (max, inv) => Math.max(max, inv.pubEndSec),
      0
    );
  }

  /**
   * Returns all normalized intervals in order.
   */
  public getIntervals(): NormalizedTimelineInterval[] {
    return [...this._allIntervals];
  }

  /**
   * Returns summary statistics of the loaded timeline.
   */
  public getSummary() {
    return {
      totalUncutSec: this._totalUncutDuration,
      totalPubSec: this._totalPubDuration,
      totalIntervals: this._allIntervals.length,
      matchedCount: this._allIntervals.filter((i) => i.status === 'matched').length,
      cutCount: this._allIntervals.filter((i) => i.status === 'cut_from_published').length,
      addedCount: this._allIntervals.filter((i) => i.status === 'added_in_published').length,
      conflictedCount: this._allIntervals.filter((i) => i.status === 'conflicted').length,
    };
  }

  /**
   * Performs O(log K) binary search to find the active interval for a timestamp.
   */
  private _binarySearchInterval(
    intervals: NormalizedTimelineInterval[],
    timeSec: number,
    system: TimelineSystem,
    epsilon = 1e-4
  ): NormalizedTimelineInterval | null {
    if (intervals.length === 0 || timeSec < 0) {
      return null;
    }

    let low = 0;
    let high = intervals.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const interval = intervals[mid];
      const start = system === 'uncut' ? interval.uncutStartSec : interval.pubStartSec;
      const end = system === 'uncut' ? interval.uncutEndSec : interval.pubEndSec;

      if (timeSec < start - epsilon) {
        high = mid - 1;
      } else if (timeSec > end + epsilon) {
        low = mid + 1;
      } else {
        // Matched inside or at boundary [start - eps, end + eps]
        // If query is exactly on boundary between two intervals, check next for preferred match
        if (mid + 1 < intervals.length) {
          const next = intervals[mid + 1];
          const nextStart = system === 'uncut' ? next.uncutStartSec : next.pubStartSec;
          if (timeSec >= nextStart - epsilon && timeSec <= nextStart + epsilon) {
            // Coordinates are right-continuous at an exact shared boundary.
            // This preserves the next matched segment after a cut/added span
            // instead of mapping through the prior segment's duplicate endpoint.
            if (next.status === 'matched') {
              return next;
            }
          }
        }
        return interval;
      }
    }

    return null;
  }

  /**
   * Converts a coordinate between Uncut and Published timelines.
   */
  public convert(
    sourceTimeline: TimelineSystem,
    timeSec: number,
    options?: TimelineConversionOptions
  ): CoordinateConversionResult {
    const targetTimeline: TimelineSystem =
      sourceTimeline === 'uncut' ? 'published' : 'uncut';
    const epsilon = options?.boundaryEpsilonSec ?? 1e-4;

    // Reject negative timestamps immediately
    if (timeSec < 0 || !Number.isFinite(timeSec)) {
      return {
        sourceTimeline,
        targetTimeline,
        sourceTimeSec: timeSec,
        targetTimeSec: null,
        status: 'unmapped',
        intervalIndex: null,
        confidence: 0,
        reason: 'Negative or invalid timestamp',
      };
    }

    const searchList =
      sourceTimeline === 'uncut' ? this._uncutIntervals : this._pubIntervals;
    const interval = this._binarySearchInterval(searchList, timeSec, sourceTimeline, epsilon);

    if (!interval) {
      return {
        sourceTimeline,
        targetTimeline,
        sourceTimeSec: timeSec,
        targetTimeSec: null,
        status: 'unmapped',
        intervalIndex: null,
        confidence: 0,
        reason: 'Timestamp falls outside mapped episode duration',
      };
    }

    // Handle conflicted intervals
    if (interval.status === 'conflicted') {
      return {
        sourceTimeline,
        targetTimeline,
        sourceTimeSec: timeSec,
        targetTimeSec: null,
        status: 'conflicted',
        intervalIndex: interval.intervalIndex,
        confidence: 0,
        reason: 'Interval is marked as conflicted or ambiguous',
      };
    }

    // Handle cut sections (present in Uncut, absent in Published)
    if (interval.status === 'cut_from_published') {
      if (sourceTimeline === 'uncut') {
        return {
          sourceTimeline: 'uncut',
          targetTimeline: 'published',
          sourceTimeSec: timeSec,
          targetTimeSec: null,
          status: 'cut_from_published',
          intervalIndex: interval.intervalIndex,
          confidence: interval.confidence,
          reason: 'Moment was trimmed/excluded from the published YouTube cut',
        };
      }
      return {
        sourceTimeline: 'published',
        targetTimeline: 'uncut',
        sourceTimeSec: timeSec,
        targetTimeSec: null,
        status: 'unmapped',
        intervalIndex: null,
        confidence: 0,
        reason: 'Timestamp falls outside published intervals',
      };
    }

    // Handle added sections (present in Published, absent in Uncut)
    if (interval.status === 'added_in_published') {
      if (sourceTimeline === 'published') {
        return {
          sourceTimeline: 'published',
          targetTimeline: 'uncut',
          sourceTimeSec: timeSec,
          targetTimeSec: null,
          status: 'added_in_published',
          intervalIndex: interval.intervalIndex,
          confidence: interval.confidence,
          reason: 'Intro bumper/sponsor graphics added in post-production, not in uncut studio recording',
        };
      }
      return {
        sourceTimeline: 'uncut',
        targetTimeline: 'published',
        sourceTimeSec: timeSec,
        targetTimeSec: null,
        status: 'unmapped',
        intervalIndex: null,
        confidence: 0,
        reason: 'Timestamp falls outside uncut intervals',
      };
    }

    // Handle matched intervals (Exact Linear Interpolation)
    if (interval.status === 'matched') {
      const u0 = interval.uncutStartSec;
      const u1 = interval.uncutEndSec;
      const p0 = interval.pubStartSec;
      const p1 = interval.pubEndSec;

      let targetTime: number;

      if (sourceTimeline === 'uncut') {
        const uSpan = u1 - u0;
        const pSpan = p1 - p0;
        if (uSpan <= 0) {
          targetTime = p0;
        } else {
          // Clamp timeSec within interval if minor epsilon overshoot
          const clampedTime = Math.max(u0, Math.min(u1, timeSec));
          const ratio = (clampedTime - u0) / uSpan;
          targetTime = p0 + ratio * pSpan;
        }
      } else {
        // sourceTimeline === 'published'
        const pSpan = p1 - p0;
        const uSpan = u1 - u0;
        if (pSpan <= 0) {
          targetTime = u0;
        } else {
          // Clamp timeSec within interval if minor epsilon overshoot
          const clampedTime = Math.max(p0, Math.min(p1, timeSec));
          const ratio = (clampedTime - p0) / pSpan;
          targetTime = u0 + ratio * uSpan;
        }
      }

      return {
        sourceTimeline,
        targetTimeline,
        sourceTimeSec: timeSec,
        targetTimeSec: targetTime,
        status: 'matched',
        intervalIndex: interval.intervalIndex,
        confidence: interval.confidence,
        note: interval.note,
      };
    }

    return {
      sourceTimeline,
      targetTimeline,
      sourceTimeSec: timeSec,
      targetTimeSec: null,
      status: 'unmapped',
      intervalIndex: null,
      confidence: 0,
      reason: 'Unknown interval state',
    };
  }

  /**
   * Helper shortcut: converts Uncut time to Published time.
   */
  public convertUncutToPublished(
    uncutSec: number,
    options?: TimelineConversionOptions
  ): CoordinateConversionResult {
    return this.convert('uncut', uncutSec, options);
  }

  /**
   * Helper shortcut: converts Published time to Uncut time.
   */
  public convertPublishedToUncut(
    pubSec: number,
    options?: TimelineConversionOptions
  ): CoordinateConversionResult {
    return this.convert('published', pubSec, options);
  }
}

/**
 * Standard factory function to instantiate a TimelineEngine.
 */
export function createTimelineEngine(
  intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord
): TimelineEngine {
  return new TimelineEngine(intervalsOrRecord);
}

/**
 * Functional stateless converter conforming to the interface in PROJECT.md and Plan 03-05.
 */
export function convertCoordinate(
  intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord,
  sourceTimeline: TimelineSystem,
  timeSec: number,
  options?: TimelineConversionOptions
): CoordinateConversionResult {
  const engine = new TimelineEngine(intervalsOrRecord);
  return engine.convert(sourceTimeline, timeSec, options);
}

/**
 * Verifies the mathematical symmetry guarantee: |U(P(t)) - t| < toleranceSec
 * across all matched intervals for a given alignment.
 */
export function verifyMathematicalSymmetry(
  intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord,
  options: { sampleCountPerInterval?: number; toleranceSec?: number } = {}
): SymmetryCheckResult {
  const engine = new TimelineEngine(intervalsOrRecord);
  const intervals = engine.getIntervals().filter((i) => i.status === 'matched');
  const samplesPerInv = options.sampleCountPerInterval ?? 20;
  const toleranceSec = options.toleranceSec ?? 1e-3; // 1 millisecond

  let maxDeviationSec = 0;
  let totalDeviationSec = 0;
  let totalSamples = 0;
  const failedSamples: SymmetryCheckResult['failedSamples'] = [];

  for (const inv of intervals) {
    const pSpan = inv.pubEndSec - inv.pubStartSec;
    if (pSpan <= 0) continue;

    // The mapping is intentionally discontinuous at editorial cut/add boundaries.
    // Test interior coordinates only; boundary behavior has its own deterministic tests.
    for (let step = 0; step < samplesPerInv; step++) {
      const frac = (step + 0.5) / samplesPerInv;
      const originalPub = inv.pubStartSec + frac * pSpan;

      // Round-trip 1: Published -> Uncut -> Published
      const toUncut = engine.convertPublishedToUncut(originalPub);
      if (toUncut.status === 'matched' && toUncut.targetTimeSec !== null) {
        const roundTripPub = engine.convertUncutToPublished(toUncut.targetTimeSec);
        if (roundTripPub.status === 'matched' && roundTripPub.targetTimeSec !== null) {
          const dev = Math.abs(roundTripPub.targetTimeSec - originalPub);
          maxDeviationSec = Math.max(maxDeviationSec, dev);
          totalDeviationSec += dev;
          totalSamples++;

          if (dev > toleranceSec) {
            failedSamples.push({
              sourceSec: originalPub,
              convertedSec: toUncut.targetTimeSec,
              roundTripSec: roundTripPub.targetTimeSec,
              deviationSec: dev,
            });
          }
        }
      }

      // Round-trip 2: Uncut -> Published -> Uncut
      const uSpan = inv.uncutEndSec - inv.uncutStartSec;
      if (uSpan > 0) {
        const originalUncut = inv.uncutStartSec + frac * uSpan;
        const toPub = engine.convertUncutToPublished(originalUncut);
        if (toPub.status === 'matched' && toPub.targetTimeSec !== null) {
          const roundTripUncut = engine.convertPublishedToUncut(toPub.targetTimeSec);
          if (roundTripUncut.status === 'matched' && roundTripUncut.targetTimeSec !== null) {
            const dev = Math.abs(roundTripUncut.targetTimeSec - originalUncut);
            maxDeviationSec = Math.max(maxDeviationSec, dev);
            totalDeviationSec += dev;
            totalSamples++;

            if (dev > toleranceSec) {
              failedSamples.push({
                sourceSec: originalUncut,
                convertedSec: toPub.targetTimeSec,
                roundTripSec: roundTripUncut.targetTimeSec,
                deviationSec: dev,
              });
            }
          }
        }
      }
    }
  }

  const meanDeviationSec = totalSamples > 0 ? totalDeviationSec / totalSamples : 0;

  return {
    symmetric: failedSamples.length === 0,
    sampleCount: totalSamples,
    maxDeviationSec,
    meanDeviationSec,
    toleranceSec,
    failedSamples,
  };
}

/**
 * Creates an identity 1:1 timeline alignment for uncut episodes that had no post-production cuts.
 */
export function createIdentityAlignment(
  episodeId: string,
  durationSec: number
): TimelineAlignmentRecord {
  return {
    id: `aln_identity_${episodeId}`,
    episodeId,
    algorithm: 'identity',
    confidenceScore: 1.0,
    status: 'verified',
    intervals: [
      {
        intervalIndex: 0,
        uncutStartSec: 0,
        uncutEndSec: durationSec,
        pubStartSec: 0,
        pubEndSec: durationSec,
        status: 'matched',
        confidence: 1.0,
      },
    ],
  };
}

/** Alias for compatibility with Plan 03-05 class naming */
export const TimelineAlignmentEngine = TimelineEngine;
