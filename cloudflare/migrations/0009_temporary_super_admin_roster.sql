-- Temporary ownership handoff for the Beta operator roster.
-- Cloudflare Access remains the external authentication allowlist; this
-- migration only changes the application-owned D1 roster.

INSERT INTO operators (email, display_name, role, active)
VALUES ('connect2nikhai@gmail.com', 'Connect2nikhai', 'admin', 1)
ON CONFLICT(email) DO UPDATE SET
  display_name = excluded.display_name,
  active = 1,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- The transfer guard permits the one deliberate transition away from the
-- existing bootstrap superadmin while preserving the one-active-seat rule.
INSERT INTO super_admin_transfer_guard (id, from_operator_id, to_operator_id)
SELECT 1, current_admin.id, temporary_owner.id
FROM operators AS current_admin
JOIN operators AS temporary_owner
  ON temporary_owner.email = 'connect2nikhai@gmail.com'
WHERE current_admin.email = 'sheshnarayan.iyer@gmail.com'
  AND current_admin.role = 'super_admin'
  AND current_admin.active = 1
  AND current_admin.id <> temporary_owner.id;

UPDATE operators
SET role = 'admin',
    active = 0,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE email = 'sheshnarayan.iyer@gmail.com'
  AND role = 'super_admin'
  AND active = 1;

UPDATE operators
SET role = 'super_admin',
    active = 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE email = 'connect2nikhai@gmail.com';

DELETE FROM super_admin_transfer_guard WHERE id = 1;
