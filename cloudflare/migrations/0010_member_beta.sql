-- Invite-only company member beta. Apply only through Wrangler migrations.
-- Bangalore is the first cohort; all members use the same company workspace.
-- Operator authority, public Alpha, and member-owned records stay separate.

CREATE TABLE member_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 320),
  clerk_user_id TEXT UNIQUE CHECK (clerk_user_id IS NULL OR (clerk_user_id GLOB 'user_*' AND length(clerk_user_id) BETWEEN 7 AND 128)),
  role TEXT NOT NULL CHECK (role = 'member'),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('invited', 'active', 'suspended', 'revoked')),
  pilot_cohort TEXT NOT NULL CHECK (pilot_cohort IN ('bangalore', 'company')),
  office TEXT NOT NULL CHECK (length(office) BETWEEN 2 AND 64),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT
);

CREATE INDEX member_users_lifecycle_cohort ON member_users(lifecycle_state, pilot_cohort, id);
CREATE INDEX member_users_office ON member_users(office, id);

CREATE TRIGGER member_users_no_delete
BEFORE DELETE ON member_users
BEGIN
  SELECT RAISE(ABORT, 'member users are lifecycle-managed');
END;

CREATE TRIGGER member_users_no_email_change
BEFORE UPDATE OF email ON member_users
BEGIN
  SELECT RAISE(ABORT, 'member email is immutable');
END;

CREATE TRIGGER member_users_no_clerk_rebind
BEFORE UPDATE OF clerk_user_id ON member_users
WHEN OLD.clerk_user_id IS NOT NULL AND NEW.clerk_user_id <> OLD.clerk_user_id
BEGIN
  SELECT RAISE(ABORT, 'member clerk identity is immutable after binding');
END;

CREATE TRIGGER member_users_lifecycle_guard
BEFORE UPDATE OF lifecycle_state ON member_users
WHEN NOT (
  (OLD.lifecycle_state = 'invited' AND NEW.lifecycle_state IN ('active', 'revoked'))
  OR (OLD.lifecycle_state = 'active' AND NEW.lifecycle_state IN ('suspended', 'revoked'))
  OR (OLD.lifecycle_state = 'suspended' AND NEW.lifecycle_state IN ('active', 'revoked'))
  OR (OLD.lifecycle_state = NEW.lifecycle_state)
)
BEGIN
  SELECT RAISE(ABORT, 'invalid member lifecycle transition');
END;

CREATE TRIGGER member_users_activation_requires_clerk_subject
BEFORE UPDATE OF lifecycle_state ON member_users
WHEN NEW.lifecycle_state = 'active' AND NEW.clerk_user_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'active member requires Clerk subject');
END;

CREATE TABLE member_invitations (
  id TEXT PRIMARY KEY CHECK (id GLOB 'minv_*' AND length(id) BETWEEN 13 AND 96),
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  clerk_invitation_id TEXT UNIQUE CHECK (clerk_invitation_id IS NULL OR (clerk_invitation_id GLOB 'invitation_*' AND length(clerk_invitation_id) BETWEEN 12 AND 160)),
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

CREATE INDEX member_invitations_member_created ON member_invitations(member_id, created_at DESC, id DESC);
CREATE INDEX member_invitations_status ON member_invitations(status, created_at DESC);

CREATE TRIGGER member_invitations_no_delete
BEFORE DELETE ON member_invitations
BEGIN
  SELECT RAISE(ABORT, 'member invitation receipts are append-only');
END;

CREATE TRIGGER member_invitations_terminal_guard
BEFORE UPDATE OF status ON member_invitations
WHEN OLD.status IN ('accepted', 'revoked') AND NEW.status <> OLD.status
BEGIN
  SELECT RAISE(ABORT, 'terminal invitation status is immutable');
END;

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

CREATE TABLE member_chat_conversations (
  id TEXT PRIMARY KEY CHECK (id GLOB 'mcnv_*' AND length(id) BETWEEN 13 AND 96),
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  workspace TEXT NOT NULL DEFAULT 'wtfmedia' CHECK (workspace = 'wtfmedia'),
  title TEXT NOT NULL DEFAULT 'New conversation' CHECK (length(title) BETWEEN 1 AND 240),
  source_mode TEXT NOT NULL DEFAULT 'published' CHECK (source_mode IN ('published', 'uncut', 'both')),
  episode_id TEXT CHECK (episode_id IS NULL OR (length(episode_id) BETWEEN 1 AND 128 AND episode_id NOT GLOB '*[^A-Za-z0-9_-]*')),
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'archived')),
  create_idempotency_key TEXT UNIQUE CHECK (create_idempotency_key IS NULL OR length(create_idempotency_key) BETWEEN 8 AND 256),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK ((lifecycle_state = 'active' AND archived_at IS NULL) OR (lifecycle_state = 'archived' AND archived_at IS NOT NULL))
);

