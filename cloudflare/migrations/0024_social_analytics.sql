-- Shared selection, private conversations. No provider secrets are stored here.
CREATE TABLE social_analytics_workspace (id INTEGER PRIMARY KEY CHECK(id = 1), profile_id TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE social_analytics_investigations (
 member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE CASCADE,
 id TEXT NOT NULL, title TEXT NOT NULL, messages_json TEXT NOT NULL CHECK(length(messages_json) <= 100000),
 updated_at TEXT NOT NULL, deleted_at TEXT, PRIMARY KEY(member_id,id)
);
CREATE TABLE social_analytics_rate_limits (
 member_id INTEGER PRIMARY KEY REFERENCES member_users(id) ON DELETE CASCADE,
 window_start INTEGER NOT NULL, requests INTEGER NOT NULL
);
