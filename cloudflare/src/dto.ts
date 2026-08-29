import type { AuditEvent, Operator, OperatorRole } from "./db.ts";
import type { OperatorContext } from "./auth/operator-context.ts";

export const protectedResponseHeaders: Readonly<Record<string, string>> = {
  "cache-control": "private, no-store, max-age=0",
  "cdn-cache-control": "no-store",
  "surrogate-control": "no-store",
  "vary": "Authorization, Cookie",
  "x-wtf-ops-cache": "bypass",
};

export type OperatorContextDto = Pick<OperatorContext, "operatorId" | "role" | "environment" | "correlationId">;
export type OperatorDto = Pick<Operator, "id" | "email" | "display_name" | "role" | "active" | "updated_at">;
export type AuditRowDto = Pick<AuditEvent, "occurred_at" | "actor_subject_digest" | "effective_role" | "action" | "entity_type" | "entity_id" | "outcome" | "environment" | "correlation_id">;
export type SafeOpsError = { error: "operator_unavailable" | "unauthorized" | "not_found" | "bad_request" | "conflict" };

export function operatorContextDto(context: OperatorContext): OperatorContextDto {
  return { operatorId: context.operatorId, role: context.role, environment: context.environment, correlationId: context.correlationId };
}

export function operatorDto(operator: Operator): OperatorDto {
  return { id: operator.id, email: operator.email, display_name: operator.display_name, role: operator.role, active: operator.active, updated_at: operator.updated_at };
}

export function auditRowDto(event: AuditEvent): AuditRowDto {
  return {
    occurred_at: event.occurred_at,
    actor_subject_digest: event.actor_subject_digest,
    effective_role: event.effective_role,
    action: event.action,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    outcome: event.outcome,
    environment: event.environment,
    correlation_id: event.correlation_id,
  };
}

export function safeOpsError(error: SafeOpsError["error"] = "operator_unavailable"): SafeOpsError {
  return { error };
}

export function isProtectedResponse(headers: Headers): boolean {
  return headers.get("cache-control") === protectedResponseHeaders["cache-control"]
    && headers.get("cdn-cache-control") === "no-store"
    && headers.get("x-wtf-ops-cache") === "bypass";
}

export function isOperatorRole(value: unknown): value is OperatorRole {
  return value === "super_admin" || value === "admin" || value === "editor";
}

// --------------------------------------------------------------------------
// Phase 3 Provenance Spine Records & DTOs
// --------------------------------------------------------------------------

export type ContentBucket = "podcast" | "clip" | "short" | "special" | "finance" | "online";
export type PrimaryLanguage = "en" | "hi" | "hi-Latn" | "mixed";
export type ProductionStatus = "idea" | "research" | "scheduled" | "recorded" | "in_edit" | "ready" | "published" | "archived";

export interface ChapterEntry {
  title: string;
  startSec: number;
  endSec?: number;
}

export interface EpisodeRecord {
  id: string; // ep_<ulid>
  slug: string;
  title: string;
  ip: string;
  show_title: string;
  content_bucket: ContentBucket;
  primary_language: PrimaryLanguage;
  production_status: ProductionStatus;
  published_at: string | null;
  recorded_at: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  description: string;
  chapters_json: string;
  created_at: string;
  updated_at: string;
}

export type NewEpisodeInput = {
  id?: string;
  slug: string;
  title: string;
  ip: string;
  showTitle: string;
  contentBucket?: ContentBucket;
  primaryLanguage?: PrimaryLanguage;
  productionStatus?: ProductionStatus;
  publishedAt?: string | null;
  recordedAt?: string | null;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  description?: string;
  chapters?: ChapterEntry[] | string;
};

export type UpdateEpisodeInput = Partial<Omit<NewEpisodeInput, "id">>;

export interface EpisodeDto {
  id: string;
  slug: string;
  title: string;
  ip: string;
  showTitle: string;
  contentBucket: ContentBucket;
  primaryLanguage: PrimaryLanguage;
  productionStatus: ProductionStatus;
  publishedAt: string | null;
  recordedAt: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  description: string;
  chapters: ChapterEntry[];
  createdAt: string;
  updatedAt: string;
}

