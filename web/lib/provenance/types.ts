/**
 * @file web/lib/provenance/types.ts
 * @description Canonical type definitions for WTF OS provenance spine,
 * timeline alignment intervals, coordinate conversion, and asset metadata.
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

/**
 * Raw or D1 database interval representation supporting both camelCase and snake_case properties.
 */
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

/**
 * Validated and normalized in-memory interval representation with strict numerical types.
 */
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

/**
 * Timeline alignment record header with full interval payload.
 */
export interface TimelineAlignmentRecord {
  id: string; // aln_<ulid>
  episodeId: string; // ep_<ulid>
  uncutAssetId?: string; // ast_<ulid>
  publishedAssetId?: string; // ast_<ulid>
  algorithm: AlignmentAlgorithm;
  confidenceScore: number;
  status: AlignmentStatus;
  intervals: NormalizedTimelineInterval[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type TimelineAlignment = TimelineAlignmentRecord;

/**
 * Result of bidirectional coordinate conversion.
 */
export interface CoordinateConversionResult {
  sourceTimeline: TimelineSystem;
  targetTimeline: TimelineSystem;
  sourceTimeSec: number;
  targetTimeSec: number | null; // null if cut, added, unmapped, or conflicted
  status: ConversionStatus;
  intervalIndex: number | null;
  confidence: number;
  note?: string;
  reason?: string;
}

/**
 * Query options for timeline conversion.
 */
export interface TimelineConversionOptions {
  /** Optional tolerance in seconds for edge boundary matching (default: 0.001) */
  boundaryEpsilonSec?: number;
  /** If true, clamp coordinates to interval boundary instead of returning null for minor sub-epsilon overshoot */
  clampWithinEpsilon?: boolean;
}

/**
 * Mathematical symmetry verification summary.
 */
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
 * Ground-truth evaluation fixture shape for 10-episode benchmark.
 */
export interface BenchmarkEpisodeFixture {
  episodeId: string;
  title: string;
  description: string;
  uncutDurationSec: number;
  publishedDurationSec: number;
  intervals: TimelineInterval[];
  testPoints: BenchmarkTestPoint[];
}

export interface BenchmarkTestPoint {
  description: string;
  sourceTimeline: TimelineSystem;
  sourceTimeSec: number;
  expectedTargetTimeSec: number | null;
  expectedStatus: ConversionStatus;
  toleranceSec?: number;
}

// ---------------------------------------------------------------------------
// Canonical Provenance Spine D1 / DTO Schema Types
// ---------------------------------------------------------------------------

export type EpisodeContentBucket = 'podcast' | 'clip' | 'short' | 'special' | 'finance' | 'online';
export type EpisodePrimaryLanguage = 'en' | 'hi' | 'hi-Latn' | 'mixed';
export type EpisodeProductionStatus = 'idea' | 'research' | 'scheduled' | 'recorded' | 'in_edit' | 'ready' | 'published' | 'archived';

export interface EpisodeRecord {
  id: string; // ep_<ulid>
  slug: string;
  title: string;
  ip: string;
  show_title: string;
  content_bucket: EpisodeContentBucket;
  primary_language: EpisodePrimaryLanguage;
  production_status: EpisodeProductionStatus;
  published_at: string | null;
  recorded_at: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  description: string;
  chapters_json: string;
  created_at: string;
  updated_at: string;
}

export type SourceAssetType =
  | 'youtube_video'
  | 'uncut_video'
  | 'uncut_audio'
  | 'captions_srt'
  | 'captions_vtt'
  | 'editorial_notes'
  | 'sidecar_metadata';

export type SourceStorageDriver = 'r2' | 'external_youtube' | 'external_vault';
export type SourceAssetAuthority = 'owner_supplied' | 'youtube_official' | 'pipeline_generated' | 'third_party';
export type SourceAssetAvailability = 'available' | 'pending' | 'archived' | 'offline' | 'error';

export interface SourceAssetRecord {
  id: string; // ast_<ulid>
  episode_id: string;
  asset_type: SourceAssetType;
  storage_driver: SourceStorageDriver;
  storage_key: string;
  content_sha256: string;
  byte_size: number | null;
  duration_seconds: number | null;
  mime_type: string;
  authority: SourceAssetAuthority;
  availability: SourceAssetAvailability;
  created_at: string;
}

export interface TranscriptSegmentRecord {
  id: string; // tsg_<ulid>
  version_id: string; // trv_<ulid>
  segment_index: number;
  start_time_sec: number;
  end_time_sec: number;
  speaker_id: string;
  language_code: string;
  text_raw: string;
  text_normalized: string;
  confidence: number;
  created_at: string;
}

export interface DualPlaybackCoordinate {
  episodeId: string;
  activeTimeline: TimelineSystem;
  uncutTimeSec: number | null;
  publishedTimeSec: number | null;
  status: ConversionStatus;
  confidence: number;
  youtubeVideoId?: string;
  uncutMediaUrl?: string;
}
