-- Browser history pages are query-only; this migration records the narrow,
-- content-free receipt needed when a member permanently erases a conversation.

ALTER TABLE member_chat_deletion_tombstones
  ADD COLUMN linked_saved_preference_count INTEGER NOT NULL DEFAULT 0
  CHECK (linked_saved_preference_count >= 0);

CREATE TABLE member_conversation_deletion_audit_events (
  id TEXT PRIMARY KEY CHECK (id GLOB 'mda_*' AND length(id) BETWEEN 13 AND 96),
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  conversation_id TEXT NOT NULL CHECK (conversation_id GLOB 'mcnv_*' AND length(conversation_id) BETWEEN 13 AND 96),
  event TEXT NOT NULL CHECK (event = 'member_conversation_deleted'),
  occurred_at TEXT NOT NULL
);

CREATE INDEX member_conversation_deletion_audit_events_member_time
  ON member_conversation_deletion_audit_events(member_id, occurred_at DESC, id DESC);

CREATE TRIGGER member_conversation_deletion_audit_events_no_update
BEFORE UPDATE ON member_conversation_deletion_audit_events
BEGIN
  SELECT RAISE(ABORT, 'member conversation deletion audit receipts are immutable');
END;

CREATE TRIGGER member_conversation_deletion_audit_events_no_delete
BEFORE DELETE ON member_conversation_deletion_audit_events
BEGIN
  SELECT RAISE(ABORT, 'member conversation deletion audit receipts are retained');
END;
