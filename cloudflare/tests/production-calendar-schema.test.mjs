import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const migrationPath = join(root, "migrations", "0006_production_calendar.sql");
const migrations = [
  "0001_ops_foundation.sql",
  "0002_bootstrap_roster.sql",
  "0003_super_admin_transfer_guard.sql",
  "0004_operator_invitation_approvals.sql",
  "0005_provenance_spine.sql",
  "0006_production_calendar.sql",
];

function applyMigrations(database) {
  for (const migration of migrations) {
    const path = join(root, "migrations", migration);
    assert.ok(existsSync(path), `missing migration ${migration}`);
    const result = spawnSync("sqlite3", [database], {
      input: readFileSync(path, "utf8"),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
}

function sql(database, input) {
  const result = spawnSync("sqlite3", [database], { input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function sqlFails(database, input) {
  const result = spawnSync("sqlite3", [database], { input, encoding: "utf8" });
  assert.notEqual(result.status, 0, `Expected query to fail: ${input}`);
}

test("production calendar migration models native scheduling, sticky notes, and attributed conflicts", () => {
  const schema = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
  assert.match(schema, /CREATE TABLE production_work_items/);
  assert.match(schema, /CREATE TABLE production_notes/);
  assert.match(schema, /CREATE TABLE production_work_item_revisions/);
  assert.match(schema, /CREATE TABLE production_conflicts/);
  assert.match(schema, /Asia\/Kolkata/);
  assert.match(schema, /production_work_item_change/);
  assert.match(schema, /production_conflict_resolve/);

  const database = join(mkdtempSync(join(tmpdir(), "wtfmedia-calendar-")), "calendar.sqlite");
  applyMigrations(database);

  sql(database, "INSERT INTO episodes (id, slug, title, ip, show_title) VALUES ('ep_01J0000000000000000000001', 'synthetic-episode', 'Synthetic Episode', 'WTF', 'WTF Podcast');");
  sql(database, `
    INSERT INTO production_work_items (
      id, episode_id, ip_key, ip_label, title, workflow_stage, color_token, schedule_kind,
      starts_at_utc, event_timezone, status, revision
    ) VALUES (
      'pwi_01J0000000000000000000001', 'ep_01J0000000000000000000001', 'wtf', 'WTF', 'Synthetic shoot', 'shoot', 'shoot_purple', 'timed',
      '2026-09-01T04:30:00.000Z', 'Asia/Kolkata', 'scheduled', 1
    );
  `);
  sql(database, `
    INSERT INTO production_notes (id, work_item_id, color_token, body)
    VALUES ('pnt_01J0000000000000000000001', 'pwi_01J0000000000000000000001', 'shoot_purple', 'Synthetic note');
  `);
  sql(database, `
    INSERT INTO production_work_item_revisions (work_item_id, revision, change_kind, actor_operator_id, safe_projection_json)
    VALUES ('pwi_01J0000000000000000000001', 1, 'created', 1, '{}');
  `);
  sql(database, `
    INSERT INTO production_conflicts (id, work_item_id, stale_revision, current_revision, state)
    VALUES ('pcf_01J0000000000000000000001', 'pwi_01J0000000000000000000001', 1, 2, 'pending');
  `);

  assert.equal(sql(database, "SELECT event_timezone FROM production_work_items;").trim(), "Asia/Kolkata");
  assert.equal(sql(database, "SELECT color_token FROM production_notes;").trim(), "shoot_purple");
  assert.equal(sql(database, "SELECT state FROM production_conflicts;").trim(), "pending");
  sqlFails(database, "INSERT INTO production_notes (id, color_token, body) VALUES ('pnt_01J0000000000000000000002', 'shoot_purple', 'Detached');");
  sqlFails(database, "UPDATE production_work_item_revisions SET change_kind = 'updated' WHERE work_item_id = 'pwi_01J0000000000000000000001';");
  sqlFails(database, "DELETE FROM production_work_items WHERE id = 'pwi_01J0000000000000000000001';");
  sql(database, "INSERT INTO audit_events (event_id, occurred_at, action, entity_type, entity_id, outcome, environment, correlation_id, schema_version) VALUES ('evt_calendar_01', '2026-09-01T00:00:00.000Z', 'production_work_item_change', 'production_work_item', 'pwi_01J0000000000000000000001', 'succeeded', 'local', 'corr_calendar_01', 1);");
  assert.equal(sql(database, "SELECT action FROM audit_events WHERE event_id = 'evt_calendar_01';").trim(), "production_work_item_change");
});
