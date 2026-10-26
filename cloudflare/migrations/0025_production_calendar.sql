-- Local-first production calendar and pipeline. This migration is additive;
-- existing episode records and the legacy public calendar remain untouched.

CREATE TABLE production_ips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent TEXT,
  color TEXT NOT NULL CHECK (color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE production_items (
  id TEXT PRIMARY KEY,
  episode_id TEXT REFERENCES episodes(id),
  ip_id TEXT REFERENCES production_ips(id),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  format TEXT NOT NULL DEFAULT 'episode',
  stage TEXT NOT NULL DEFAULT 'planned',
  owner TEXT,
  notes TEXT NOT NULL DEFAULT '',
  source_status TEXT NOT NULL DEFAULT 'manual' CHECK (source_status IN ('verified', 'unverified', 'manual')),
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX production_items_ip_stage ON production_items(ip_id, stage);

CREATE TABLE production_events (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES production_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  date_state TEXT NOT NULL DEFAULT 'planned' CHECK (date_state IN ('planned', 'actual', 'unverified')),
  owner TEXT,
  notes TEXT NOT NULL DEFAULT '',
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX production_events_day ON production_events(day);
CREATE INDEX production_events_item ON production_events(item_id);

CREATE TABLE production_guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE production_item_guests (
  item_id TEXT NOT NULL REFERENCES production_items(id) ON DELETE CASCADE,
  guest_id TEXT NOT NULL REFERENCES production_guests(id),
  agreement_status TEXT NOT NULL DEFAULT 'unknown',
  PRIMARY KEY (item_id, guest_id)
);

CREATE TABLE production_dubbing (
  item_id TEXT PRIMARY KEY REFERENCES production_items(id) ON DELETE CASCADE,
  target_language TEXT NOT NULL DEFAULT 'Hindi',
  status TEXT NOT NULL DEFAULT 'unknown',
  owner TEXT,
  notes TEXT NOT NULL DEFAULT '',
  source_ref TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE production_permissions (
  item_id TEXT NOT NULL REFERENCES production_items(id) ON DELETE CASCADE,
  guest_id TEXT NOT NULL REFERENCES production_guests(id),
  status TEXT NOT NULL DEFAULT 'unknown',
  notes TEXT NOT NULL DEFAULT '',
  source_ref TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (item_id, guest_id)
);
CREATE INDEX production_permissions_status ON production_permissions(status);

CREATE TABLE production_blockers (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES production_items(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  next_action TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX production_blockers_item_status ON production_blockers(item_id, status);

CREATE TABLE production_imports (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE CHECK (length(sha256) = 64),
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sheet_count INTEGER NOT NULL,
  cell_count INTEGER NOT NULL
);
CREATE TABLE production_source_cells (
  import_id TEXT NOT NULL REFERENCES production_imports(id) ON DELETE CASCADE,
  sheet TEXT NOT NULL,
  cell_ref TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  raw_type TEXT,
  raw_value TEXT,
  raw_ooxml TEXT,
  cached_value TEXT,
  formula TEXT,
  fill TEXT,
  style_id TEXT,
  number_format TEXT,
  PRIMARY KEY (import_id, sheet, cell_ref)
);
CREATE INDEX production_source_cells_sheet_row ON production_source_cells(import_id, sheet, row_number);
CREATE TABLE production_import_reviews (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES production_imports(id) ON DELETE CASCADE,
  sheet TEXT NOT NULL,
  cell_ref TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  mapped_item_id TEXT REFERENCES production_items(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE production_change_log (
  id TEXT PRIMARY KEY,
  actor_operator_id INTEGER REFERENCES operators(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX production_change_log_entity ON production_change_log(entity_type, entity_id, occurred_at);

INSERT INTO production_ips (id, name, parent, color, sort_order) VALUES
  ('wtf-is', 'WTF Is', 'Nikhil Kamath', '#6B3B8A', 10),
  ('wtf-finance', 'WTF Finance', 'Nikhil Kamath', '#176B52', 20),
  ('wtf-online', 'WTF Online', 'Nikhil Kamath', '#315C9A', 30),
  ('wtf-people', 'WTF People', 'Nikhil Kamath', '#A64B28', 40),
  ('stitched', 'Stitched', 'Nikhil Kamath', '#8D3E68', 50),
  ('pov', 'POV', NULL, '#615025', 60),
  ('animated-ip', 'Animated IP', NULL, '#227187', 70),
  ('bts', 'BTS', 'All Things WTF', '#766C1B', 80),
  ('ways-of-the-world', 'Ways Of The World', NULL, '#724B42', 90);
