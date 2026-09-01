/**
 * Public citation helpers for Ask WTF.
 *
 * This module intentionally contains no episode catalog, private provenance,
 * asset path, or alignment data. Public screens receive safe citation fields;
 * an owner-authorized Worker projection is required before Uncut playback or
 * dual-timeline alignment can be rendered.
 */

import { publicTimestampForMode, type MappingStatus, type SourceMode } from "./source-mode";
import { createTimelineEngine, parseAndValidateIntervals } from "./timeline-engine";
import type {
  DualPlaybackCoordinate,
  NormalizedTimelineInterval,
  TimelineInterval,
  TimelineSystem,
} from "./types";

export type CatalogShowCategory = string;

/**
 * Safe shape for a future, server-projected episode record. It deliberately
 * excludes storage keys, media URLs, hashes, and internal deliverable links.
 */
export interface CatalogEpisodeMapping {
  id: string;
  slug: string;
  title: string;
  showCategory: CatalogShowCategory;
  episodeNumber?: string;
  guests?: string;
  shootDate?: string | null;
  postingDate?: string | null;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  durationSec?: number;
  /** Supplied only by a trusted server projection; never inferred in-browser. */
  intervals?: TimelineInterval[];
}

export interface CatalogSnapshot {
  snapshotAt: string;
  version: string;
  purpose: string;
  totalEpisodes: number;
  categories: string[];
  episodes: CatalogEpisodeMapping[];
}

const EMPTY_PUBLIC_CATALOG: CatalogSnapshot = Object.freeze({
  snapshotAt: "",
  version: "public-projection-required",
  purpose: "Public citation resolution is intentionally catalog-free until the Worker projection is available.",
  totalEpisodes: 0,
  categories: [],
  episodes: [],
});

/**
 * Returns an empty projection rather than importing private catalog material
 * into a browser bundle.
 */
export function getCatalogSnapshot(): CatalogSnapshot {
  return EMPTY_PUBLIC_CATALOG;
}

export function getCatalogEpisodes(): CatalogEpisodeMapping[] {
  return [];
}

export function getCatalogEpisodeById(_id: string): CatalogEpisodeMapping | undefined {
  return undefined;
}

export function getCatalogEpisodeBySlug(_slug: string): CatalogEpisodeMapping | undefined {
  return undefined;
}

export function getCatalogEpisodeByVideoId(_videoId: string): CatalogEpisodeMapping | undefined {
  return undefined;
}

export function getCatalogEpisodesByCategory(_category: string): CatalogEpisodeMapping[] {
  return [];
}

/**
 * Browser code must not search a local source catalog. A future authenticated
 * server endpoint can supply a specific safe projection to the caller instead.
 */
export function findCatalogEpisode(_query: string): CatalogEpisodeMapping | undefined {
  return undefined;
}

/**
 * Normalizes explicitly supplied alignment intervals. There is no fallback
 * identity mapping: absent alignment is represented by an empty result.
 */
export function getTimelineIntervalsForEpisode(
  episodeOrIdOrVideoId: string | CatalogEpisodeMapping,
): NormalizedTimelineInterval[] {
  if (typeof episodeOrIdOrVideoId !== "object" || !episodeOrIdOrVideoId.intervals) {
    return [];
  }

  return parseAndValidateIntervals(episodeOrIdOrVideoId.intervals);
}

function parseTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function extractTimestampFromUrl(url: string): number | null {
  try {
    const parsed = new URL(url);
    const raw = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
    if (!raw) return null;
    const match = /^(\d+)(?:s)?$/i.exec(raw);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function isYouTubeVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
}

function extractYouTubeVideoId(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isYouTubeHost = host === "youtube.com" || host.endsWith(".youtube.com");
    const candidate = host === "youtu.be"
      ? parsed.pathname.slice(1).split("/")[0]
      : isYouTubeHost
        ? parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).at(-1)
        : null;
    return candidate && isYouTubeVideoId(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * Resolves only public citation fields. It intentionally never returns an
 * untrusted Uncut media URL, guessed alignment, or claim that a moment was cut.
 */
export function resolveCitation(citation: {
  episodeId?: string;
  episode_id?: string;
  videoId?: string;
  video_id?: string;
  url?: string;
  title?: string;
  timestampSec?: number;
  timeSec?: number;
  startTimeSec?: number;
  t?: number;
  sourceMode?: SourceMode;
  mappingStatus?: MappingStatus;
  requestedMode?: SourceMode;
}): {
  episode: CatalogEpisodeMapping | null;
  activeTimeSec: number | null;
  youtubeVideoId: string | null;
  uncutMediaUrl: null;
  intervals: NormalizedTimelineInterval[];
  isUncutOnly: false;
} {
  const requested = citation.requestedMode ?? citation.sourceMode ?? "published";
  const explicitTime =
    parseTimestamp(citation.timestampSec) ??
    parseTimestamp(citation.timeSec) ??
    parseTimestamp(citation.startTimeSec) ??
    parseTimestamp(citation.t);
  const urlTime = extractTimestampFromUrl(citation.url ?? "");
  const activeTimeSec = publicTimestampForMode({
    requested,
    citationMode: citation.sourceMode ?? requested,
    mappingStatus: citation.mappingStatus,
    timeSec: explicitTime ?? urlTime,
  });
  const candidateVideoId = citation.videoId ?? citation.video_id;
  const explicitVideoId = candidateVideoId && isYouTubeVideoId(candidateVideoId)
    ? candidateVideoId
    : null;

  return {
    episode: null,
    activeTimeSec,
    youtubeVideoId: explicitVideoId ?? extractYouTubeVideoId(citation.url),
    uncutMediaUrl: null,
    intervals: [],
    isUncutOnly: false,
  };
}

/**
 * Returns a non-fabricated coordinate result when a trusted alignment has not
 * been projected to the browser.
 */
export function getDualPlaybackCoordinate(params: {
  episodeIdOrVideoId: string;
  sourceTimeline: TimelineSystem;
  timeSec: number;
}): DualPlaybackCoordinate {
  const conversion = createTimelineEngine([]).convert(params.sourceTimeline, params.timeSec);
  const sourceTime = Number.isFinite(params.timeSec) && params.timeSec >= 0 ? params.timeSec : null;

  return {
    episodeId: params.episodeIdOrVideoId,
    activeTimeline: params.sourceTimeline,
    uncutTimeSec: params.sourceTimeline === "uncut" ? sourceTime : null,
    publishedTimeSec: params.sourceTimeline === "published" ? sourceTime : null,
    status: conversion.status,
    confidence: conversion.confidence,
  };
}
