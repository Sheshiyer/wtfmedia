import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadSnapshot } from "./load_local.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(resolve(here, "../../cloudflare/migrations/0025_production_calendar.sql"), "utf8");
const checksMigration = readFileSync(resolve(here, "../../cloudflare/migrations/0026_production_source_checks.sql"), "utf8");
const targetsMigration = readFileSync(resolve(here, "../../cloudflare/migrations/0027_production_ip_targets.sql"), "utf8");
const trackerDetailsMigration = readFileSync(resolve(here, "../../cloudflare/migrations/0028_production_tracker_details.sql"), "utf8");

test("local import preserves source data and is idempotent", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE episodes(id TEXT PRIMARY KEY); CREATE TABLE operators(id INTEGER PRIMARY KEY);");
  db.exec(migration);
  db.exec(checksMigration);
  db.exec(targetsMigration);
  db.exec(trackerDetailsMigration);
  const snapshot = {
    schema_version: 1,
    source: { filename: "fixture.xlsx", sha256: "a".repeat(64) },
    ip_names: ["WTF Is"],
    source_snapshot: {
      sheets: [{ name: "Test" }],
      cells: [{ sheet: "Test", cell: "A2", value: "Episode", cached_value: null, data_type: "s", raw_ooxml: { type: "s", value: "1" }, number_format: "General", style_id: 0, fill: { pattern: "solid" } }],
    },
    candidates: {
      items: [{ id: "item_1", ip: null, title: "Episode", format: "episode", source: "Test!A2", shoot_location_raw: "Mumbai, India" }],
      events: [{ id: "event_1", item_id: "item_1", kind: "shoot", date: "2026-08-10", source: "Test!B2" }],
      guests: [{ id: "guest_1", item_id: "item_1", name_raw: "Guest", agreement_raw: false }],
      permissions: [{ item_id: "item_1", guest_id: "guest_1", status: "unknown", source: "Test!C2" }],
      dubbing: [{ item_id: "item_1", target_language: "Hindi", source: "Test!D2" }],
      checks: [{ item_id: "item_1", source_row: 2, guest_name: "Guest", guest_role: "Founder", guest_agreement: "checked", dubbing: "unchecked", hindi_live: "unchecked", agreement_note: null }],
      review: [{ code: "ip_unclassified", source: "Test!A2", detail: "Needs a human decision." }],
    },
    counts: {},
  };
  assert.equal(loadSnapshot(db, snapshot).status, "imported");
  assert.equal(loadSnapshot(db, snapshot).status, "already_imported");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM production_items").get().n, 1);
  assert.equal(db.prepare("SELECT ip_id FROM production_items WHERE id = 'item_1'").get().ip_id, null);
  assert.equal(db.prepare("SELECT shoot_location FROM production_items WHERE id = 'item_1'").get().shoot_location, "Mumbai, India");
  assert.equal(db.prepare("SELECT guest_role FROM production_source_checks WHERE source_row = 2").get().guest_role, "Founder");
  assert.equal(db.prepare("SELECT date_state FROM production_events WHERE id = 'event_1'").get().date_state, "unverified");
  assert.equal(db.prepare("SELECT raw_value FROM production_source_cells WHERE cell_ref = 'A2'").get().raw_value, "Episode");
  assert.equal(db.prepare("SELECT raw_ooxml FROM production_source_cells WHERE cell_ref = 'A2'").get().raw_ooxml, '{"type":"s","value":"1"}');
  assert.equal(db.prepare("SELECT status FROM production_permissions WHERE item_id = 'item_1'").get().status, "unknown");
  db.close();
});
