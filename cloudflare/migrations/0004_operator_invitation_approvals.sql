-- New invitations require a super-admin approval record; domains are never authority.
CREATE TABLE operator_invitation_approvals (
  email TEXT PRIMARY KEY CHECK (email = lower(trim(email)) AND instr(email, '@') > 1),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 160),
  approved_by_operator_id INTEGER NOT NULL REFERENCES operators(id),
  approved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  consumed_at TEXT
);

CREATE INDEX operator_invitation_approvals_pending
  ON operator_invitation_approvals(consumed_at, approved_at);
