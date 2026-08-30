/**
 * @file cloudflare/src/provenance/alignment-engine.ts
 * @description Cloudflare Worker & D1 Piecewise Continuous Linear Timeline Alignment Engine.
 * Implements O(log K) interval search, bidirectional coordinate conversion,
 * status classification, and mathematical symmetry verification.
 */

export type TimelineSystem = 'uncut' | 'published';

export type IntervalStatus =
  | 'matched'
  | 'cut_from_published'
  | 'added_in_published'
  | 'conflicted';

export type AlignmentStatus =
  | 'verified'
  | 'unmapped'
  | 'partial'
  | 'stale'
  | 'conflicted';

export type AlignmentAlgorithm =
  | 'dtw_forced_align'
  | 'audio_fingerprint'
  | 'manual_editor_anchor'
  | 'identity'
  | 'linear_segmented';

export type ConversionStatus =
  | 'matched'
  | 'verified'
  | 'cut_from_published'
  | 'added_in_published'
  | 'unmapped'
  | 'conflicted';

export interface TimelineInterval {
  interval_index?: number;
  intervalIndex?: number;
  uncut_start_sec?: number;
  uncutStartSec?: number;
  uncut_end_sec?: number;
  uncutEndSec?: number;
  pub_start_sec?: number;
  pubStartSec?: number;
  pub_end_sec?: number;
  pubEndSec?: number;
  interval_status?: IntervalStatus;
  status?: IntervalStatus;
  confidence?: number;
  note?: string;
}

export interface NormalizedTimelineInterval {
  intervalIndex: number;
  uncutStartSec: number;
  uncutEndSec: number;
  pubStartSec: number;
  pubEndSec: number;
  status: IntervalStatus;
  confidence: number;
  note?: string;
}