CREATE INDEX member_chat_conversations_member_updated ON member_chat_conversations(member_id, updated_at DESC, id DESC);
CREATE INDEX member_chat_conversations_lifecycle ON member_chat_conversations(member_id, lifecycle_state, updated_at DESC);

CREATE TABLE member_chat_messages (
  id TEXT PRIMARY KEY CHECK (id GLOB 'mmsg_*' AND length(id) BETWEEN 13 AND 96),
  conversation_id TEXT NOT NULL REFERENCES member_chat_conversations(id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence BETWEEN 1 AND 100000),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  source_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (length(source_metadata_json) <= 30000 AND json_valid(source_metadata_json)),
  grounding_state TEXT NOT NULL DEFAULT 'ungrounded' CHECK (grounding_state IN ('grounded', 'ungrounded', 'unavailable')),
  model TEXT CHECK (model IS NULL OR length(model) BETWEEN 1 AND 160),
  model_fallback INTEGER NOT NULL DEFAULT 0 CHECK (model_fallback IN (0, 1)),
  request_id TEXT CHECK (request_id IS NULL OR length(request_id) BETWEEN 1 AND 160),
  idempotency_key TEXT CHECK (idempotency_key IS NULL OR length(idempotency_key) BETWEEN 8 AND 256),
  created_at TEXT NOT NULL,
  UNIQUE(conversation_id, sequence),
  UNIQUE(conversation_id, idempotency_key)
);

CREATE INDEX member_chat_messages_conversation_sequence ON member_chat_messages(conversation_id, sequence);

CREATE TRIGGER member_chat_messages_require_next_sequence
BEFORE INSERT ON member_chat_messages
WHEN NEW.sequence <> COALESCE((SELECT MAX(sequence) + 1 FROM member_chat_messages WHERE conversation_id = NEW.conversation_id), 1)
BEGIN
  SELECT RAISE(ABORT, 'member chat message sequence must be next');
END;

CREATE TRIGGER member_chat_messages_no_update
BEFORE UPDATE ON member_chat_messages
BEGIN
  SELECT RAISE(ABORT, 'member chat messages are immutable');
END;

CREATE TRIGGER member_chat_messages_no_delete
BEFORE DELETE ON member_chat_messages
BEGIN
  SELECT RAISE(ABORT, 'member chat messages are non-destructive');
END;

CREATE TRIGGER member_chat_conversations_no_delete
BEFORE DELETE ON member_chat_conversations
BEGIN
  SELECT RAISE(ABORT, 'member chat conversations are archive-only');
END;

CREATE TRIGGER member_chat_conversations_no_reassign
BEFORE UPDATE OF member_id ON member_chat_conversations
BEGIN
  SELECT RAISE(ABORT, 'member chat conversation ownership is immutable');
END;

CREATE TRIGGER member_chat_conversations_archive_only
BEFORE UPDATE OF lifecycle_state, archived_at ON member_chat_conversations
WHEN OLD.lifecycle_state = 'archived'
  OR NEW.lifecycle_state <> 'archived'
  OR NEW.archived_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'member chat lifecycle is archive-only');
END;

CREATE TABLE member_saved_memories (
  id TEXT PRIMARY KEY CHECK (id GLOB 'mmem_*' AND length(id) BETWEEN 13 AND 96),
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  source_conversation_id TEXT REFERENCES member_chat_conversations(id) ON DELETE RESTRICT,
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK ((lifecycle_state = 'active' AND archived_at IS NULL) OR (lifecycle_state = 'archived' AND archived_at IS NOT NULL))
);

CREATE INDEX member_saved_memories_member_updated ON member_saved_memories(member_id, lifecycle_state, updated_at DESC, id DESC);

CREATE TRIGGER member_saved_memories_no_reassign
BEFORE UPDATE OF member_id, content, source_conversation_id, created_at ON member_saved_memories
BEGIN
  SELECT RAISE(ABORT, 'member saved memory identity and content are immutable');
END;

CREATE TRIGGER member_saved_memories_archive_only
BEFORE UPDATE OF lifecycle_state, archived_at, updated_at ON member_saved_memories
WHEN OLD.lifecycle_state = 'archived'
  OR NEW.lifecycle_state <> 'archived'
  OR NEW.archived_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'member saved memory lifecycle is archive-only');
END;

CREATE TRIGGER member_saved_memories_no_delete
BEFORE DELETE ON member_saved_memories
BEGIN
  SELECT RAISE(ABORT, 'member saved memories are archive-only');
END;

-- Member Beta has its own staging-only release control. It must not inherit
-- the operator-history flag or become enabled by a public Alpha setting.
CREATE TABLE member_beta_releases (
  environment TEXT PRIMARY KEY CHECK (environment IN ('local', 'staging', 'production')),
  state TEXT NOT NULL CHECK (state IN ('paused', 'preview', 'stable', 'rolled_back')),
  updated_at TEXT NOT NULL,
  updated_by_operator_id INTEGER REFERENCES operators(id) ON DELETE RESTRICT
);
