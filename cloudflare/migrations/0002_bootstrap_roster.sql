-- Approved roles only. Job titles and roster completeness are intentionally absent.
INSERT OR IGNORE INTO operators (email, display_name, role, active) VALUES
  ('sheshnarayan.iyer@gmail.com', 'Shesh Narayaniyer', 'super_admin', 1),
  ('aditi@allthingswtf.com', 'Aditi Raj', 'admin', 1),
  ('sai@allthingswtf.com', 'Sai Date', 'editor', 1),
  ('naisthika@allthingswtf.com', 'Naisthika Rathod', 'editor', 1),
  ('amal@allthingswtf.com', 'Amal Vinayan', 'editor', 1),
  ('akash@allthingswtf.com', 'Akash Pandey', 'editor', 1),
  ('yash.majithia@nksqr.com', 'Yash Majithia', 'editor', 1);

CREATE TRIGGER operators_require_active_super_admin_on_update
BEFORE UPDATE OF role, active ON operators
WHEN OLD.role = 'super_admin' AND OLD.active = 1
  AND (NEW.role <> 'super_admin' OR NEW.active <> 1)
  AND (SELECT COUNT(*) FROM operators WHERE role = 'super_admin' AND active = 1) = 1
BEGIN
  SELECT RAISE(ABORT, 'exactly one active super_admin is required');
END;

CREATE TRIGGER operators_require_active_super_admin_on_delete
BEFORE DELETE ON operators
WHEN OLD.role = 'super_admin' AND OLD.active = 1
  AND (SELECT COUNT(*) FROM operators WHERE role = 'super_admin' AND active = 1) = 1
BEGIN
  SELECT RAISE(ABORT, 'exactly one active super_admin is required');
END;
