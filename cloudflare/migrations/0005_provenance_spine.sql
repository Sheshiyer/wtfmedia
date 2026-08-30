-- Phase 03 Episode Ingestion and Provenance Spine Schema. Apply only through Wrangler migrations.

-- 1. Upgrade audit_events table to support Phase 3 actions and entity types
DROP TRIGGER IF EXISTS audit_events_append_only;

CREATE TABLE audit_events_new (
  event_id TEXT PRIMARY KEY CHECK (length(event_id) BETWEEN 8 AND 128),
  occurred_at TEXT NOT NULL,
  actor_operator_id INTEGER REFERENCES operators(id),
  actor_subject_digest TEXT CHECK (actor_subject_digest IS NULL OR length(actor_subject_digest) = 64),
  effective_role TEXT CHECK (effective_role IS NULL OR effective_role IN ('super_admin', 'admin', 'editor')),
  action TEXT NOT NULL CHECK (action IN (
    'auth_allowed', 'auth_denied', 'session_expired', 'logout',
    'protected_search', 'protected_view', 'audit_export',
    'operator_invite', 'operator_role_change', 'operator_deactivate',
    'settings_policy_change', 'audit_purge', 'super_admin_handoff',
    'asset_upload', 'ingest_trigger', 'transcript_activate', 'episode_update'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'operator', 'audit', 'policy', 'control_room',
    'episode', 'source_asset', 'transcript_version', 'ingestion_job'
  )),
  entity_id TEXT NOT NULL CHECK (length(entity_id) BETWEEN 1 AND 128),
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied', 'succeeded', 'failed')),
  environment TEXT NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 128),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO audit_events_new SELECT * FROM audit_events;
DROP TABLE audit_events;
ALTER TABLE audit_events_new RENAME TO audit_events;

CREATE INDEX audit_events_created_at ON audit_events(created_at);
CREATE INDEX audit_events_actor_created_at ON audit_events(actor_operator_id, created_at);
CREATE INDEX audit_events_action_created_at ON audit_events(action, created_at);

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit events are append-only');
END;

-- 2. Episodes table
CREATE TABLE episodes (
  id TEXT PRIMARY KEY CHECK (id GLOB 'ep_[0-9a-zA-Z]*'),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 2 AND 160),
  title TEXT NOT NULL CHECK (length(title) > 0),
  ip TEXT NOT NULL CHECK (length(ip) > 0),
  show_title TEXT NOT NULL CHECK (length(show_title) > 0),
  content_bucket TEXT NOT NULL DEFAULT 'podcast' CHECK (content_bucket IN ('podcast', 'clip', 'short', 'special', 'finance', 'online')),
  primary_language TEXT NOT NULL DEFAULT 'hi-Latn' CHECK (primary_language IN ('en', 'hi', 'hi-Latn', 'mixed')),
  production_status TEXT NOT NULL DEFAULT 'published' CHECK (production_status IN ('idea', 'research', 'scheduled', 'recorded', 'in_edit', 'ready', 'published', 'archived')),
  published_at TEXT,
  recorded_at TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  thumbnail_url TEXT CHECK (thumbnail_url IS NULL OR length(thumbnail_url) <= 1024),
  description TEXT NOT NULL DEFAULT '',
  chapters_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(chapters_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_episodes_ip ON episodes(ip);
CREATE INDEX idx_episodes_show_title ON episodes(show_title);
CREATE INDEX idx_episodes_published_at ON episodes(published_at);

-- 3. Episode External Identities
CREATE TABLE episode_external_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'youtube_clip', 'frame_io', 'google_drive', 'zset', 'rss', 'spotify', 'apple_podcasts')),
  external_id TEXT NOT NULL CHECK (length(external_id) > 0),
  external_url_hash TEXT NOT NULL CHECK (length(external_url_hash) = 64),
  channel_id TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  observed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(platform, external_id)
);

