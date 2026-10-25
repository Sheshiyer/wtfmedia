-- Operational copy of per-row workbook checkboxes. Raw source cells remain immutable.
-- Unchecked means the source box was not ticked; it is not proof of refusal or failure.
CREATE TABLE production_source_checks (
  item_id TEXT NOT NULL REFERENCES production_items(id) ON DELETE CASCADE,
  source_row INTEGER NOT NULL,
  guest_name TEXT,
  guest_agreement TEXT NOT NULL DEFAULT 'not_box' CHECK (guest_agreement IN ('checked', 'unchecked', 'not_box')),
  dubbing TEXT NOT NULL DEFAULT 'not_box' CHECK (dubbing IN ('checked', 'unchecked', 'not_box')),
  hindi_live TEXT NOT NULL DEFAULT 'not_box' CHECK (hindi_live IN ('checked', 'unchecked', 'not_box')),
  agreement_note TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (item_id, source_row)
);
