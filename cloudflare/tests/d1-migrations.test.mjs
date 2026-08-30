import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const persistTo = mkdtempSync(join(tmpdir(), "wtfmedia-phase2-d1-"));
const database = join(persistTo, "ops.sqlite");
const migrations = [
  "0001_ops_foundation.sql",
  "0002_bootstrap_roster.sql",
  "0003_super_admin_transfer_guard.sql",
  "0004_operator_invitation_approvals.sql",
  "0005_provenance_spine.sql",
  "0006_public_calendar.sql",
];

function sql(input) {
  return spawnSync("sqlite3", [database], {
    input,
    encoding: "utf8",
  });
}

function succeeds(input) {
  const result = sql(input);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function fails(input) {
  const result = sql(input);
  assert.notEqual(result.status, 0, result.stdout);
}

function applyMigrations() {
  succeeds("CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY);");
  for (const migration of migrations) {
    const applied = succeeds(`SELECT COUNT(*) FROM d1_migrations WHERE name = '${migration}';`).trim();
    if (applied === "0") {
      succeeds(readFileSync(join(root, "migrations", migration), "utf8"));
      succeeds(`INSERT INTO d1_migrations (name) VALUES ('${migration}');`);
    }
  }
}

before(() => {
  applyMigrations();
  applyMigrations();
});

after(() => {
  // The local persistence directory is intentionally outside the repository.
});

test("fresh local migrations are repeatable", () => {
  const listing = succeeds("SELECT name FROM d1_migrations ORDER BY name;");
  assert.match(listing, /0001_ops_foundation/);
  assert.match(listing, /0002_bootstrap_roster/);
  assert.match(listing, /0003_super_admin_transfer_guard/);
  assert.match(listing, /0004_operator_invitation_approvals/);
  assert.match(listing, /0005_provenance_spine/);
  assert.match(listing, /0006_public_calendar/);
});

test("invitation approvals are explicit, normalized, and reusable only before consumption", () => {
  succeeds("INSERT INTO operator_invitation_approvals (email, display_name, approved_by_operator_id) VALUES ('approved@example.test', 'Approved Person', 1);");
  fails("INSERT INTO operator_invitation_approvals (email, display_name, approved_by_operator_id) VALUES ('NOT-NORMALIZED@example.test', 'No', 1);");
  succeeds("UPDATE operator_invitation_approvals SET consumed_at = '2026-08-26T00:00:00.000Z' WHERE email = 'approved@example.test';");
  assert.equal(succeeds("SELECT COUNT(*) FROM operator_invitation_approvals WHERE email = 'approved@example.test' AND consumed_at IS NOT NULL;").trim(), "1");
});

test("super_admin invariant rejects zero or multiple active seats", () => {
  fails("UPDATE operators SET active = 0 WHERE role = 'super_admin' AND active = 1;");
  fails("INSERT INTO operators (email, display_name, role, active) VALUES ('second@example.test', 'Second', 'super_admin', 1);");
});

test("bootstrap roster has the approved active role distribution", () => {
  const result = succeeds("SELECT role || ':' || COUNT(*) FROM operators WHERE active = 1 GROUP BY role ORDER BY role;");
  assert.equal(result.trim(), "admin:1\neditor:5\nsuper_admin:1");
  const roster = succeeds("SELECT email FROM operators ORDER BY email;");
  assert.match(roster, /yash\.majithia@nksqr\.com/);
  assert.doesNotMatch(roster, /title|job/i);
});

test("roles and audit envelopes are database-enforced", () => {
  fails("INSERT INTO operators (email, display_name, role, active) VALUES ('unknown@example.test', 'Unknown', 'owner', 1);");
  fails("INSERT INTO audit_events (event_id, occurred_at, action, entity_type, entity_id, outcome, environment, correlation_id, schema_version) VALUES ('bad-audit', '2026-01-01T00:00:00.000Z', 'unknown', 'operator', '1', 'allowed', 'local', 'corr', 1);");
});
