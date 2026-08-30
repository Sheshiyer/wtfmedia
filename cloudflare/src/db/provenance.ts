/**
 * Typed Cloudflare D1 Data Access Layer (DAL) for Phase 3 Provenance Spine.
 * Manages episodes, multi-platform identities, media source assets, transcription runs,
 * transcript versions, diarized segments, timeline alignments, chunks, and ingestion jobs.
 */

import type { DB } from "../db.ts";
import type {
  AlignmentIntervalRecord,
  CitationResolveQuery,
  EpisodeRecord,
  ExternalIdentityRecord,
  ExternalPlatform,
  IngestionJobRecord,
  IngestionJobStatus,
  NewAlignmentIntervalInput,
  NewEpisodeInput,
  NewExternalIdentityInput,
  NewIngestionJobInput,
  NewSourceAssetInput,
  NewTranscriptionRunInput,
  NewTranscriptSegmentInput,
  ProductionStatus,
  ResolvedCitationDTO,
  SourceAssetRecord,
  StageTranscriptInput,
  TimelineAlignmentRecord,
  TranscriptionRunRecord,
  TranscriptionRunStatus,
  TranscriptSegmentRecord,
  TranscriptVersionRecord,
  UpdateEpisodeInput,
  UpdateJobInput,
  UpsertTimelineAlignmentInput,
} from "../dto.ts";
import {
  alignmentUlid,
  assetUlid,
  chunkUlid,
  episodeUlid,
  jobUlid,
  runUlid,
  segmentUlid,
  transcriptVersionUlid,
} from "../utils/ulid.ts";

/**
 * Asserts that all 10 canonical provenance spine tables exist in D1.
 */
export async function assertProvenanceMigrations(db: DB): Promise<void> {
  const tables = [
    "episodes",
    "episode_external_identities",
    "source_assets",
    "transcription_runs",
    "transcript_versions",
    "transcript_segments",
    "timeline_alignments",
    "alignment_intervals",
    "transcript_chunks",
    "ingestion_jobs",
  ];

  const query = `SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN (${tables.map(() => "?").join(", ")})`;
  const result = await db.prepare(query).bind(...tables).first<{ count: number }>();

  if (!result || result.count !== tables.length) {
    throw new Error("provenance_migrations_required");
  }
}

// --------------------------------------------------------------------------
// Episodes DAL
// --------------------------------------------------------------------------

export async function upsertEpisode(db: DB, input: NewEpisodeInput): Promise<EpisodeRecord> {
  await assertProvenanceMigrations(db);

  const id = input.id ?? episodeUlid();
  const slug = input.slug.trim();
  const title = input.title.trim();
  const ip = input.ip.trim();
  const showTitle = input.showTitle.trim();
  const contentBucket = input.contentBucket ?? "podcast";
  const primaryLanguage = input.primaryLanguage ?? "hi-Latn";
  const productionStatus = input.productionStatus ?? "published";
  const publishedAt = input.publishedAt ?? null;
  const recordedAt = input.recordedAt ?? null;
  const durationSeconds = input.durationSeconds ?? null;
  const thumbnailUrl = input.thumbnailUrl ?? null;
  const description = input.description ?? "";
  const chaptersJson = typeof input.chapters === "string"
    ? input.chapters
    : JSON.stringify(input.chapters ?? []);

  const sql = `
    INSERT INTO episodes (
      id, slug, title, ip, show_title, content_bucket, primary_language,
      production_status, published_at, recorded_at, duration_seconds,
      thumbnail_url, description, chapters_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      ip = excluded.ip,
      show_title = excluded.show_title,
      content_bucket = excluded.content_bucket,
      primary_language = excluded.primary_language,
      production_status = excluded.production_status,
      published_at = coalesce(excluded.published_at, episodes.published_at),
      recorded_at = coalesce(excluded.recorded_at, episodes.recorded_at),
      duration_seconds = coalesce(excluded.duration_seconds, episodes.duration_seconds),
      thumbnail_url = coalesce(excluded.thumbnail_url, episodes.thumbnail_url),
      description = excluded.description,
      chapters_json = excluded.chapters_json,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    RETURNING *
  `;

  const row = await db.prepare(sql)
    .bind(
      id, slug, title, ip, showTitle, contentBucket, primaryLanguage,
      productionStatus, publishedAt, recordedAt, durationSeconds,
      thumbnailUrl, description, chaptersJson
    )
    .first<EpisodeRecord>();

  if (!row) {
    throw new Error("failed_to_upsert_episode");
  }
  return row;
}