CREATE INDEX idx_episode_external_identities_episode_id ON episode_external_identities(episode_id);
CREATE INDEX idx_episode_external_identities_platform_external ON episode_external_identities(platform, external_id);

-- 4. Source Assets
CREATE TABLE source_assets (
  id TEXT PRIMARY KEY CHECK (id GLOB 'ast_[0-9a-zA-Z]*'),
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('youtube_video', 'uncut_video', 'uncut_audio', 'captions_srt', 'captions_vtt', 'editorial_notes', 'sidecar_metadata')),
  storage_driver TEXT NOT NULL DEFAULT 'r2' CHECK (storage_driver IN ('r2', 'external_youtube', 'external_vault')),
  storage_key TEXT NOT NULL,
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
  duration_seconds REAL CHECK (duration_seconds IS NULL OR duration_seconds >= 0.0),
  mime_type TEXT NOT NULL CHECK (length(mime_type) > 0),
  authority TEXT NOT NULL DEFAULT 'owner_supplied' CHECK (authority IN ('owner_supplied', 'youtube_official', 'pipeline_generated', 'third_party')),
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'pending', 'archived', 'offline', 'error')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(episode_id, asset_type, content_sha256)
);

CREATE INDEX idx_source_assets_episode_id ON source_assets(episode_id);
CREATE INDEX idx_source_assets_content_sha256 ON source_assets(content_sha256);

-- 5. Transcription Runs
CREATE TABLE transcription_runs (
  id TEXT PRIMARY KEY CHECK (id GLOB 'run_[0-9a-zA-Z]*'),
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  source_asset_id TEXT NOT NULL REFERENCES source_assets(id),
  engine TEXT NOT NULL CHECK (engine IN ('whisper_large_v3', 'assemblyai', 'workers_ai_whisper', 'custom_asr', 'manual_editorial')) ,
  engine_version TEXT NOT NULL,
  parameters_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(parameters_json)),
  diarization_enabled INTEGER NOT NULL DEFAULT 1 CHECK (diarization_enabled IN (0, 1)),
  speaker_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_transcription_runs_episode_id ON transcription_runs(episode_id);
CREATE INDEX idx_transcription_runs_source_asset_id ON transcription_runs(source_asset_id);

-- 6. Transcript Versions
CREATE TABLE transcript_versions (
  id TEXT PRIMARY KEY CHECK (id GLOB 'txv_[0-9a-zA-Z]*'),
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  transcription_run_id TEXT REFERENCES transcription_runs(id),
  source_asset_id TEXT NOT NULL REFERENCES source_assets(id),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  coordinate_system TEXT NOT NULL DEFAULT 'uncut' CHECK (coordinate_system IN ('uncut', 'published')),
  total_segments INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  state TEXT NOT NULL DEFAULT 'staging' CHECK (state IN ('staging', 'active', 'archived', 'tombstoned')),
  activated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(episode_id, version_number)
);

CREATE INDEX idx_transcript_versions_episode_id ON transcript_versions(episode_id);
CREATE INDEX idx_transcript_versions_active ON transcript_versions(episode_id, is_active);
CREATE UNIQUE INDEX transcript_versions_one_active_per_episode ON transcript_versions(episode_id) WHERE is_active = 1;

