-- Authenticated Ask WTF history. Apply only through Wrangler migrations.
-- This schema is additive, operator-owned, archive-only, and never feeds memory.

CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY CHECK (id GLOB 'cnv_*' AND length(id) BETWEEN 12 AND 96),
  operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
  workspace TEXT NOT NULL DEFAULT 'wtfmedia' CHECK (length(workspace) BETWEEN 1 AND 64),
  title TEXT NOT NULL DEFAULT 'New conversation' CHECK (length(title) BETWEEN 1 AND 240),
  source_mode TEXT NOT NULL DEFAULT 'published' CHECK (source_mode IN ('published', 'uncut', 'both')),
  episode_id TEXT CHECK (episode_id IS NULL OR (length(episode_id) BETWEEN 1 AND 128 AND episode_id NOT GLOB '*[^A-Za-z0-9_-]*')),
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'archived')),
  create_idempotency_key TEXT UNIQUE CHECK (create_idempotency_key IS NULL OR length(create_idempotency_key) BETWEEN 8 AND 256),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK ((lifecycle_state = 'active' AND archived_at IS NULL) OR (lifecycle_state = 'archived' AND archived_at IS NOT NULL))
);

CREATE INDEX chat_conversations_operator_updated
  ON chat_conversations(operator_id, updated_at DESC, id DESC);
CREATE INDEX chat_conversations_lifecycle
  ON chat_conversations(operator_id, lifecycle_state, updated_at DESC);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY CHECK (id GLOB 'msg_*' AND length(id) BETWEEN 12 AND 96),
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence BETWEEN 1 AND 100000),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  source_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (length(source_metadata_json) <= 30000 AND json_valid(source_metadata_json)),
  grounding_state TEXT NOT NULL DEFAULT 'ungrounded' CHECK (grounding_state IN ('grounded', 'ungrounded', 'unavailable')),
  model TEXT CHECK (model IS NULL OR length(model) BETWEEN 1 AND 160),
  model_fallback INTEGER NOT NULL DEFAULT 0 CHECK (model_fallback IN (0, 1)),
  request_id TEXT CHECK (request_id IS NULL OR length(request_id) BETWEEN 1 AND 160),
  idempotency_key TEXT CHECK (idempotency_key IS NULL OR length(idempotency_key) BETWEEN 8 AND 256),
  created_at TEXT NOT NULL,
  UNIQUE(conversation_id, sequence),
  UNIQUE(conversation_id, idempotency_key)
);

CREATE INDEX chat_messages_conversation_sequence
  ON chat_messages(conversation_id, sequence);
CREATE INDEX chat_messages_request_id
  ON chat_messages(request_id);

-- Sequence allocation is server-side and contiguous; retries are resolved before insert.
CREATE TRIGGER chat_messages_require_next_sequence
BEFORE INSERT ON chat_messages
WHEN NEW.sequence <> COALESCE((SELECT MAX(sequence) + 1 FROM chat_messages WHERE conversation_id = NEW.conversation_id), 1)
BEGIN
  SELECT RAISE(ABORT, 'chat message sequence must be next');
END;

-- Messages and conversations are immutable except for the explicit active->archived transition.
CREATE TRIGGER chat_messages_no_update
BEFORE UPDATE ON chat_messages
BEGIN
  SELECT RAISE(ABORT, 'chat messages are immutable');
END;

CREATE TRIGGER chat_messages_no_delete
BEFORE DELETE ON chat_messages
BEGIN
  SELECT RAISE(ABORT, 'chat messages are non-destructive');
END;

CREATE TRIGGER chat_conversations_no_delete
BEFORE DELETE ON chat_conversations
BEGIN
  SELECT RAISE(ABORT, 'chat conversations are archive-only');
END;

CREATE TRIGGER chat_conversations_no_reassign
BEFORE UPDATE OF operator_id ON chat_conversations
BEGIN
  SELECT RAISE(ABORT, 'chat conversation ownership is immutable');
END;

CREATE TRIGGER chat_conversations_archive_only
BEFORE UPDATE OF lifecycle_state, archived_at ON chat_conversations
WHEN OLD.lifecycle_state = 'archived'
  OR NEW.lifecycle_state <> 'archived'
  OR NEW.archived_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'chat lifecycle is archive-only');
END;
