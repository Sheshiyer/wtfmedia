-- Staging/local release state for the authenticated chat slice.
-- Production is intentionally excluded; live activation needs a separate gate.
CREATE TABLE release_manifests (
  environment TEXT PRIMARY KEY CHECK (environment IN ('local', 'staging')),
  state TEXT NOT NULL DEFAULT 'paused' CHECK (state IN ('paused', 'preview', 'stable', 'rolled_back')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by_operator_id INTEGER REFERENCES operators(id) ON DELETE RESTRICT
);

CREATE INDEX release_manifests_state ON release_manifests(state);