export async function getEpisodeById(db: DB, id: string): Promise<EpisodeRecord | null> {
  await assertProvenanceMigrations(db);
  return (await db.prepare("SELECT * FROM episodes WHERE id = ?").bind(id).first<EpisodeRecord>()) ?? null;
}

export async function getEpisodeBySlug(db: DB, slug: string): Promise<EpisodeRecord | null> {
  await assertProvenanceMigrations(db);
  return (await db.prepare("SELECT * FROM episodes WHERE slug = ?").bind(slug.trim()).first<EpisodeRecord>()) ?? null;
}

export async function listEpisodes(
  db: DB,
  options?: { limit?: number; offset?: number; status?: ProductionStatus }
): Promise<EpisodeRecord[]> {
  await assertProvenanceMigrations(db);
  const limit = Math.min(options?.limit ?? 50, 100);
  const offset = options?.offset ?? 0;

  if (options?.status) {
    const res = await db.prepare("SELECT * FROM episodes WHERE production_status = ? ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?")
      .bind(options.status, limit, offset)
      .all<EpisodeRecord>();
    return res.results;
  }

  const res = await db.prepare("SELECT * FROM episodes ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all<EpisodeRecord>();
  return res.results;
}

// --------------------------------------------------------------------------
// External Identities DAL
// --------------------------------------------------------------------------

export async function recordExternalIdentity(db: DB, input: NewExternalIdentityInput): Promise<ExternalIdentityRecord> {
  await assertProvenanceMigrations(db);

  const metadataJson = typeof input.metadata === "string"
    ? input.metadata
    : JSON.stringify(input.metadata ?? {});

  const isPrimary = input.isPrimary ? 1 : 0;

  const sql = `
    INSERT INTO episode_external_identities (
      episode_id, platform, external_id, external_url_hash, channel_id, is_primary, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform, external_id) DO UPDATE SET
      episode_id = excluded.episode_id,
      external_url_hash = excluded.external_url_hash,
      channel_id = coalesce(excluded.channel_id, episode_external_identities.channel_id),
      is_primary = excluded.is_primary,
      metadata_json = excluded.metadata_json,
      observed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    RETURNING *
  `;

  const row = await db.prepare(sql)
    .bind(
      input.episodeId,
      input.platform,
      input.externalId,
      input.externalUrlHash,
      input.channelId ?? null,
      isPrimary,
      metadataJson
    )
    .first<ExternalIdentityRecord>();

  if (!row) {
    throw new Error("failed_to_record_external_identity");
  }
  return row;
}

export async function getExternalIdentitiesForEpisode(db: DB, episodeId: string): Promise<ExternalIdentityRecord[]> {
  await assertProvenanceMigrations(db);
  const res = await db.prepare("SELECT * FROM episode_external_identities WHERE episode_id = ? ORDER BY is_primary DESC, observed_at DESC")
    .bind(episodeId)
    .all<ExternalIdentityRecord>();
  return res.results;
}

export async function getEpisodeByExternalIdentity(
  db: DB,
  platform: ExternalPlatform,
  externalId: string
): Promise<EpisodeRecord | null> {
  await assertProvenanceMigrations(db);
  const sql = `
    SELECT e.* FROM episodes e
    INNER JOIN episode_external_identities i ON e.id = i.episode_id
    WHERE i.platform = ? AND i.external_id = ?
    LIMIT 1
  `;
  return (await db.prepare(sql).bind(platform, externalId).first<EpisodeRecord>()) ?? null;
}

// --------------------------------------------------------------------------
// Source Assets DAL
// --------------------------------------------------------------------------

export async function createSourceAsset(db: DB, input: NewSourceAssetInput): Promise<SourceAssetRecord> {
  await assertProvenanceMigrations(db);

  const id = input.id ?? assetUlid();
  const storageDriver = input.storageDriver ?? "r2";
  const authority = input.authority ?? "owner_supplied";
  const availability = input.availability ?? "available";

  const sql = `
    INSERT INTO source_assets (
      id, episode_id, asset_type, storage_driver, storage_key,
      content_sha256, byte_size, duration_seconds, mime_type, authority, availability
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(episode_id, asset_type, content_sha256) DO UPDATE SET
      storage_driver = excluded.storage_driver,
      storage_key = excluded.storage_key,
      byte_size = coalesce(excluded.byte_size, source_assets.byte_size),
      duration_seconds = coalesce(excluded.duration_seconds, source_assets.duration_seconds),
      mime_type = excluded.mime_type,
      authority = excluded.authority,
      availability = excluded.availability
    RETURNING *
  `;

  const row = await db.prepare(sql)
    .bind(
      id,
      input.episodeId,
      input.assetType,
      storageDriver,
      input.storageKey,
      input.contentSha256,
      input.byteSize ?? null,
      input.durationSeconds ?? null,
      input.mimeType,
      authority,
      availability
    )
    .first<SourceAssetRecord>();

  if (!row) {
    throw new Error("failed_to_create_source_asset");
  }
  return row;
}

export async function getSourceAssetById(db: DB, id: string): Promise<SourceAssetRecord | null> {
  await assertProvenanceMigrations(db);
  return (await db.prepare("SELECT * FROM source_assets WHERE id = ?").bind(id).first<SourceAssetRecord>()) ?? null;
}

export async function listSourceAssetsForEpisode(db: DB, episodeId: string): Promise<SourceAssetRecord[]> {
  await assertProvenanceMigrations(db);
  const res = await db.prepare("SELECT * FROM source_assets WHERE episode_id = ? ORDER BY created_at ASC")
    .bind(episodeId)
    .all<SourceAssetRecord>();
  return res.results;
}

// --------------------------------------------------------------------------
// Transcription Runs DAL
// --------------------------------------------------------------------------

export async function createTranscriptionRun(db: DB, input: NewTranscriptionRunInput): Promise<TranscriptionRunRecord> {
  await assertProvenanceMigrations(db);

  const id = input.id ?? runUlid();
  const parametersJson = typeof input.parameters === "string"
    ? input.parameters
    : JSON.stringify(input.parameters ?? {});
  const diarizationEnabled = input.diarizationEnabled === false ? 0 : 1;
  const status = input.status ?? "pending";

  const sql = `
    INSERT INTO transcription_runs (
      id, episode_id, source_asset_id, engine, engine_version,
      parameters_json, diarization_enabled, speaker_count, status,
      error_message, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `;

  const row = await db.prepare(sql)
    .bind(
      id,
      input.episodeId,
      input.sourceAssetId,
      input.engine,
      input.engineVersion,
      parametersJson,
      diarizationEnabled,
      input.speakerCount ?? null,
      status,
      input.errorMessage ?? null,
      input.startedAt ?? null,
      input.completedAt ?? null
    )
    .first<TranscriptionRunRecord>();

  if (!row) {
    throw new Error("failed_to_create_transcription_run");
  }
  return row;
}

export async function updateTranscriptionRunStatus(
  db: DB,
  runId: string,
  status: TranscriptionRunStatus,
  errorMessage?: string | null,
  speakerCount?: number | null
): Promise<void> {
  await assertProvenanceMigrations(db);
  const completedAt = status === "completed" || status === "failed" ? new Date().toISOString() : null;

  await db.prepare(`
    UPDATE transcription_runs
    SET status = ?,
        error_message = ?,
        speaker_count = coalesce(?, speaker_count),
        completed_at = coalesce(?, completed_at)
    WHERE id = ?
  `)
  .bind(status, errorMessage ?? null, speakerCount ?? null, completedAt, runId)
  .run();
}

// --------------------------------------------------------------------------
// Transcript Versions & Segments DAL
// --------------------------------------------------------------------------

export async function stageTranscriptVersion(db: DB, input: StageTranscriptInput): Promise<TranscriptVersionRecord> {
  await assertProvenanceMigrations(db);

  const versionId = input.id ?? transcriptVersionUlid();
  const coordinateSystem = input.coordinateSystem ?? "uncut";
  const totalSegments = input.segments.length;

  let wordCount = 0;
  for (const seg of input.segments) {
    const words = seg.text.trim().split(/\s+/).filter((w) => w.length > 0);
    wordCount += words.length;
  }

  const statements: D1PreparedStatement[] = [];

  // 1. Insert transcript version in staging state
  statements.push(
    db.prepare(`
      INSERT INTO transcript_versions (
        id, episode_id, version_number, transcription_run_id, source_asset_id,
        content_sha256, coordinate_system, total_segments, word_count,
        is_active, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'staging')
    `).bind(
      versionId,
      input.episodeId,
      input.versionNumber,
      input.transcriptionRunId ?? null,
      input.sourceAssetId,
      input.contentSha256,
      coordinateSystem,
      totalSegments,
      wordCount
    )
  );

  // 2. Insert segments
  for (let i = 0; i < input.segments.length; i++) {
    const seg = input.segments[i];
    const segId = seg.id ?? segmentUlid();
    const speakerLabel = seg.speakerLabel ?? "Speaker";
    const languageCode = seg.languageCode ?? "hi-Latn";

    statements.push(
      db.prepare(`
        INSERT INTO transcript_segments (
          id, transcript_version_id, segment_index, start_sec, end_sec,
          speaker_label, speaker_operator_id, text, text_normalized,
          language_code, confidence, words_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        segId,
        versionId,
        seg.segmentIndex ?? i,
        seg.startSec,
        seg.endSec,
        speakerLabel,
        seg.speakerOperatorId ?? null,
        seg.text,
        seg.textNormalized ?? null,
        languageCode,
        seg.confidence ?? null,
        seg.wordsJson ?? null
      )
    );
  }

  // 3. Insert chunks if provided
  if (input.chunks && input.chunks.length > 0) {
    for (let i = 0; i < input.chunks.length; i++) {
      const chk = input.chunks[i];
      const chkId = chk.id ?? chunkUlid();
      statements.push(
        db.prepare(`
          INSERT INTO transcript_chunks (
            id, transcript_version_id, chunk_index, vector_id, text,
            start_sec, end_sec, start_segment_id, end_segment_id,
            token_count, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          chkId,
          versionId,
          chk.chunkIndex ?? i,
          chk.vectorId,
          chk.text,
          chk.startSec ?? null,
          chk.endSec ?? null,
          chk.startSegmentId ?? null,
          chk.endSegmentId ?? null,
          chk.tokenCount
        )
      );
    }
  }

  // Execute batch
  await db.batch(statements);

  const created = await getTranscriptVersionById(db, versionId);
  if (!created) {
    throw new Error("failed_to_retrieve_staged_version");
  }
  return created;
}

export async function activateTranscriptVersion(
  db: DB,
  episodeId: string,
  versionId: string
): Promise<void> {
  await assertProvenanceMigrations(db);

  // Validate version exists and belongs to episode
  const version = await getTranscriptVersionById(db, versionId);
  if (!version || version.episode_id !== episodeId) {
    throw new Error("transcript_version_not_found_for_episode");
  }

  const statements: D1PreparedStatement[] = [
    // 1. Demote any currently active transcript version for this episode to archived
    db.prepare(`
      UPDATE transcript_versions
      SET is_active = 0, state = 'archived'
      WHERE episode_id = ? AND is_active = 1
    `).bind(episodeId),

    // 2. Deactivate chunks belonging to other versions of this episode
    db.prepare(`
      UPDATE transcript_chunks
      SET is_active = 0
      WHERE transcript_version_id IN (
        SELECT id FROM transcript_versions WHERE episode_id = ? AND id != ?
      )
    `).bind(episodeId, versionId),

    // 3. Activate the target transcript version
    db.prepare(`
      UPDATE transcript_versions
      SET is_active = 1, state = 'active', activated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND episode_id = ?
    `).bind(versionId, episodeId),

    // 4. Activate chunks for the target version
    db.prepare(`
      UPDATE transcript_chunks
      SET is_active = 1
      WHERE transcript_version_id = ?
    `).bind(versionId),
  ];

  await db.batch(statements);
}

export async function saveTranscriptSegments(
  db: DB,
  versionId: string,
  segments: NewTranscriptSegmentInput[]
): Promise<void> {
  await assertProvenanceMigrations(db);

  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segId = seg.id ?? segmentUlid();
    statements.push(
      db.prepare(`
        INSERT INTO transcript_segments (
          id, transcript_version_id, segment_index, start_sec, end_sec,
          speaker_label, speaker_operator_id, text, text_normalized,
          language_code, confidence, words_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(transcript_version_id, segment_index) DO UPDATE SET
          start_sec = excluded.start_sec,
          end_sec = excluded.end_sec,
          speaker_label = excluded.speaker_label,
          speaker_operator_id = excluded.speaker_operator_id,
          text = excluded.text,
          text_normalized = excluded.text_normalized,
          language_code = excluded.language_code,
          confidence = excluded.confidence,
          words_json = excluded.words_json
      `).bind(
        segId,
        versionId,
        seg.segmentIndex ?? i,
        seg.startSec,
        seg.endSec,
        seg.speakerLabel ?? "Speaker",
        seg.speakerOperatorId ?? null,
        seg.text,
        seg.textNormalized ?? null,
        seg.languageCode ?? "hi-Latn",
        seg.confidence ?? null,
        seg.wordsJson ?? null
      )
    );
  }

  await db.batch(statements);
}

