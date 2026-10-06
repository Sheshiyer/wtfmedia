-- Keep historical operator IDs/audits when explicitly returning a user to member.
-- Suspension alone must never fall back to member access.
ALTER TABLE operators ADD COLUMN member_only INTEGER NOT NULL DEFAULT 0 CHECK (member_only IN (0, 1));
CREATE TRIGGER operators_super_admin_not_member
BEFORE UPDATE OF member_only ON operators
WHEN OLD.role = 'super_admin' AND NEW.member_only = 1
BEGIN
  SELECT RAISE(ABORT, 'super admin cannot become a member');
END;