-- 7. Transcript Segments
CREATE TABLE transcript_segments (
  id TEXT PRIMARY KEY CHECK (id GLOB 'seg_[0-9a-zA-Z]*'),
  transcript_version_id TEXT NOT NULL REFERENCES transcript_versions(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
  start_sec REAL NOT NULL CHECK (start_sec >= 0.0),
  end_sec REAL NOT NULL CHECK (end_sec >= start_sec),
  speaker_label TEXT NOT NULL DEFAULT 'Speaker' CHECK (length(speaker_label) <= 100),
  speaker_operator_id INTEGER REFERENCES operators(id),
  text TEXT NOT NULL CHECK (length(text) > 0),
  text_normalized TEXT,
  language_code TEXT NOT NULL DEFAULT 'hi-Latn' CHECK (language_code IN ('en', 'hi', 'hi-Latn', 'mixed')),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
  words_json TEXT CHECK (words_json IS NULL OR json_valid(words_json)),
  UNIQUE(transcript_version_id, segment_index)
);

CREATE INDEX idx_transcript_segments_version_start ON transcript_segments(transcript_version_id, start_sec);

-- 8. Timeline Alignments
CREATE TABLE timeline_alignments (
  id TEXT PRIMARY KEY CHECK (id GLOB 'aln_[0-9a-zA-Z]*'),
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  uncut_asset_id TEXT NOT NULL REFERENCES source_assets(id),
  published_asset_id TEXT NOT NULL REFERENCES source_assets(id),
  algorithm TEXT NOT NULL DEFAULT 'dtw_forced_align' CHECK (algorithm IN ('dtw_forced_align', 'audio_fingerprint', 'manual_editor_anchor', 'identity')),
  confidence_score REAL NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'unmapped', 'partial', 'stale', 'conflicted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(episode_id, uncut_asset_id, published_asset_id)
);

CREATE INDEX idx_timeline_alignments_episode_id ON timeline_alignments(episode_id);

-- 9. Alignment Intervals
CREATE TABLE alignment_intervals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alignment_id TEXT NOT NULL REFERENCES timeline_alignments(id) ON DELETE CASCADE,
  interval_index INTEGER NOT NULL CHECK (interval_index >= 0),
  uncut_start_sec REAL NOT NULL CHECK (uncut_start_sec >= 0.0),
  uncut_end_sec REAL NOT NULL CHECK (uncut_end_sec >= uncut_start_sec),
  pub_start_sec REAL NOT NULL CHECK (pub_start_sec >= 0.0),
  pub_end_sec REAL NOT NULL CHECK (pub_end_sec >= pub_start_sec),
  interval_status TEXT NOT NULL DEFAULT 'matched' CHECK (interval_status IN ('matched', 'cut_from_published', 'added_in_published', 'conflicted')),
  confidence REAL NOT NULL DEFAULT 1.0,
  UNIQUE(alignment_id, interval_index)
);

CREATE INDEX idx_alignment_intervals_lookup ON alignment_intervals(alignment_id, uncut_start_sec, pub_start_sec);

-- 10. Transcript Chunks
CREATE TABLE transcript_chunks (
  id TEXT PRIMARY KEY CHECK (id GLOB 'chk_[0-9a-zA-Z]*'),
  transcript_version_id TEXT NOT NULL REFERENCES transcript_versions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  vector_id TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL CHECK (length(text) > 0),
  start_sec REAL CHECK (start_sec IS NULL OR start_sec >= 0.0),
  end_sec REAL CHECK (end_sec IS NULL OR end_sec >= start_sec),
  start_segment_id TEXT REFERENCES transcript_segments(id),
  end_segment_id TEXT REFERENCES transcript_segments(id),
  token_count INTEGER NOT NULL CHECK (token_count > 0),
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  UNIQUE(transcript_version_id, chunk_index)
);

CREATE INDEX idx_transcript_chunks_version_active ON transcript_chunks(transcript_version_id, is_active);

-- 11. Ingestion Jobs
CREATE TABLE ingestion_jobs (
  id TEXT PRIMARY KEY CHECK (id GLOB 'job_[0-9a-zA-Z]*'),
  job_type TEXT NOT NULL CHECK (job_type IN ('youtube_metadata_sync', 'youtube_captions_fetch', 'uncut_audio_ingest', 'asr_transcription', 'timeline_alignment', 'vector_indexing')),
  episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
  source_asset_id TEXT REFERENCES source_assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped_unchanged')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  error_message TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX idx_ingestion_jobs_status_created ON ingestion_jobs(status, created_at);
CREATE INDEX idx_ingestion_jobs_episode_id ON ingestion_jobs(episode_id);
