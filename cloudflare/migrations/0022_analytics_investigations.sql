-- Private saved chat snapshots; ownership follows the existing member chat lane.
CREATE TABLE analytics_investigations (
  member_id INTEGER NOT NULL REFERENCES member_users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages_json TEXT NOT NULL CHECK (length(messages_json) <= 100000),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (member_id, id)
);