export async function getTranscriptVersionById(db: DB, id: string): Promise<TranscriptVersionRecord | null> {
  await assertProvenanceMigrations(db);
  return (await db.prepare("SELECT * FROM transcript_versions WHERE id = ?").bind(id).first<TranscriptVersionRecord>()) ?? null;
}

export async function getActiveTranscriptVersion(db: DB, episodeId: string): Promise<TranscriptVersionRecord | null> {
  await assertProvenanceMigrations(db);
  return (await db.prepare("SELECT * FROM transcript_versions WHERE episode_id = ? AND is_active = 1 LIMIT 1")
    .bind(episodeId)
    .first<TranscriptVersionRecord>()) ?? null;
}

export async function listTranscriptVersions(db: DB, episodeId: string): Promise<TranscriptVersionRecord[]> {
  await assertProvenanceMigrations(db);
  const res = await db.prepare("SELECT * FROM transcript_versions WHERE episode_id = ? ORDER BY version_number DESC")
    .bind(episodeId)
    .all<TranscriptVersionRecord>();
  return res.results;
}

export async function getTranscriptSegments(db: DB, versionId: string): Promise<TranscriptSegmentRecord[]> {
  await assertProvenanceMigrations(db);
  const res = await db.prepare("SELECT * FROM transcript_segments WHERE transcript_version_id = ? ORDER BY segment_index ASC")
    .bind(versionId)
    .all<TranscriptSegmentRecord>();
  return res.results;
}

