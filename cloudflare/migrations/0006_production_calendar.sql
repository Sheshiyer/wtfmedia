-- Phase 03 native production calendar. Apply only through Wrangler migrations.
-- The schedule is canonical in D1; provider projections remain separately gated.

-- Extend the append-only audit allowlist for calendar mutations without storing
-- provider tokens, raw provider bodies, or private source material.
DROP TRIGGER IF EXISTS audit_events_append_only;

CREATE TABLE audit_events_calendar (
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
    'asset_upload', 'ingest_trigger', 'transcript_activate', 'episode_update',
    'production_work_item_change', 'production_conflict_resolve'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'operator', 'audit', 'policy', 'control_room',
    'episode', 'source_asset', 'transcript_version', 'ingestion_job',
    'production_work_item', 'production_note', 'production_conflict'
  )),
  entity_id TEXT NOT NULL CHECK (length(entity_id) BETWEEN 1 AND 128),
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied', 'succeeded', 'failed')),
  environment TEXT NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 128),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO audit_events_calendar SELECT * FROM audit_events;
DROP TABLE audit_events;
ALTER TABLE audit_events_calendar RENAME TO audit_events;

CREATE INDEX audit_events_created_at ON audit_events(created_at);
CREATE INDEX audit_events_actor_created_at ON audit_events(actor_operator_id, created_at);
CREATE INDEX audit_events_action_created_at ON audit_events(action, created_at);

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit events are append-only');
END;

-- One canonical work item represents one production flow at a time. `ip_key`
-- and `ip_label` stay explicit text until a separate IP-taxonomy decision.
CREATE TABLE production_work_items (
  id TEXT PRIMARY KEY CHECK (id GLOB 'pwi_[0-9A-Za-z]*'),
  episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
  ip_key TEXT NOT NULL CHECK (length(trim(ip_key)) > 0),
  ip_label TEXT NOT NULL CHECK (length(trim(ip_label)) > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  workflow_stage TEXT NOT NULL CHECK (workflow_stage IN ('research', 'shoot', 'edit', 'review', 'publish', 'milestone')),
  color_token TEXT NOT NULL CHECK (color_token IN ('neutral', 'shoot_purple', 'publish_blue', 'milestone_yellow', 'complete_green', 'blocked_red')),
  schedule_kind TEXT NOT NULL CHECK (schedule_kind IN ('date_only', 'timed', 'all_day')),
  schedule_date TEXT CHECK (schedule_date IS NULL OR schedule_date GLOB '????-??-??'),
  starts_at_utc TEXT,
  ends_at_utc TEXT,
  event_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata' CHECK (length(trim(event_timezone)) > 0),
  assigned_operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'completed', 'blocked', 'conflicted', 'cancelled')),
  blocked_reason TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (schedule_kind = 'timed' AND starts_at_utc IS NOT NULL)
    OR (schedule_kind IN ('date_only', 'all_day') AND schedule_date IS NOT NULL AND starts_at_utc IS NULL)
  ),
  CHECK (ends_at_utc IS NULL OR starts_at_utc IS NULL OR ends_at_utc >= starts_at_utc),
  CHECK ((status = 'blocked' AND blocked_reason IS NOT NULL) OR (status != 'blocked'))
);

CREATE INDEX idx_production_work_items_schedule ON production_work_items(starts_at_utc, schedule_date);
CREATE INDEX idx_production_work_items_episode ON production_work_items(episode_id);
CREATE INDEX idx_production_work_items_status ON production_work_items(status, workflow_stage);

-- Sticky notes must be anchored to either a work item or an explicit calendar day.
CREATE TABLE production_notes (
  id TEXT PRIMARY KEY CHECK (id GLOB 'pnt_[0-9A-Za-z]*'),
  work_item_id TEXT REFERENCES production_work_items(id) ON DELETE CASCADE,
  calendar_day TEXT CHECK (calendar_day IS NULL OR calendar_day GLOB '????-??-??'),
  color_token TEXT NOT NULL CHECK (color_token IN ('neutral', 'shoot_purple', 'publish_blue', 'milestone_yellow', 'complete_green', 'blocked_red')),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  position_x INTEGER,
  position_y INTEGER,
  created_by_operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (work_item_id IS NOT NULL AND calendar_day IS NULL)
    OR (work_item_id IS NULL AND calendar_day IS NOT NULL)
  )
);

CREATE INDEX idx_production_notes_work_item ON production_notes(work_item_id);
CREATE INDEX idx_production_notes_calendar_day ON production_notes(calendar_day);

-- Revision snapshots are a safe, append-only projection of the work item. The
-- mutation endpoint will write a new row before moving the current revision.
CREATE TABLE production_work_item_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_item_id TEXT NOT NULL REFERENCES production_work_items(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  change_kind TEXT NOT NULL CHECK (change_kind IN ('created', 'updated', 'conflict_recorded', 'conflict_resolved')),
  actor_operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
  safe_projection_json TEXT NOT NULL CHECK (json_valid(safe_projection_json)),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(work_item_id, revision)
);

CREATE TRIGGER production_work_item_revisions_append_only_update
BEFORE UPDATE ON production_work_item_revisions
BEGIN
  SELECT RAISE(ABORT, 'production work item revisions are append-only');
END;

CREATE TRIGGER production_work_item_revisions_append_only_delete
BEFORE DELETE ON production_work_item_revisions
BEGIN
  SELECT RAISE(ABORT, 'production work item revisions are append-only');
END;

-- A stale edit is preserved for administrative resolution rather than silently
-- overwriting the current D1 schedule revision.
CREATE TABLE production_conflicts (
  id TEXT PRIMARY KEY CHECK (id GLOB 'pcf_[0-9A-Za-z]*'),
  work_item_id TEXT NOT NULL REFERENCES production_work_items(id) ON DELETE CASCADE,
  stale_revision INTEGER NOT NULL CHECK (stale_revision >= 1),
  current_revision INTEGER NOT NULL CHECK (current_revision >= stale_revision),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'resolved')),
  raised_by_operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
  resolved_by_operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
  resolution_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  CHECK (
    (state = 'pending' AND resolved_by_operator_id IS NULL AND resolution_reason IS NULL AND resolved_at IS NULL)
    OR (state = 'resolved' AND resolved_by_operator_id IS NOT NULL AND resolution_reason IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX idx_production_conflicts_work_item_state ON production_conflicts(work_item_id, state);

CREATE TRIGGER production_work_items_no_delete
BEFORE DELETE ON production_work_items
BEGIN
  SELECT RAISE(ABORT, 'production work items are retained; cancel instead');
END;
