-- Explicit account memory for authenticated Ask WTF. Apply only through Wrangler migrations.
-- Memory is operator-owned, reversible, and never created from chat implicitly.

CREATE TABLE saved_memories (
  id TEXT PRIMARY KEY CHECK (id GLOB 'mem_*' AND length(id) BETWEEN 12 AND 96),
  operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  source_conversation_id TEXT REFERENCES chat_conversations(id) ON DELETE RESTRICT,
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK ((lifecycle_state = 'active' AND archived_at IS NULL) OR (lifecycle_state = 'archived' AND archived_at IS NOT NULL))
);

CREATE INDEX saved_memories_operator_updated
  ON saved_memories(operator_id, lifecycle_state, updated_at DESC, id DESC);

CREATE TRIGGER saved_memories_no_reassign
BEFORE UPDATE OF operator_id, content, source_conversation_id, created_at
ON saved_memories
BEGIN
  SELECT RAISE(ABORT, 'saved memory identity and content are immutable');
END;

CREATE TRIGGER saved_memories_archive_only
BEFORE UPDATE OF lifecycle_state, archived_at, updated_at
ON saved_memories
WHEN OLD.lifecycle_state = 'archived'
  OR NEW.lifecycle_state <> 'archived'
  OR NEW.archived_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'saved memory lifecycle is archive-only');
END;

CREATE TRIGGER saved_memories_no_delete
BEFORE DELETE ON saved_memories
BEGIN
  SELECT RAISE(ABORT, 'saved memories are archive-only');
END;
