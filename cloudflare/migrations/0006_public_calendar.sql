-- Temporary public production-calendar persistence for the current release.
-- Anonymous callers may list, create, and update through the same-origin web
-- API. Deletion and provider synchronization are deliberately unavailable.

CREATE TABLE calendar_events (
  event_id TEXT PRIMARY KEY CHECK (length(event_id) BETWEEN 12 AND 64 AND event_id LIKE 'cal_%'),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  starts_at TEXT NOT NULL CHECK (
    length(starts_at) = 24 AND
    substr(starts_at, 11, 1) = 'T' AND
    substr(starts_at, 24, 1) = 'Z'
  ),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata' CHECK (timezone = 'Asia/Kolkata'),
  event_type TEXT NOT NULL CHECK (event_type IN ('recording', 'edit', 'publish', 'review', 'other')),
  ip_label TEXT CHECK (ip_label IS NULL OR length(ip_label) BETWEEN 1 AND 120),
  show_label TEXT CHECK (show_label IS NULL OR length(show_label) BETWEEN 1 AND 120),
  owner_label TEXT CHECK (owner_label IS NULL OR length(owner_label) BETWEEN 1 AND 120),
  workflow_column TEXT NOT NULL CHECK (workflow_column IN ('unscheduled', 'on-calendar', 'blocked')),
  tone TEXT NOT NULL CHECK (tone IN ('attention', 'editorial', 'knowledge', 'live')),
  conflict_state TEXT NOT NULL DEFAULT 'clear' CHECK (conflict_state IN ('clear', 'potential', 'confirmed')),
  notes TEXT CHECK (notes IS NULL OR length(notes) BETWEEN 1 AND 1000),
  idempotency_key_hash TEXT NOT NULL UNIQUE CHECK (length(idempotency_key_hash) = 64),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  last_correlation_id TEXT NOT NULL CHECK (length(last_correlation_id) BETWEEN 8 AND 128),
  created_at TEXT NOT NULL CHECK (length(created_at) = 24 AND substr(created_at, 24, 1) = 'Z'),
  updated_at TEXT NOT NULL CHECK (length(updated_at) = 24 AND substr(updated_at, 24, 1) = 'Z')
);

CREATE INDEX calendar_events_starts_at ON calendar_events(starts_at, event_id);
CREATE INDEX calendar_events_workflow ON calendar_events(workflow_column, starts_at);

CREATE TABLE calendar_mutations (
  mutation_id TEXT PRIMARY KEY CHECK (length(mutation_id) BETWEEN 12 AND 64 AND mutation_id LIKE 'cam_%'),
  event_id TEXT NOT NULL REFERENCES calendar_events(event_id),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update')),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 128),
  occurred_at TEXT NOT NULL CHECK (length(occurred_at) = 24 AND substr(occurred_at, 24, 1) = 'Z')
);

CREATE INDEX calendar_mutations_event_revision ON calendar_mutations(event_id, revision);
CREATE INDEX calendar_mutations_occurred_at ON calendar_mutations(occurred_at);

CREATE TRIGGER calendar_events_create_receipt
AFTER INSERT ON calendar_events
BEGIN
  INSERT INTO calendar_mutations (
    mutation_id, event_id, operation, revision, correlation_id, occurred_at
  ) VALUES (
    'cam_' || lower(hex(randomblob(16))),
    NEW.event_id,
    'create',
    NEW.revision,
    NEW.last_correlation_id,
    NEW.created_at
  );
END;

CREATE TRIGGER calendar_events_revision_guard
BEFORE UPDATE ON calendar_events
BEGIN
  SELECT (CASE
    WHEN NEW.revision != OLD.revision + 1
      OR NEW.event_id != OLD.event_id
      OR NEW.idempotency_key_hash != OLD.idempotency_key_hash
      OR NEW.created_at != OLD.created_at
    THEN RAISE(ABORT, 'invalid calendar revision')
  END);
END;

CREATE TRIGGER calendar_events_update_receipt
AFTER UPDATE ON calendar_events
BEGIN
  INSERT INTO calendar_mutations (
    mutation_id, event_id, operation, revision, correlation_id, occurred_at
  ) VALUES (
    'cam_' || lower(hex(randomblob(16))),
    NEW.event_id,
    'update',
    NEW.revision,
    NEW.last_correlation_id,
    NEW.updated_at
  );
END;

CREATE TRIGGER calendar_events_no_delete
BEFORE DELETE ON calendar_events
BEGIN
  SELECT RAISE(ABORT, 'calendar deletion is unavailable');
END;

CREATE TRIGGER calendar_mutations_append_only_update
BEFORE UPDATE ON calendar_mutations
BEGIN
  SELECT RAISE(ABORT, 'calendar mutations are append-only');
END;

CREATE TRIGGER calendar_mutations_append_only_delete
BEFORE DELETE ON calendar_mutations
BEGIN
  SELECT RAISE(ABORT, 'calendar mutations are append-only');
END;
