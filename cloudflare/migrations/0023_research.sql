CREATE TABLE research_briefs (
 id TEXT PRIMARY KEY,
 member_id INTEGER NOT NULL REFERENCES member_users(id),
 revision INTEGER NOT NULL,
 current_run_id TEXT,
 document_json TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX research_briefs_owner ON research_briefs(member_id, updated_at);
CREATE TABLE research_versions (
 brief_id TEXT NOT NULL REFERENCES research_briefs(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 document_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(brief_id, revision)
);
CREATE TABLE research_runs (
 run_id TEXT PRIMARY KEY,
 brief_id TEXT NOT NULL REFERENCES research_briefs(id) ON DELETE CASCADE,
 payload_json TEXT NOT NULL,
 submitted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE research_erasure_jobs (
 run_id TEXT PRIMARY KEY,
 member_id INTEGER NOT NULL REFERENCES member_users(id),
 created_at TEXT NOT NULL
);

CREATE TRIGGER research_no_deleted_owner_insert BEFORE INSERT ON research_briefs
WHEN EXISTS (SELECT 1 FROM member_users WHERE id = NEW.member_id AND deletion_state IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'deleted user cannot create research'); END;
CREATE TRIGGER research_no_deleted_owner_update BEFORE UPDATE ON research_briefs
WHEN EXISTS (SELECT 1 FROM member_users WHERE id = NEW.member_id AND deletion_state IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'deleted user cannot update research'); END;

CREATE TRIGGER research_active_limit_insert BEFORE INSERT ON research_briefs
WHEN json_extract(NEW.document_json, '$.status') IN ('queued', 'running')
 AND (SELECT COUNT(*) FROM research_briefs WHERE member_id = NEW.member_id
      AND json_extract(document_json, '$.status') IN ('queued', 'running', 'cancel_pending', 'deleting')) >= 3
BEGIN SELECT RAISE(ABORT, 'research_active_limit'); END;
CREATE TRIGGER research_active_limit_update BEFORE UPDATE ON research_briefs
WHEN json_extract(NEW.document_json, '$.status') IN ('queued', 'running')
 AND (SELECT COUNT(*) FROM research_briefs WHERE member_id = NEW.member_id AND id != NEW.id
      AND json_extract(document_json, '$.status') IN ('queued', 'running', 'cancel_pending', 'deleting')) >= 3
BEGIN SELECT RAISE(ABORT, 'research_active_limit'); END;