export interface TimelineAlignmentRecord {
  id: string;
  episodeId: string;
  uncutAssetId?: string;
  publishedAssetId?: string;
  algorithm: AlignmentAlgorithm;
  confidenceScore: number;
  status: AlignmentStatus;
  intervals: NormalizedTimelineInterval[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoordinateConversionResult {
  sourceTimeline: TimelineSystem;
  targetTimeline: TimelineSystem;
  sourceTimeSec: number;
  targetTimeSec: number | null;
  status: ConversionStatus;
  intervalIndex: number | null;
  confidence: number;
  note?: string;
  reason?: string;
}

export interface TimelineConversionOptions {
  boundaryEpsilonSec?: number;
  clampWithinEpsilon?: boolean;
}

export interface SymmetryCheckResult {
  symmetric: boolean;
  sampleCount: number;
  maxDeviationSec: number;
  meanDeviationSec: number;
  toleranceSec: number;
  failedSamples: Array<{
    sourceSec: number;
    convertedSec: number;
    roundTripSec: number;
    deviationSec: number;
  }>;
}

/**
 * Normalizes any interval shape (camelCase or snake_case) into a canonical NormalizedTimelineInterval.
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
  const status: IntervalStatus = (raw.status ?? raw.interval_status ?? '__invalid__') as IntervalStatus;
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
 * Parses and validates raw intervals, ensuring monotonicity and sorting.
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
 * Core Piecewise Continuous Timeline Alignment Engine.
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

    this._uncutIntervals = this._allIntervals
      .filter((inv) => inv.status !== 'added_in_published' && inv.uncutEndSec >= inv.uncutStartSec)
      .sort((a, b) => a.uncutStartSec - b.uncutStartSec);

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

  public getIntervals(): NormalizedTimelineInterval[] {
    return [...this._allIntervals];
  }

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

  public convert(
    sourceTimeline: TimelineSystem,
    timeSec: number,
    options?: TimelineConversionOptions
  ): CoordinateConversionResult {
    const targetTimeline: TimelineSystem =
      sourceTimeline === 'uncut' ? 'published' : 'uncut';
    const epsilon = options?.boundaryEpsilonSec ?? 1e-4;

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

    if (interval.status === 'conflicted') {
      return {
        sourceTimeline,
        targetTimeline,
        sourceTimeSec: timeSec,
        targetTimeSec: null,
        status: 'conflicted',
        intervalIndex: interval.intervalIndex,
        confidence: 0,
        reason: 'Interval marked as conflicted',
      };
    }

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
          const clampedTime = Math.max(u0, Math.min(u1, timeSec));
          const ratio = (clampedTime - u0) / uSpan;
          targetTime = p0 + ratio * pSpan;
        }
      } else {
        const pSpan = p1 - p0;
        const uSpan = u1 - u0;
        if (pSpan <= 0) {
          targetTime = u0;
        } else {
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

  public convertUncutToPublished(
    uncutSec: number,
    options?: TimelineConversionOptions
  ): CoordinateConversionResult {
    return this.convert('uncut', uncutSec, options);
  }

  public convertPublishedToUncut(
    pubSec: number,
    options?: TimelineConversionOptions
  ): CoordinateConversionResult {
    return this.convert('published', pubSec, options);
  }
}

export const TimelineAlignmentEngine = TimelineEngine;

export function createTimelineEngine(
  intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord
): TimelineEngine {
  return new TimelineEngine(intervalsOrRecord);
}

export function convertCoordinate(
  intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord,
  sourceTimeline: TimelineSystem,
  timeSec: number,
  options?: TimelineConversionOptions
): CoordinateConversionResult {
  const engine = new TimelineEngine(intervalsOrRecord);
  return engine.convert(sourceTimeline, timeSec, options);
}

export function verifyMathematicalSymmetry(
  intervalsOrRecord: Array<Partial<TimelineInterval>> | TimelineAlignmentRecord,
  options: { sampleCountPerInterval?: number; toleranceSec?: number } = {}
): SymmetryCheckResult {
  const engine = new TimelineEngine(intervalsOrRecord);
  const intervals = engine.getIntervals().filter((i) => i.status === 'matched');
  const samplesPerInv = options.sampleCountPerInterval ?? 20;
  const toleranceSec = options.toleranceSec ?? 1e-3;

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

/**
 * Loads an alignment record and its intervals from Cloudflare D1.
 */
export async function loadTimelineAlignment(
  db: { prepare: (query: string) => { bind: (...args: unknown[]) => { first: <T>() => Promise<T | null>; all: <T>() => Promise<{ results: T[] }> } } },
  episodeId: string
): Promise<TimelineAlignmentRecord | null> {
  const alnRow = await db
    .prepare(
      'SELECT id, episode_id, uncut_asset_id, published_asset_id, algorithm, confidence_score, status, metadata_json, created_at, updated_at FROM timeline_alignments WHERE episode_id = ? ORDER BY created_at DESC LIMIT 1'
    )
    .bind(episodeId)
    .first<{
      id: string;
      episode_id: string;
      uncut_asset_id?: string;
      published_asset_id?: string;
      algorithm: AlignmentAlgorithm;
      confidence_score: number;
      status: AlignmentStatus;
      metadata_json?: string;
      created_at: string;
      updated_at: string;
    }>();

  if (!alnRow) return null;

  const intervalRows = await db
    .prepare(
      'SELECT interval_index, uncut_start_sec, uncut_end_sec, pub_start_sec, pub_end_sec, interval_status, confidence FROM alignment_intervals WHERE alignment_id = ? ORDER BY interval_index ASC'
    )
    .bind(alnRow.id)
    .all<{
      interval_index: number;
      uncut_start_sec: number;
      uncut_end_sec: number;
      pub_start_sec: number;
      pub_end_sec: number;
      interval_status: IntervalStatus;
      confidence: number;
    }>();

  const intervals = parseAndValidateIntervals(intervalRows.results ?? []);

  return {
    id: alnRow.id,
    episodeId: alnRow.episode_id,
    uncutAssetId: alnRow.uncut_asset_id,
    publishedAssetId: alnRow.published_asset_id,
    algorithm: alnRow.algorithm,
    confidenceScore: alnRow.confidence_score,
    status: alnRow.status,
    intervals,
    createdAt: alnRow.created_at,
    updatedAt: alnRow.updated_at,
  };
}
