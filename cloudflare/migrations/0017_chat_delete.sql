-- Operator chat becomes user-deletable (matches member chat): the owner can
-- permanently remove their own conversation and its messages through the
-- confirmed DELETE route. Archive stays available; the schema no longer
-- hard-blocks deletes. Saved memories survive: their source_conversation_id
-- link is nulled before the conversation row is removed (same contract as
-- member_saved_memories).
DROP TRIGGER IF EXISTS chat_messages_no_delete;
DROP TRIGGER IF EXISTS chat_conversations_no_delete;

DROP TRIGGER IF EXISTS saved_memories_no_reassign;
CREATE TRIGGER saved_memories_no_reassign
BEFORE UPDATE OF operator_id, content, source_conversation_id, created_at
ON saved_memories
-- The only permitted mutation is unlinking a deleted source conversation.
WHEN NOT (
  NEW.source_conversation_id IS NULL
  AND NEW.operator_id = OLD.operator_id
  AND NEW.content = OLD.content
  AND NEW.created_at = OLD.created_at
)
BEGIN
  SELECT RAISE(ABORT, 'saved memory identity and content are immutable');
END;
