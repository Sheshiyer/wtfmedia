import {
  isTimestampStatus,
  type SourceMode,
  type TimestampStatus,
} from "@/lib/provenance/source-mode";
import { calibrateRetrievalScore } from "@/lib/provenance/confidence";

/**
 * The one public-answer projection: edge (or member-metadata) sources and
 * moments projected to the snake_case provenance shape every surface renders.
 * The public /api/chat route serializes these into the X-Sources / X-Moments
 * headers; member chat projects stored turn metadata through the same
 * functions so /beta/chat renders byte-identical structure.
 *
 * Inputs are deliberately dual-casing tolerant: raw records may arrive
 * camelCase (edge answer payload, member turn metadata) or snake_case
 * (already-projected records, fixtures).
 */

export type EdgeSource = {
  n: number;
  score: number;
  videoId: string;
  title: string;
  url: string;
  start: number | null;
  timestamped: boolean;
  sourceMode?: SourceMode;
  mappingStatus?: "mapped" | "unmapped" | "unavailable" | "conflicted";
  timestampStatus?: TimestampStatus;
  timestampReason?: string | null;
  timestampConfidence?: number;
  segmentId?: string;
};

export type EdgeMoment = {
  videoId: string;
  title: string;
  url: string;
  startSec: number;
  endSec: number | null;
  durationSec: number | null;
  durationEstimated?: boolean;
  score: number;
  timestampConfidence: number | null;
  citationNumbers: number[];
  withinBudget: boolean;
  guest?: string;
  theme?: string;
  topic?: string;
  summary?: string;
  whyRelevant?: string;
  strength?: number;
};

type RawRecord = Record<string, unknown>;

const pick = (raw: RawRecord, ...keys: string[]) => {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
};

const MAPPING_STATUSES = new Set(["mapped", "unmapped", "unavailable", "conflicted"]);
type MappingStatus = "mapped" | "unmapped" | "unavailable" | "conflicted";

const PUBLIC_TIMESTAMP_REASONS = new Set([
  "This published transcript was ingested without timestamp data; the link opens the full episode.",
  "This approved uncut transcript has no verified uncut timestamp; no published time was inferred.",
  "A published timestamp is not an uncut timestamp; no cross-timeline time was inferred.",
  "An uncut timestamp is not a published timestamp; no cross-timeline time was inferred.",
]);

function isApprovedFrameIoUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const allowedHost = hostname === "f.io" || hostname === "frame.io" || hostname.endsWith(".frame.io");
    return parsed.protocol === "https:" && allowedHost;
  } catch {
    return false;
  }
}

function publicMappingStatus(value: unknown, fallback: MappingStatus): MappingStatus {
  return typeof value === "string" && MAPPING_STATUSES.has(value)
    ? value as MappingStatus
    : fallback;
}

