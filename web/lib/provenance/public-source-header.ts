/**
 * Safe parser for the public Ask WTF citation header.
 *
 * The API serializes its public projection as URI-encoded JSON. This parser
 * accepts that transport detail, then returns only the documented public
 * fields. It intentionally drops unexpected data rather than passing it to
 * client components.
 */

import { isMappingStatus, parseSourceMode, type MappingStatus, type SourceMode } from "./source-mode";

export interface PublicSourceCitation {
  episodeId?: string;
  videoId?: string;
  title?: string;
  url?: string;
  score?: number;
  timeSec?: number;
  sourceMode?: SourceMode;
  mappingStatus?: MappingStatus;
  segmentId?: string;
}

type SourceRecord = Record<string, unknown>;

function textField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }

  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseHeaderJson(header: string): unknown {
  const candidates = [header];
  try {
    candidates.unshift(decodeURIComponent(header));
  } catch {
    // A raw JSON header is supported for backwards-compatible local tests.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next transport representation.
    }
  }

  return [];
}

function normalizeSource(value: unknown): PublicSourceCitation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as SourceRecord;
  const source: PublicSourceCitation = {};
  const episodeId = textField(raw.episodeId ?? raw.episode_id);
  const videoId = textField(raw.videoId ?? raw.video_id);
  const title = textField(raw.title);
  const url = textField(raw.url);
  const score = nonNegativeNumber(raw.score);
  const timeSec =
    nonNegativeNumber(raw.timeSec) ??
    nonNegativeNumber(raw.timestampSec) ??
    nonNegativeNumber(raw.startTimeSec) ??
    nonNegativeNumber(raw.t);
  const sourceMode = parseSourceMode(raw.sourceMode ?? raw.source_mode);
  const mappingStatus = isMappingStatus(raw.mappingStatus)
    ? raw.mappingStatus
    : isMappingStatus(raw.mapping_status)
      ? raw.mapping_status
      : undefined;
  const segmentId = textField(raw.segmentId ?? raw.segment_id);

  if (episodeId) source.episodeId = episodeId;
  if (videoId) source.videoId = videoId;
  if (title) source.title = title;
  if (url) source.url = url;
  if (score !== undefined) source.score = score;
  if (timeSec !== undefined) source.timeSec = timeSec;
  if (raw.sourceMode != null || raw.source_mode != null) source.sourceMode = sourceMode;
  if (mappingStatus) source.mappingStatus = mappingStatus;
  if (segmentId) source.segmentId = segmentId;

  return Object.keys(source).length > 0 ? source : null;
}

/**
 * Decodes the documented `X-Sources` projection. Malformed headers and
 * records with no public fields fail closed to an empty result.
 */
export function parsePublicSourceHeader(header: string | null): PublicSourceCitation[] {
  if (!header) return [];

  const parsed = parseHeaderJson(header);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    const source = normalizeSource(item);
    return source ? [source] : [];
  });
}
