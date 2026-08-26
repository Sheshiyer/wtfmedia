-- Phase 02 operator and audit foundation. Apply only through Wrangler migrations.
CREATE TABLE operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND instr(email, '@') > 1),
  display_name TEXT NOT NULL DEFAULT '' CHECK (length(display_name) <= 160),
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'editor')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX operators_one_active_super_admin
  ON operators(role)
  WHERE role = 'super_admin' AND active = 1;
CREATE INDEX operators_active_email ON operators(active, email);

CREATE TABLE audit_events (
  event_id TEXT PRIMARY KEY CHECK (length(event_id) BETWEEN 8 AND 128),
  occurred_at TEXT NOT NULL,
  actor_operator_id INTEGER REFERENCES operators(id),
  actor_subject_digest TEXT CHECK (actor_subject_digest IS NULL OR length(actor_subject_digest) = 64),
  effective_role TEXT CHECK (effective_role IS NULL OR effective_role IN ('super_admin', 'admin', 'editor')),
  action TEXT NOT NULL CHECK (action IN (
    'auth_allowed', 'auth_denied', 'session_expired', 'logout',
    'protected_search', 'protected_view', 'audit_export',
    'operator_invite', 'operator_role_change', 'operator_deactivate',
    'settings_policy_change', 'audit_purge', 'super_admin_handoff'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('operator', 'audit', 'policy', 'control_room')),
  entity_id TEXT NOT NULL CHECK (length(entity_id) BETWEEN 1 AND 128),
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied', 'succeeded', 'failed')),
  environment TEXT NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 128),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX audit_events_created_at ON audit_events(created_at);
CREATE INDEX audit_events_actor_created_at ON audit_events(actor_operator_id, created_at);
CREATE INDEX audit_events_action_created_at ON audit_events(action, created_at);

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit events are append-only');
END;