function publicTimestampReason(
  source: RawRecord,
  mode: Exclude<SourceMode, "both">,
  status: TimestampStatus,
): string | null {
  const declared = pick(source, "timestampReason", "timestamp_reason");
  if (status === "verified") return null;
  if (typeof declared === "string" && PUBLIC_TIMESTAMP_REASONS.has(declared)) {
    return declared;
  }
  if (status === "requested_timeline_unavailable") {
    return mode === "uncut"
      ? "An uncut timestamp is not a published timestamp; no cross-timeline time was inferred."
      : "A published timestamp is not an uncut timestamp; no cross-timeline time was inferred.";
  }
  return mode === "uncut"
    ? "This approved uncut transcript has no verified uncut timestamp; no published time was inferred."
    : "This published transcript was ingested without timestamp data; the link opens the full episode.";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textField(value: unknown, max = 300): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function secondsField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Project raw answer sources to the public snake_case provenance shape. */
export function projectPublicSources(sources: unknown, sourceMode: SourceMode): Record<string, unknown>[] {
  const raw = Array.isArray(sources) ? sources as RawRecord[] : [];
  return raw.flatMap((source, index) => {
    if (!source || typeof source !== "object") return [];
    const videoId = pick(source, "videoId", "video_id");
    const declaredMode = pick(source, "sourceMode", "source_mode");
    const mode: Exclude<SourceMode, "both"> = declaredMode === "uncut"
      || (declaredMode == null && sourceMode === "uncut")
      ? "uncut"
      : "published";
    const rawStart = numberOrNull(pick(source, "start", "t", "timeSec"));
    const candidateStart = sourceMode === "both" || mode === sourceMode ? rawStart : null;
    const declaredTimestampStatusRaw = pick(source, "timestampStatus", "timestamp_status");
    const declaredTimestampStatus = isTimestampStatus(declaredTimestampStatusRaw)
      ? declaredTimestampStatusRaw
      : undefined;
    const timestampStatus: TimestampStatus = candidateStart == null
      ? declaredTimestampStatus === "requested_timeline_unavailable"
        ? "requested_timeline_unavailable"
        : "source_timing_unavailable"
      : declaredTimestampStatus === "source_timing_unavailable"
        || declaredTimestampStatus === "requested_timeline_unavailable"
        ? declaredTimestampStatus
        : "verified";
    const start = timestampStatus === "verified" ? candidateStart : null;
    const url = typeof source.url === "string" ? source.url : "";
    const direct = mode === "uncut"
      ? (isApprovedFrameIoUrl(url)
        ? url
        : url.startsWith("uncut:")
          ? url
          : `uncut:${String(videoId ?? "")}`)
      : url;
    const timestampConfidence = pick(source, "timestampConfidence", "timestamp_confidence");
    const segmentId = pick(source, "segmentId", "segment_id");
    return [{
      n: numberOrNull(source.n) ?? index + 1,
      video_id: videoId,
      title: source.title,
      score: calibrateRetrievalScore(numberOrNull(source.score) ?? undefined),
      score_raw: source.score,
      t: start,
      time: start == null ? "" : new Date(start * 1_000).toISOString().slice(11, 19).replace(/^00:/, ""),
      url: mode === "uncut"
        ? (isApprovedFrameIoUrl(direct) ? direct : undefined)
        : direct,
      source_mode: mode,
      mapping_status: publicMappingStatus(
        pick(source, "mappingStatus", "mapping_status"),
        start == null ? "unmapped" : "mapped",
      ),
      timestamp_status: timestampStatus,
      timestamp_reason: publicTimestampReason(source, mode, timestampStatus),
      timestamp_confidence: typeof timestampConfidence === "number"
          && Number.isFinite(timestampConfidence)
        ? Math.round(Math.min(1, Math.max(0, timestampConfidence)) * 1000) / 1000
        : null,
      segment_id: segmentId ?? (mode === "uncut" ? `uncut:${String(videoId ?? "")}` : null),
    }];
  });
}

/**
 * Moments arrive already structured; this projection re-checks every field
 * anyway — the data crosses a process boundary and must fail closed to "no
 * moments" rather than trust the shape.
 */
export function projectPublicMoments(answer: {
  moments?: unknown;
  totalMomentDurationSec?: unknown;
  durationBudgetSec?: unknown;
}): Record<string, unknown> {
  const raw = Array.isArray(answer.moments) ? answer.moments as RawRecord[] : [];
  const moments = raw.flatMap((moment) => {
    if (!moment || typeof moment !== "object") return [];
    const videoId = textField(pick(moment, "videoId", "video_id"), 32);
    const startSec = secondsField(pick(moment, "startSec", "start_sec"));
    if (!videoId || startSec == null) return [];
    const strength = Number(moment.strength);
    const citationNumbers = pick(moment, "citationNumbers", "citation_numbers");
    const durationEstimated = pick(moment, "durationEstimated", "duration_estimated");
    const withinBudget = pick(moment, "withinBudget", "within_budget");
    return [{
      video_id: videoId,
      title: textField(moment.title, 200) ?? videoId,
      url: textField(moment.url, 500) ?? `https://www.youtube.com/watch?v=${videoId}`,
      start_sec: startSec,
      end_sec: secondsField(pick(moment, "endSec", "end_sec")),
      duration_sec: secondsField(pick(moment, "durationSec", "duration_sec")),
      duration_estimated: durationEstimated === true ? true : null,
      score: secondsField(moment.score) ?? 0,
      timestamp_confidence: secondsField(pick(moment, "timestampConfidence", "timestamp_confidence")),
      citation_numbers: Array.isArray(citationNumbers)
        ? citationNumbers.filter((n) => Number.isSafeInteger(n) && n > 0)
        : [],
      within_budget: withinBudget !== false,
      guest: textField(moment.guest),
      theme: textField(moment.theme),
      topic: textField(moment.topic),
      summary: textField(moment.summary, 400),
      why_relevant: textField(pick(moment, "whyRelevant", "why_relevant"), 300),
      strength: Number.isInteger(strength) && strength >= 1 && strength <= 5 ? strength : null,
    }];
  });
  return {
    moments,
    total_duration_sec: secondsField(answer.totalMomentDurationSec) ?? 0,
    budget_sec: secondsField(answer.durationBudgetSec),
  };
}
