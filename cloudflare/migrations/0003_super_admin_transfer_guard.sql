-- Transfer is the only permitted transient state between active super-admin seats.
CREATE TABLE super_admin_transfer_guard (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  from_operator_id INTEGER NOT NULL REFERENCES operators(id),
  to_operator_id INTEGER NOT NULL REFERENCES operators(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (from_operator_id <> to_operator_id)
);

DROP TRIGGER operators_require_active_super_admin_on_update;
DROP TRIGGER operators_require_active_super_admin_on_delete;

CREATE TRIGGER operators_only_transfer_may_demote_last_super_admin
BEFORE UPDATE OF role, active ON operators
WHEN OLD.role = 'super_admin' AND OLD.active = 1
  AND (NEW.role <> 'super_admin' OR NEW.active <> 1)
  AND (SELECT COUNT(*) FROM operators WHERE role = 'super_admin' AND active = 1) = 1
  AND NOT EXISTS (
    SELECT 1 FROM super_admin_transfer_guard
    WHERE from_operator_id = OLD.id
  )
BEGIN
  SELECT RAISE(ABORT, 'exactly one active super_admin is required');
END;

CREATE TRIGGER operators_only_transfer_may_delete_last_super_admin
BEFORE DELETE ON operators
WHEN OLD.role = 'super_admin' AND OLD.active = 1
  AND (SELECT COUNT(*) FROM operators WHERE role = 'super_admin' AND active = 1) = 1
BEGIN
  SELECT RAISE(ABORT, 'exactly one active super_admin is required');
END;