// --------------------------------------------------------------------------
// Timeline Alignments DAL
// --------------------------------------------------------------------------

export async function upsertTimelineAlignment(
  db: DB,
  input: UpsertTimelineAlignmentInput
): Promise<TimelineAlignmentRecord> {
  await assertProvenanceMigrations(db);

  const alignmentId = input.id ?? alignmentUlid();
  const algorithm = input.algorithm ?? "dtw_forced_align";
  const confidenceScore = input.confidenceScore ?? 1.0;
  const status = input.status ?? "verified";

  // Check if alignment already exists for (episode_id, uncut_asset_id, published_asset_id)
  const existing = await db.prepare(`
    SELECT id FROM timeline_alignments
    WHERE episode_id = ? AND uncut_asset_id = ? AND published_asset_id = ?
  `)
  .bind(input.episodeId, input.uncutAssetId, input.publishedAssetId)
  .first<{ id: string }>();

  const targetId = existing ? existing.id : alignmentId;

  const statements: D1PreparedStatement[] = [];

  statements.push(
    db.prepare(`
      INSERT INTO timeline_alignments (
        id, episode_id, uncut_asset_id, published_asset_id, algorithm, confidence_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(episode_id, uncut_asset_id, published_asset_id) DO UPDATE SET
        algorithm = excluded.algorithm,
        confidence_score = excluded.confidence_score,
        status = excluded.status,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `).bind(
      targetId,
      input.episodeId,
      input.uncutAssetId,
      input.publishedAssetId,
      algorithm,
      confidenceScore,
      status
    )
  );

  // Clear existing intervals for target alignment
  statements.push(
    db.prepare("DELETE FROM alignment_intervals WHERE alignment_id = ?").bind(targetId)
  );

  // Insert intervals
  for (let i = 0; i < input.intervals.length; i++) {
    const intv = input.intervals[i];
    statements.push(
      db.prepare(`
        INSERT INTO alignment_intervals (
          alignment_id, interval_index, uncut_start_sec, uncut_end_sec,
          pub_start_sec, pub_end_sec, interval_status, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        targetId,
        intv.intervalIndex ?? i,
        intv.uncutStartSec,
        intv.uncutEndSec,
        intv.pubStartSec,
        intv.pubEndSec,
        intv.intervalStatus ?? "matched",
        intv.confidence ?? 1.0
      )
    );
  }

  await db.batch(statements);

  const row = await db.prepare("SELECT * FROM timeline_alignments WHERE id = ?").bind(targetId).first<TimelineAlignmentRecord>();
  if (!row) {
    throw new Error("failed_to_retrieve_timeline_alignment");
  }
  return row;
}

export async function getTimelineAlignment(
  db: DB,
  episodeId: string,
  uncutAssetId?: string,
  publishedAssetId?: string
): Promise<{ alignment: TimelineAlignmentRecord; intervals: AlignmentIntervalRecord[] } | null> {
  await assertProvenanceMigrations(db);

  let alignment: TimelineAlignmentRecord | null = null;
  if (uncutAssetId && publishedAssetId) {
    alignment = await db.prepare(`
      SELECT * FROM timeline_alignments
      WHERE episode_id = ? AND uncut_asset_id = ? AND published_asset_id = ?
    `).bind(episodeId, uncutAssetId, publishedAssetId).first<TimelineAlignmentRecord>();
  } else {
    alignment = await db.prepare(`
      SELECT * FROM timeline_alignments
      WHERE episode_id = ?
      ORDER BY updated_at DESC LIMIT 1
    `).bind(episodeId).first<TimelineAlignmentRecord>();
  }

  if (!alignment) return null;

  const intervalsRes = await db.prepare(`
    SELECT * FROM alignment_intervals
    WHERE alignment_id = ?
    ORDER BY interval_index ASC
  `).bind(alignment.id).all<AlignmentIntervalRecord>();

  return {
    alignment,
    intervals: intervalsRes.results,
  };
}

// --------------------------------------------------------------------------
// Ingestion Jobs DAL
// --------------------------------------------------------------------------

export async function recordIngestionJob(db: DB, input: NewIngestionJobInput): Promise<IngestionJobRecord> {
  await assertProvenanceMigrations(db);

  const id = input.id ?? jobUlid();
  const status = input.status ?? "pending";
  const maxAttempts = input.maxAttempts ?? 5;
  const payloadJson = typeof input.payload === "string"
    ? input.payload
    : JSON.stringify(input.payload ?? {});

  const sql = `
    INSERT INTO ingestion_jobs (
      id, job_type, episode_id, source_asset_id, status, max_attempts, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `;

  const row = await db.prepare(sql)
    .bind(
      id,
      input.jobType,
      input.episodeId ?? null,
      input.sourceAssetId ?? null,
      status,
      maxAttempts,
      payloadJson
    )
    .first<IngestionJobRecord>();

  if (!row) {
    throw new Error("failed_to_record_ingestion_job");
  }
  return row;
}

export const createIngestionJob = recordIngestionJob;

export async function updateIngestionJobStatus(
  db: DB,
  jobId: string,
  update: UpdateJobInput
): Promise<void> {
  await assertProvenanceMigrations(db);

  const clauses: string[] = [];
  const values: unknown[] = [];

  if (update.status !== undefined) {
    clauses.push("status = ?");
    values.push(update.status);
    if (update.status === "running" && !update.startedAt) {
      clauses.push("started_at = coalesce(started_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))");
    }
    if ((update.status === "completed" || update.status === "failed" || update.status === "skipped_unchanged") && !update.completedAt) {
      clauses.push("completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    }
  }

  if (update.attempts !== undefined) {
    clauses.push("attempts = ?");
    values.push(update.attempts);
  }

  if (update.errorMessage !== undefined) {
    clauses.push("error_message = ?");
    values.push(update.errorMessage);
  }

  if (update.startedAt !== undefined) {
    clauses.push("started_at = ?");
    values.push(update.startedAt);
  }

  if (update.completedAt !== undefined) {
    clauses.push("completed_at = ?");
    values.push(update.completedAt);
  }

  if (update.payload !== undefined) {
    clauses.push("payload_json = ?");
    values.push(typeof update.payload === "string" ? update.payload : JSON.stringify(update.payload));
  }

  if (clauses.length === 0) return;

  values.push(jobId);
  const sql = `UPDATE ingestion_jobs SET ${clauses.join(", ")} WHERE id = ?`;
  await db.prepare(sql).bind(...values).run();
}

export const updateIngestionJob = updateIngestionJobStatus;

export async function listIngestionJobs(
  db: DB,
  options?: { status?: IngestionJobStatus; limit?: number }
): Promise<IngestionJobRecord[]> {
  await assertProvenanceMigrations(db);
  const limit = Math.min(options?.limit ?? 50, 100);

  if (options?.status) {
    const res = await db.prepare("SELECT * FROM ingestion_jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?")
      .bind(options.status, limit)
      .all<IngestionJobRecord>();
    return res.results;
  }

  const res = await db.prepare("SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<IngestionJobRecord>();
  return res.results;
}

// --------------------------------------------------------------------------
// Privacy-Safe Citation Resolution (PROV-07, QUAL-05)
// --------------------------------------------------------------------------

export async function resolveCitation(
  db: DB,
  query: CitationResolveQuery
): Promise<ResolvedCitationDTO | null> {
  await assertProvenanceMigrations(db);

  const episode = await getEpisodeById(db, query.episodeId);
  if (!episode) return null;

  // Resolve transcript version
  let version: TranscriptVersionRecord | null = null;
  if (query.versionId) {
    version = await getTranscriptVersionById(db, query.versionId);
  } else {
    version = await getActiveTranscriptVersion(db, query.episodeId);
  }

  if (!version || version.episode_id !== query.episodeId) return null;

  // Find target segment
  let targetSegment: TranscriptSegmentRecord | null = null;
  if (query.segmentIndex !== undefined) {
    targetSegment = await db.prepare(`
      SELECT * FROM transcript_segments
      WHERE transcript_version_id = ? AND segment_index = ?
    `).bind(version.id, query.segmentIndex).first<TranscriptSegmentRecord>();
  } else if (query.timeSec !== undefined) {
    targetSegment = await db.prepare(`
      SELECT * FROM transcript_segments
      WHERE transcript_version_id = ? AND start_sec <= ? AND end_sec >= ?
      ORDER BY start_sec ASC LIMIT 1
    `).bind(version.id, query.timeSec, query.timeSec).first<TranscriptSegmentRecord>();
  }

  if (!targetSegment) return null;

  // Check timeline alignment if available
  const alignmentData = await getTimelineAlignment(db, query.episodeId);

  let uncutTime: { startSec: number; endSec: number } | null = null;
  let publishedTime: { startSec: number; endSec: number } | null = null;
  let matchedStatus: ResolvedCitationDTO["matchedStatus"] = "unmapped";

  if (version.coordinate_system === "uncut") {
    uncutTime = { startSec: targetSegment.start_sec, endSec: targetSegment.end_sec };

    if (alignmentData && alignmentData.intervals.length > 0) {
      // Find matching interval
      const match = alignmentData.intervals.find(
        (i) => targetSegment!.start_sec >= i.uncut_start_sec && targetSegment!.start_sec <= i.uncut_end_sec
      );
      if (match) {
        matchedStatus = match.interval_status;
        if (match.interval_status === "matched") {
          const uncutSpan = match.uncut_end_sec - match.uncut_start_sec;
          const pubSpan = match.pub_end_sec - match.pub_start_sec;
          const scale = uncutSpan > 0 ? pubSpan / uncutSpan : 1.0;
          const offsetStart = targetSegment.start_sec - match.uncut_start_sec;
          const offsetEnd = targetSegment.end_sec - match.uncut_start_sec;

          publishedTime = {
            startSec: match.pub_start_sec + offsetStart * scale,
            endSec: match.pub_start_sec + offsetEnd * scale,
          };
        }
      }
    }
  } else {
    // Coordinate system is published
    publishedTime = { startSec: targetSegment.start_sec, endSec: targetSegment.end_sec };

    if (alignmentData && alignmentData.intervals.length > 0) {
      const match = alignmentData.intervals.find(
        (i) => targetSegment!.start_sec >= i.pub_start_sec && targetSegment!.start_sec <= i.pub_end_sec
      );
      if (match) {
        matchedStatus = match.interval_status;
        if (match.interval_status === "matched") {
          const pubSpan = match.pub_end_sec - match.pub_start_sec;
          const uncutSpan = match.uncut_end_sec - match.uncut_start_sec;
          const scale = pubSpan > 0 ? uncutSpan / pubSpan : 1.0;
          const offsetStart = targetSegment.start_sec - match.pub_start_sec;
          const offsetEnd = targetSegment.end_sec - match.pub_start_sec;

          uncutTime = {
            startSec: match.uncut_start_sec + offsetStart * scale,
            endSec: match.uncut_start_sec + offsetEnd * scale,
          };
        }
      }
    }
  }

  return {
    episodeId: episode.id,
    episodeTitle: episode.title,
    episodeSlug: episode.slug,
    transcriptVersionId: version.id,
    versionNumber: version.version_number,
    segmentId: targetSegment.id,
    segmentIndex: targetSegment.segment_index,
    speakerLabel: targetSegment.speaker_label,
    languageCode: targetSegment.language_code,
    text: targetSegment.text,
    uncutTime,
    publishedTime,
    matchedStatus,
  };
}
