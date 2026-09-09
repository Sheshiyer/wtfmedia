-- Clerk currently issues invitation IDs with an inv_ prefix. Preserve the
-- historical invitation_ receipt form while allowing current provider IDs.
-- Rebuild the constrained table and its audit child without dropping records.

ALTER TABLE member_invitations RENAME TO member_invitations_legacy;

CREATE TABLE member_invitations (
  id TEXT PRIMARY KEY CHECK (id GLOB 'minv_*' AND length(id) BETWEEN 13 AND 96),
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  clerk_invitation_id TEXT UNIQUE CHECK (clerk_invitation_id IS NULL OR ((clerk_invitation_id GLOB 'invitation_*' OR clerk_invitation_id GLOB 'inv_*') AND length(clerk_invitation_id) BETWEEN 12 AND 160)),
  status TEXT NOT NULL CHECK (status IN ('dispatching', 'sent', 'accepted', 'revoked', 'failed', 'delivery_unknown')),
  created_by_operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 128),
  sent_at TEXT,
  accepted_at TEXT,
  revoked_at TEXT,
  failure_code TEXT CHECK (failure_code IS NULL OR length(failure_code) BETWEEN 1 AND 160),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO member_invitations (id, member_id, clerk_invitation_id, status, created_by_operator_id, correlation_id, sent_at, accepted_at, revoked_at, failure_code, created_at, updated_at)
SELECT id, member_id, clerk_invitation_id, status, created_by_operator_id, correlation_id, sent_at, accepted_at, revoked_at, failure_code, created_at, updated_at
FROM member_invitations_legacy;

ALTER TABLE member_audit_events RENAME TO member_audit_events_legacy;

CREATE TABLE member_audit_events (
  id TEXT PRIMARY KEY CHECK (id GLOB 'mevt_*' AND length(id) BETWEEN 13 AND 96),
  actor_operator_id INTEGER REFERENCES operators(id) ON DELETE RESTRICT,
  member_id INTEGER REFERENCES member_users(id) ON DELETE RESTRICT,
  invitation_id TEXT REFERENCES member_invitations(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('member_invite', 'member_invite_revoke', 'member_suspend', 'member_reactivate', 'member_activate')),
  outcome TEXT NOT NULL CHECK (outcome IN ('succeeded', 'failed', 'denied', 'unknown')),
  correlation_id TEXT NOT NULL CHECK (length(correlation_id) BETWEEN 8 AND 128),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json) AND length(metadata_json) <= 2000),
  occurred_at TEXT NOT NULL
);

INSERT INTO member_audit_events (id, actor_operator_id, member_id, invitation_id, action, outcome, correlation_id, metadata_json, occurred_at)
SELECT id, actor_operator_id, member_id, invitation_id, action, outcome, correlation_id, metadata_json, occurred_at
FROM member_audit_events_legacy;

DROP TABLE member_audit_events_legacy;
DROP TABLE member_invitations_legacy;

CREATE INDEX member_invitations_member_created ON member_invitations(member_id, created_at DESC, id DESC);
CREATE INDEX member_invitations_status ON member_invitations(status, created_at DESC);
CREATE TRIGGER member_invitations_no_delete
BEFORE DELETE ON member_invitations
BEGIN
  SELECT RAISE(ABORT, 'member invitations are append-only');
END;
CREATE TRIGGER member_invitations_terminal_guard
BEFORE UPDATE OF status ON member_invitations
WHEN OLD.status IN ('accepted', 'revoked') AND NEW.status <> OLD.status
BEGIN
  SELECT RAISE(ABORT, 'terminal invitation status is immutable');
END;

CREATE INDEX member_audit_events_member_time ON member_audit_events(member_id, occurred_at DESC, id DESC);
CREATE INDEX member_audit_events_actor_time ON member_audit_events(actor_operator_id, occurred_at DESC, id DESC);
CREATE TRIGGER member_audit_events_no_update
BEFORE UPDATE ON member_audit_events
BEGIN
  SELECT RAISE(ABORT, 'member audit events are append-only');
END;
CREATE TRIGGER member_audit_events_no_delete
BEFORE DELETE ON member_audit_events
BEGIN
  SELECT RAISE(ABORT, 'member audit events are append-only');
END;
