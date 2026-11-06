-- A successful poll publishes all three tabs together, alongside operational records.
CREATE TABLE IF NOT EXISTS production_sheet_sync (
  id INTEGER PRIMARY KEY CHECK(id=1), checked_at TEXT, changed_at TEXT,
  digest TEXT, snapshot TEXT, bindings TEXT, review TEXT,
  lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO production_sheet_sync(id) VALUES(1);
-- Fences expired/concurrent polls: a stale owner fails the entire D1 batch.
CREATE TABLE IF NOT EXISTS production_sheet_sync_guard (ok INTEGER PRIMARY KEY CHECK(ok=1));
