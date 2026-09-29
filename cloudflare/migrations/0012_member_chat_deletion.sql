-- Member conversation deletion is deliberately narrower than member-memory deletion.
-- A deleted conversation loses its messages and row, while explicit saved memories
-- remain owned by the member with a minimal provenance tombstone.  The tombstone
-- also prevents replaying the original create idempotency key from recreating it.

CREATE TABLE member_chat_deletion_tombstones (
  conversation_id TEXT PRIMARY KEY CHECK (conversation_id GLOB 'mcnv_*' AND length(conversation_id) BETWEEN 13 AND 96),
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  create_idempotency_key TEXT CHECK (create_idempotency_key IS NULL OR length(create_idempotency_key) BETWEEN 8 AND 256),
  deleted_at TEXT NOT NULL
);

CREATE INDEX member_chat_deletion_tombstones_member_key
  ON member_chat_deletion_tombstones(member_id, create_idempotency_key);

CREATE TRIGGER member_chat_deletion_tombstones_no_update
BEFORE UPDATE ON member_chat_deletion_tombstones
BEGIN
  SELECT RAISE(ABORT, 'member chat deletion tombstones are immutable');
END;

CREATE TRIGGER member_chat_deletion_tombstones_no_delete
BEFORE DELETE ON member_chat_deletion_tombstones
BEGIN
  SELECT RAISE(ABORT, 'member chat deletion tombstones are retained');
END;

-- Preserve only the fact that a saved preference was once sourced from this
-- conversation.  No message or preference content is copied into this table.
CREATE TABLE member_saved_memory_conversation_tombstones (
  memory_id TEXT PRIMARY KEY REFERENCES member_saved_memories(id) ON DELETE RESTRICT,
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  source_conversation_id TEXT NOT NULL CHECK (source_conversation_id GLOB 'mcnv_*' AND length(source_conversation_id) BETWEEN 13 AND 96),
  deleted_at TEXT NOT NULL,
  UNIQUE(member_id, memory_id, source_conversation_id)
);

CREATE INDEX member_saved_memory_conversation_tombstones_member_source
  ON member_saved_memory_conversation_tombstones(member_id, source_conversation_id);

CREATE TRIGGER member_saved_memory_conversation_tombstones_no_update
BEFORE UPDATE ON member_saved_memory_conversation_tombstones
BEGIN
  SELECT RAISE(ABORT, 'member saved-memory provenance tombstones are immutable');
END;

CREATE TRIGGER member_saved_memory_conversation_tombstones_no_delete
BEFORE DELETE ON member_saved_memory_conversation_tombstones
BEGIN
  SELECT RAISE(ABORT, 'member saved-memory provenance tombstones are retained');
END;

-- Replace archive-only physical-delete blocks with a tombstone-gated path.
-- The only permitted physical deletion is the ordered API transaction: record
-- the tombstone, detach source links, delete messages, then delete the parent.
DROP TRIGGER member_chat_messages_no_delete;
CREATE TRIGGER member_chat_messages_delete_only_after_conversation_tombstone
BEFORE DELETE ON member_chat_messages
WHEN NOT EXISTS (
  SELECT 1 FROM member_chat_deletion_tombstones tombstone
  WHERE tombstone.conversation_id = OLD.conversation_id
)
BEGIN
  SELECT RAISE(ABORT, 'member chat messages require a deletion tombstone');
END;

DROP TRIGGER member_chat_conversations_no_delete;
CREATE TRIGGER member_chat_conversations_delete_only_after_tombstone
BEFORE DELETE ON member_chat_conversations
WHEN NOT EXISTS (
  SELECT 1 FROM member_chat_deletion_tombstones tombstone
  WHERE tombstone.conversation_id = OLD.id
    AND tombstone.member_id = OLD.member_id
)
BEGIN
  SELECT RAISE(ABORT, 'member chat conversations require a deletion tombstone');
END;

-- Existing memories are immutable except for the one-way source detach made
-- during a matching conversation deletion.  This avoids cascading or deleting
-- an explicit preference when its chat is permanently removed.
DROP TRIGGER member_saved_memories_no_reassign;
CREATE TRIGGER member_saved_memories_identity_or_tombstone_detach_only
BEFORE UPDATE OF member_id, content, source_conversation_id, created_at ON member_saved_memories
WHEN NEW.member_id <> OLD.member_id
  OR NEW.content <> OLD.content
  OR NEW.created_at <> OLD.created_at
  OR NOT (
    OLD.source_conversation_id IS NOT NULL
    AND NEW.source_conversation_id IS NULL
    AND EXISTS (
      SELECT 1 FROM member_saved_memory_conversation_tombstones memory_tombstone
      JOIN member_chat_deletion_tombstones conversation_tombstone
        ON conversation_tombstone.conversation_id = memory_tombstone.source_conversation_id
       AND conversation_tombstone.member_id = memory_tombstone.member_id
      WHERE memory_tombstone.memory_id = OLD.id
        AND memory_tombstone.member_id = OLD.member_id
        AND memory_tombstone.source_conversation_id = OLD.source_conversation_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'member saved memory identity is immutable except deletion detachment');
END;