export function episodeDto(record: EpisodeRecord): EpisodeDto {
  let chapters: ChapterEntry[] = [];
  try {
    chapters = JSON.parse(record.chapters_json);
  } catch {
    chapters = [];
  }
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    ip: record.ip,
    showTitle: record.show_title,
    contentBucket: record.content_bucket,
    primaryLanguage: record.primary_language,
    productionStatus: record.production_status,
    publishedAt: record.published_at,
    recordedAt: record.recorded_at,
    durationSeconds: record.duration_seconds,
    thumbnailUrl: record.thumbnail_url,
    description: record.description,
    chapters,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export type ExternalPlatform = "youtube" | "youtube_clip" | "frame_io" | "google_drive" | "zset" | "rss" | "spotify" | "apple_podcasts";

export interface ExternalIdentityRecord {
  id: number;
  episode_id: string;
  platform: ExternalPlatform;
  external_id: string;
  external_url_hash: string;
  channel_id: string | null;
  is_primary: number;
  metadata_json: string;
  observed_at: string;
}

export type NewExternalIdentityInput = {
  episodeId: string;
  platform: ExternalPlatform;
  externalId: string;
  externalUrlHash: string;
  channelId?: string | null;
  isPrimary?: boolean;
  metadata?: Record<string, unknown> | string;
};

export interface ExternalIdentityDto {
  id: number;
  episodeId: string;
  platform: ExternalPlatform;
  externalId: string;
  channelId: string | null;
  isPrimary: boolean;
  observedAt: string;
}

export function externalIdentityDto(record: ExternalIdentityRecord): ExternalIdentityDto {
  return {
    id: record.id,
    episodeId: record.episode_id,
    platform: record.platform,
    externalId: record.external_id,
    channelId: record.channel_id,
    isPrimary: record.is_primary === 1,
    observedAt: record.observed_at,
  };
}

export type SourceAssetType = "youtube_video" | "uncut_video" | "uncut_audio" | "captions_srt" | "captions_vtt" | "editorial_notes" | "sidecar_metadata";
export type StorageDriver = "r2" | "external_youtube" | "external_vault";
export type AssetAuthority = "owner_supplied" | "youtube_official" | "pipeline_generated" | "third_party";
export type AssetAvailability = "available" | "pending" | "archived" | "offline" | "error";

export interface SourceAssetRecord {
  id: string; // ast_<ulid>
  episode_id: string;
  asset_type: SourceAssetType;
  storage_driver: StorageDriver;
  storage_key: string;
  content_sha256: string;
  byte_size: number | null;
  duration_seconds: number | null;
  mime_type: string;
  authority: AssetAuthority;
  availability: AssetAvailability;
  created_at: string;
}

export type NewSourceAssetInput = {
  id?: string;
  episodeId: string;
  assetType: SourceAssetType;
  storageDriver?: StorageDriver;
  storageKey: string;
  contentSha256: string;
  byteSize?: number | null;
  durationSeconds?: number | null;
  mimeType: string;
  authority?: AssetAuthority;
  availability?: AssetAvailability;
};

export interface SourceAssetDto {
  id: string;
  episodeId: string;
  assetType: SourceAssetType;
  storageDriver: StorageDriver;
  contentSha256: string;
  byteSize: number | null;
  durationSeconds: number | null;
  mimeType: string;
  authority: AssetAuthority;
  availability: AssetAvailability;
  createdAt: string;
}

export function sourceAssetDto(record: SourceAssetRecord): SourceAssetDto {
  return {
    id: record.id,
    episodeId: record.episode_id,
    assetType: record.asset_type,
    storageDriver: record.storage_driver,
    contentSha256: record.content_sha256,
    byteSize: record.byte_size,
    durationSeconds: record.duration_seconds,
    mimeType: record.mime_type,
    authority: record.authority,
    availability: record.availability,
    createdAt: record.created_at,
  };
}

export type TranscriptionEngine = "whisper_large_v3" | "assemblyai" | "workers_ai_whisper" | "custom_asr" | "manual_editorial";
export type TranscriptionRunStatus = "pending" | "processing" | "completed" | "failed";

export interface TranscriptionRunRecord {
  id: string; // run_<ulid>
  episode_id: string;
  source_asset_id: string;
  engine: TranscriptionEngine;
  engine_version: string;
  parameters_json: string;
  diarization_enabled: number;
  speaker_count: number | null;
  status: TranscriptionRunStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type NewTranscriptionRunInput = {
  id?: string;
  episodeId: string;
  sourceAssetId: string;
  engine: TranscriptionEngine;
  engineVersion: string;
  parameters?: Record<string, unknown> | string;
  diarizationEnabled?: boolean;
  speakerCount?: number | null;
  status?: TranscriptionRunStatus;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type CoordinateSystem = "uncut" | "published";
export type TranscriptVersionState = "staging" | "active" | "archived" | "tombstoned";

export interface TranscriptVersionRecord {
  id: string; // txv_<ulid>
  episode_id: string;
  version_number: number;
  transcription_run_id: string | null;
  source_asset_id: string;
  content_sha256: string;
  coordinate_system: CoordinateSystem;
  total_segments: number;
  word_count: number;
  is_active: number;
  state: TranscriptVersionState;
  activated_at: string | null;
  created_at: string;
}

export interface TranscriptSegmentRecord {
  id: string; // seg_<ulid>
  transcript_version_id: string;
  segment_index: number;
  start_sec: number;
  end_sec: number;
  speaker_label: string;
  speaker_operator_id: number | null;
  text: string;
  text_normalized: string | null;
  language_code: PrimaryLanguage;
  confidence: number | null;
  words_json: string | null;
}

export type NewTranscriptSegmentInput = {
  id?: string;
  transcriptVersionId?: string;
  segmentIndex: number;
  startSec: number;
  endSec: number;
  speakerLabel?: string;
  speakerOperatorId?: number | null;
  text: string;
  textNormalized?: string | null;
  languageCode?: PrimaryLanguage;
  confidence?: number | null;
  wordsJson?: string | null;
};

export interface TranscriptChunkRecord {
  id: string; // chk_<ulid>
  transcript_version_id: string;
  chunk_index: number;
  vector_id: string;
  text: string;
  start_sec: number | null;
  end_sec: number | null;
  start_segment_id: string | null;
  end_segment_id: string | null;
  token_count: number;
  is_active: number;
}

export type NewTranscriptChunkInput = {
  id?: string;
  transcriptVersionId?: string;
  chunkIndex: number;
  vectorId: string;
  text: string;
  startSec?: number | null;
  endSec?: number | null;
  startSegmentId?: string | null;
  endSegmentId?: string | null;
  tokenCount: number;
  isActive?: boolean;
};

export type StageTranscriptInput = {
  id?: string;
  episodeId: string;
  versionNumber: number;
  transcriptionRunId?: string | null;
  sourceAssetId: string;
  contentSha256: string;
  coordinateSystem?: CoordinateSystem;
  segments: NewTranscriptSegmentInput[];
  chunks?: NewTranscriptChunkInput[];
};

export type TimelineAlgorithm = "dtw_forced_align" | "audio_fingerprint" | "manual_editor_anchor" | "identity";
export type TimelineStatus = "verified" | "unmapped" | "partial" | "stale" | "conflicted";
export type IntervalStatus = "matched" | "cut_from_published" | "added_in_published" | "conflicted";

export interface TimelineAlignmentRecord {
  id: string; // aln_<ulid>
  episode_id: string;
  uncut_asset_id: string;
  published_asset_id: string;
  algorithm: TimelineAlgorithm;
  confidence_score: number;
  status: TimelineStatus;
  created_at: string;
  updated_at: string;
}

export interface AlignmentIntervalRecord {
  id: number;
  alignment_id: string;
  interval_index: number;
  uncut_start_sec: number;
  uncut_end_sec: number;
  pub_start_sec: number;
  pub_end_sec: number;
  interval_status: IntervalStatus;
  confidence: number;
}

export type NewAlignmentIntervalInput = {
  intervalIndex: number;
  uncutStartSec: number;
  uncutEndSec: number;
  pubStartSec: number;
  pubEndSec: number;
  intervalStatus?: IntervalStatus;
  confidence?: number;
};

export type UpsertTimelineAlignmentInput = {
  id?: string;
  episodeId: string;
  uncutAssetId: string;
  publishedAssetId: string;
  algorithm?: TimelineAlgorithm;
  confidenceScore?: number;
  status?: TimelineStatus;
  intervals: NewAlignmentIntervalInput[];
};

export type IngestionJobType = "youtube_metadata_sync" | "youtube_captions_fetch" | "uncut_audio_ingest" | "asr_transcription" | "timeline_alignment" | "vector_indexing";
export type IngestionJobStatus = "pending" | "running" | "completed" | "failed" | "skipped_unchanged";

export interface IngestionJobRecord {
  id: string; // job_<ulid>
  job_type: IngestionJobType;
  episode_id: string | null;
  source_asset_id: string | null;
  status: IngestionJobStatus;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  payload_json: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export type NewIngestionJobInput = {
  id?: string;
  jobType: IngestionJobType;
  episodeId?: string | null;
  sourceAssetId?: string | null;
  status?: IngestionJobStatus;
  maxAttempts?: number;
  payload?: Record<string, unknown> | string;
};

export type UpdateJobInput = {
  status?: IngestionJobStatus;
  attempts?: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  payload?: Record<string, unknown> | string;
};

export type CitationResolveQuery = {
  episodeId: string;
  versionId?: string;
  segmentIndex?: number;
  timeSec?: number;
  coordinateSystem?: CoordinateSystem;
};

export interface ResolvedCitationDTO {
  episodeId: string;
  episodeTitle: string;
  episodeSlug: string;
  transcriptVersionId: string;
  versionNumber: number;
  segmentId: string;
  segmentIndex: number;
  speakerLabel: string;
  languageCode: PrimaryLanguage;
  text: string;
  uncutTime: { startSec: number; endSec: number } | null;
  publishedTime: { startSec: number; endSec: number } | null;
  matchedStatus: IntervalStatus | "unmapped";
}
