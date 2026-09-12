-- Preserve complete Alpha rich-source sheets in Beta history. The previous
-- 30 KB guard predated the grouped moment payload and rejected valid answers.

DROP TRIGGER chat_messages_require_next_sequence;
DROP TRIGGER chat_messages_no_update;
DROP TRIGGER chat_messages_no_delete;
DROP INDEX chat_messages_conversation_sequence;
DROP INDEX chat_messages_request_id;

ALTER TABLE chat_messages RENAME TO chat_messages_legacy;

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY CHECK (id GLOB 'msg_*' AND length(id) BETWEEN 12 AND 96),
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence BETWEEN 1 AND 100000),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  source_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (length(source_metadata_json) <= 96000 AND json_valid(source_metadata_json)),
  grounding_state TEXT NOT NULL DEFAULT 'ungrounded' CHECK (grounding_state IN ('grounded', 'ungrounded', 'unavailable')),
  model TEXT CHECK (model IS NULL OR length(model) BETWEEN 1 AND 160),
  model_fallback INTEGER NOT NULL DEFAULT 0 CHECK (model_fallback IN (0, 1)),
  request_id TEXT CHECK (request_id IS NULL OR length(request_id) BETWEEN 1 AND 160),
  idempotency_key TEXT CHECK (idempotency_key IS NULL OR length(idempotency_key) BETWEEN 8 AND 256),
  created_at TEXT NOT NULL,
  UNIQUE(conversation_id, sequence),
  UNIQUE(conversation_id, idempotency_key)
);

INSERT INTO chat_messages (
  id, conversation_id, sequence, role, content, source_metadata_json,
  grounding_state, model, model_fallback, request_id, idempotency_key, created_at
)
SELECT
  id, conversation_id, sequence, role, content, source_metadata_json,
  grounding_state, model, model_fallback, request_id, idempotency_key, created_at
FROM chat_messages_legacy;

DROP TABLE chat_messages_legacy;

CREATE INDEX chat_messages_conversation_sequence
  ON chat_messages(conversation_id, sequence);
CREATE INDEX chat_messages_request_id
  ON chat_messages(request_id);

CREATE TRIGGER chat_messages_require_next_sequence
BEFORE INSERT ON chat_messages
WHEN NEW.sequence <> COALESCE((SELECT MAX(sequence) + 1 FROM chat_messages WHERE conversation_id = NEW.conversation_id), 1)
BEGIN
  SELECT RAISE(ABORT, 'chat message sequence must be next');
END;

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
