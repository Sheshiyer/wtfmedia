-- Retain an access-denial receipt and audit references, never conversation content.
ALTER TABLE member_users ADD COLUMN deletion_state TEXT CHECK (deletion_state IN ('pending', 'deleted'));

DROP TRIGGER member_saved_memories_no_delete;
CREATE TRIGGER member_saved_memories_no_delete
BEFORE DELETE ON member_saved_memories
WHEN NOT EXISTS (SELECT 1 FROM member_users WHERE id = OLD.member_id AND deletion_state IS NOT NULL AND lifecycle_state = 'revoked')
BEGIN
  SELECT RAISE(ABORT, 'saved memory deletion requires account deletion');
END;

DROP TRIGGER member_saved_memory_conversation_tombstones_no_delete;
CREATE TRIGGER member_saved_memory_conversation_tombstones_no_delete
BEFORE DELETE ON member_saved_memory_conversation_tombstones
WHEN NOT EXISTS (SELECT 1 FROM member_users WHERE id = OLD.member_id AND deletion_state IS NOT NULL AND lifecycle_state = 'revoked')
BEGIN
  SELECT RAISE(ABORT, 'saved memory tombstone deletion requires account deletion');
END;

DROP TRIGGER saved_memories_no_delete;
CREATE TRIGGER saved_memories_no_delete
BEFORE DELETE ON saved_memories
WHEN NOT EXISTS (
  SELECT 1 FROM operators o JOIN member_users m ON m.email = o.email
  WHERE o.id = OLD.operator_id AND o.active = 0 AND m.deletion_state IS NOT NULL AND m.lifecycle_state = 'revoked'
)
BEGIN
  SELECT RAISE(ABORT, 'saved memory deletion requires account deletion');
END;

-- Recheck protection inside the deletion transaction, including concurrent transfer.
CREATE TRIGGER member_deletion_protect_super_admin_insert
BEFORE INSERT ON member_users
WHEN NEW.deletion_state IS NOT NULL AND EXISTS (SELECT 1 FROM operators WHERE email = NEW.email AND role = 'super_admin')
BEGIN
  SELECT RAISE(ABORT, 'super admin cannot be deleted');
END;
CREATE TRIGGER member_deletion_protect_super_admin_update
BEFORE UPDATE OF deletion_state ON member_users
WHEN NEW.deletion_state IS NOT NULL AND EXISTS (SELECT 1 FROM operators WHERE email = NEW.email AND role = 'super_admin')
BEGIN
  SELECT RAISE(ABORT, 'super admin cannot be deleted');
END;

CREATE TRIGGER deleted_operator_cannot_reactivate
BEFORE UPDATE OF active ON operators
WHEN NEW.active = 1 AND EXISTS (SELECT 1 FROM member_users WHERE email = NEW.email AND deletion_state IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'deleted user cannot regain operator access');
END;
CREATE TRIGGER deleted_operator_cannot_reinsert
BEFORE INSERT ON operators
WHEN EXISTS (SELECT 1 FROM member_users WHERE email = NEW.email AND deletion_state IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'deleted user cannot regain operator access');
END;
CREATE TRIGGER deleted_member_no_new_chats
BEFORE INSERT ON member_chat_conversations
WHEN EXISTS (SELECT 1 FROM member_users WHERE id = NEW.member_id AND deletion_state IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'deleted user cannot create history');
END;
CREATE TRIGGER deleted_member_no_new_memories
BEFORE INSERT ON member_saved_memories
WHEN EXISTS (SELECT 1 FROM member_users WHERE id = NEW.member_id AND deletion_state IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'deleted user cannot create memory');
END;
CREATE TRIGGER deleted_operator_no_new_chats
BEFORE INSERT ON chat_conversations
WHEN EXISTS (SELECT 1 FROM operators o JOIN member_users m ON m.email = o.email WHERE o.id = NEW.operator_id AND m.deletion_state IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'deleted user cannot create history');
END;
CREATE TRIGGER deleted_operator_no_new_memories
BEFORE INSERT ON saved_memories
WHEN EXISTS (SELECT 1 FROM operators o JOIN member_users m ON m.email = o.email WHERE o.id = NEW.operator_id AND m.deletion_state IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'deleted user cannot create memory');
END;
