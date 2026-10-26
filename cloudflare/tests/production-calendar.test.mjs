import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";
import { handleProductionCalendarRequest } from "../src/production-calendar.ts";
import { policyForPath } from "../src/auth/policy.ts";

const database = new DatabaseSync(":memory:");

class Statement {
  constructor(sql, values = []) { this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.sql, values); }
  async first() { return database.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: database.prepare(this.sql).all(...this.values), success: true }; }
  async run() {
    const result = database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

const env = { DB: {
  prepare: (sql) => new Statement(sql),
  async batch(statements) {
    database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      database.exec("COMMIT");
      return results;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  },
} };
const editor = { operatorId: 2, role: "editor", environment: "local", correlationId: "calendar-test-001" };
const admin = { operatorId: 1, role: "admin", environment: "local", correlationId: "calendar-test-002" };

function request(method = "GET", payload, query = "") {
  return new Request(`https://local.test/ops/api/production${query}`, {
    method,
    ...(payload ? { headers: { "content-type": "application/json" }, body: JSON.stringify(payload) } : {}),
  });
}

before(() => {
  database.exec("CREATE TABLE operators (id INTEGER PRIMARY KEY); CREATE TABLE episodes (id TEXT PRIMARY KEY)");
  database.exec("INSERT INTO operators(id) VALUES (1), (2)");
  database.exec(readFileSync(new URL("../migrations/0016_production_calendar.sql", import.meta.url), "utf8"));
  database.exec(readFileSync(new URL("../migrations/0017_production_source_checks.sql", import.meta.url), "utf8"));
  database.exec(readFileSync(new URL("../migrations/0018_production_ip_targets.sql", import.meta.url), "utf8"));
  database.exec(readFileSync(new URL("../migrations/0019_production_tracker_details.sql", import.meta.url), "utf8"));
});
after(() => database.close());

test("production API policy separates read and write capabilities", () => {
  assert.deepEqual(policyForPath("/ops/api/production", "GET"), ["production", "read"]);
  assert.deepEqual(policyForPath("/ops/api/production", "POST"), ["production", "write"]);
  assert.equal(policyForPath("/ops/api/production", "DELETE"), null);
});

test("local snapshot is empty of invented records and contains nine approved IPs", async () => {
  const response = await handleProductionCalendarRequest(request(), env, editor);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ips.length, 9);
  assert.deepEqual(body.items, []);
  assert.deepEqual(body.events, []);
  assert.equal(body.canEdit, true);
  assert.equal(body.canManage, false);
  assert.equal(body.sourceSummary, null);
});

test("editor writes a real item and event, with validated dates and audit", async () => {
  const created = await handleProductionCalendarRequest(request("POST", {
    action: "create_item",
    data: { ipId: "wtf-is", title: "Local production item", format: "panel", stage: "planned", owner: "", notes: "", shootLocation: "Mumbai, India" },
  }), env, editor);
  assert.equal(created.status, 201);
  const itemId = (await created.json()).id;
  assert.ok(itemId.startsWith("pitem_"));

  const invalid = await handleProductionCalendarRequest(request("POST", {
    action: "create_event",
    data: { itemId, kind: "shoot", day: "2026-02-30", dateState: "planned", owner: "", notes: "" },
  }), env, editor);
  assert.equal(invalid.status, 400);

  const event = await handleProductionCalendarRequest(request("POST", {
    action: "create_event",
    data: { itemId, kind: "shoot", day: "2026-08-21", dateState: "planned", owner: "", notes: "" },
  }), env, editor);
  assert.equal(event.status, 201);
  const snapshot = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].shootLocation, "Mumbai, India");
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.events[0].day, "2026-08-21");
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM production_change_log").get().n, 2);
});

test("a new dubbing episode is tracked immediately and remains not published until an actual go-live date", async () => {
  const created = await handleProductionCalendarRequest(request("POST", {
    action: "create_item",
    data: { ipId: "wtf-is", title: "New dubbing episode", format: "panel", stage: "planned", owner: "", notes: "", shootLocation: null, trackDubbing: true },
  }), env, editor);
  assert.equal(created.status, 201);
  const itemId = (await created.json()).id;
  const initial = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(initial.dubbing.find((job) => job.itemId === itemId).publicationStatus, "not-published");
  assert.equal(initial.dubbing.find((job) => job.itemId === itemId).status, "pending");
  assert.equal(initial.dubbing.find((job) => job.itemId === itemId).sourcePostedCheck, "not_box");
  assert.equal(initial.items.find((item) => item.id === itemId).sourceRef, null);

  const note = await handleProductionCalendarRequest(request("POST", {
    action: "update_dubbing", data: { itemId, targetLanguage: "hi", status: "in-progress", owner: null, notes: "Waiting for the voice sample" },
  }), env, editor);
  assert.equal(note.status, 200);
  const withNote = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(withNote.dubbing.find((job) => job.itemId === itemId).notes, "Waiting for the voice sample");
  assert.equal(withNote.dubbing.find((job) => job.itemId === itemId).publicationStatus, "not-published");

  const live = await handleProductionCalendarRequest(request("POST", {
    action: "create_event", data: { itemId, kind: "dub_schedule", day: "2026-10-26", dateState: "actual", owner: null, notes: "" },
  }), env, editor);
  assert.equal(live.status, 201);
  const published = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(published.dubbing.find((job) => job.itemId === itemId).publicationStatus, "published");
  assert.equal(published.dubbing.find((job) => job.itemId === itemId).publishedOn, "2026-10-26");
});

test("source checkbox edits preserve unchecked as a distinct state and leave raw cells alone", async () => {
  const itemId = database.prepare("SELECT id FROM production_items LIMIT 1").get().id;
  database.prepare("INSERT INTO production_source_checks (item_id, source_row, guest_name, guest_role, guest_agreement, dubbing, hindi_live) VALUES (?, 3, 'Guest', 'Founder', 'checked', 'unchecked', 'unchecked')").run(itemId);
  database.prepare("INSERT INTO production_imports (id, filename, sha256, sheet_count, cell_count) VALUES ('test-import', 'fixture.xlsx', ?, 1, 1)").run("f".repeat(64));
  database.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_value) VALUES ('test-import', 'Production Tracker Podcast', 'I3', 3, 'False')").run();
  database.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_value) VALUES ('test-import', 'Production Tracker Podcast', 'I17', 17, 'False')").run();
  database.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_value) VALUES ('test-import', 'Pipeline', 'A2', 2, 'Future prospect')").run();
  const before = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(before.sourceChecks[0].dubbing, "unchecked");
  assert.equal(before.sourceChecks[0].guestRole, "Founder");
  const changed = await handleProductionCalendarRequest(request("POST", { action: "update_source_check", data: { itemId, sourceRow: 3, field: "dubbing", state: "checked" } }), env, editor);
  assert.equal(changed.status, 200);
  const after = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(after.sourceChecks[0].dubbing, "checked");
  const roleChanged = await handleProductionCalendarRequest(request("POST", { action: "update_source_role", data: { itemId, sourceRow: 3, guestRole: "CEO" } }), env, editor);
  assert.equal(roleChanged.status, 200);
  assert.equal(database.prepare("SELECT guest_role FROM production_source_checks WHERE source_row = 3").get().guest_role, "CEO");
  assert.equal(database.prepare("SELECT raw_value FROM production_source_cells WHERE cell_ref = 'I3'").get().raw_value, "False");
  const sourceRows = await (await handleProductionCalendarRequest(request("GET", undefined, "?sourceSheet=Production%20Tracker%20Podcast"), env, admin)).json();
  assert.equal(sourceRows.total, 1);
  assert.deepEqual(sourceRows.sourceRows.map((row) => row.rowNumber), [3]);
  assert.equal(database.prepare("SELECT raw_value FROM production_source_cells WHERE cell_ref = 'I17'").get().raw_value, "False");
  const managerSnapshot = await (await handleProductionCalendarRequest(request(), env, admin)).json();
  assert.deepEqual(managerSnapshot.sourceSheets.map((sheet) => sheet.name), ["Production Tracker Podcast"]);
  assert.equal(managerSnapshot.sourceSummary.cells, 2);
  assert.equal((await handleProductionCalendarRequest(request("GET", undefined, "?sourceSheet=Pipeline"), env, admin)).status, 400);
  assert.equal(database.prepare("SELECT raw_value FROM production_source_cells WHERE sheet = 'Pipeline'").get().raw_value, "Future prospect");
});

test("legend and raw source are admin-only", async () => {
  const denied = await handleProductionCalendarRequest(request("POST", {
    action: "update_ip", data: { id: "wtf-is", name: "WTF Is", color: "#654321", active: true, parent: "Nikhil Kamath" },
  }), env, editor);
  assert.equal(denied.status, 403);
  const sourceDenied = await handleProductionCalendarRequest(request("GET", undefined, "?sourceSheet=Calendar"), env, editor);
  assert.equal(sourceDenied.status, 403);
  const updated = await handleProductionCalendarRequest(request("POST", {
    action: "update_ip", data: { id: "wtf-is", name: "WTF Is", color: "#654321", active: true, parent: "Nikhil Kamath" },
  }), env, admin);
  assert.equal(updated.status, 200);
  const sourceAllowed = await handleProductionCalendarRequest(request("GET", undefined, "?sourceSheet=Calendar"), env, admin);
  assert.equal(sourceAllowed.status, 200);
  assert.deepEqual((await sourceAllowed.json()).sourceRows, []);
});

test("workbook IP targets are editable by a manager without changing IP identity", async () => {
  const before = await (await handleProductionCalendarRequest(request(), env, admin)).json();
  assert.equal(before.ips.find((ip) => ip.id === "bts").targetCount, 12);
  assert.equal(before.ips.find((ip) => ip.id === "stitched").targetPlus, true);
  const denied = await handleProductionCalendarRequest(request("POST", { action: "update_ip_target", data: { id: "bts", targetCount: 13, targetPlus: false } }), env, editor);
  assert.equal(denied.status, 403);
  const changed = await handleProductionCalendarRequest(request("POST", { action: "update_ip_target", data: { id: "bts", targetCount: 13, targetPlus: false } }), env, admin);
  assert.equal(changed.status, 200);
  const after = await (await handleProductionCalendarRequest(request(), env, admin)).json();
  assert.equal(after.ips.find((ip) => ip.id === "bts").targetCount, 13);
});

test("dub publication requires an actual go-live date, independently of workflow status", async () => {
  database.prepare("INSERT INTO production_items (id, title, source_status, source_ref) VALUES ('undated-dub', 'Undated dubbed episode', 'unverified', 'Dubbing Tracker!A8:H8'), ('dated-dub', 'Dated dubbed episode', 'unverified', 'Dubbing Tracker!A9:H9')").run();
  database.prepare("INSERT INTO production_dubbing (item_id, status, source_ref) VALUES ('undated-dub', 'unknown', 'Dubbing Tracker!B8:H8'), ('dated-dub', 'pushed-out', 'Dubbing Tracker!B9:H9')").run();
  database.prepare("INSERT INTO production_events (id, item_id, kind, day, date_state, source_ref) VALUES ('dated-dub-live', 'dated-dub', 'dub_schedule', '2026-07-09', 'actual', 'Dubbing Tracker!C9')").run();
  const initial = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.deepEqual(initial.dubbing.find((job) => job.itemId === "undated-dub"), {
    itemId: "undated-dub", targetLanguage: "Hindi", status: "unknown", owner: null, notes: "",
    sourceRef: "Dubbing Tracker!B8:H8", publicationStatus: "not-published", publishedOn: null,
    sourceRow: 8, sourceSection: "solo", sourceEpisodeNamed: false, sourcePermissionStatus: null, sourcePostedCheck: "not_box", sourceNotes: [],
  });
  assert.equal(initial.dubbing.find((job) => job.itemId === "dated-dub").publicationStatus, "published");
  assert.equal(initial.dubbing.find((job) => job.itemId === "dated-dub").publishedOn, "2026-07-09");

  const changed = await handleProductionCalendarRequest(request("POST", {
    action: "update_dubbing", data: { itemId: "undated-dub", targetLanguage: "Hindi", status: "pushed-out", owner: null, notes: "" },
  }), env, editor);
  assert.equal(changed.status, 200);
  const afterWorkflowChange = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.equal(afterWorkflowChange.dubbing.find((job) => job.itemId === "undated-dub").publicationStatus, "not-published");
});

test("dubbing source checkbox and row notes are separate from publication and private contacts", async () => {
  const guestId = "dubbing-guest";
  database.prepare("INSERT INTO production_guests (id, name) VALUES (?, 'Source guest')").run(guestId);
  database.prepare("INSERT INTO production_item_guests (item_id, guest_id) VALUES ('undated-dub', ?)").run(guestId);
  database.prepare("INSERT INTO production_permissions (item_id, guest_id, status, source_ref) VALUES ('undated-dub', ?, 'sample-requested', 'Dubbing Tracker!F8')").run(guestId);
  const insert = database.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_value) VALUES ('test-import', 'Dubbing Tracker', ?, 8, ?)");
  insert.run("A8", "WTF is Source? ");
  insert.run("E8", "private@example.com");
  insert.run("F8", "Asked for a sample");
  insert.run("G8", "true");
  insert.run("H8", "Sample sent; response pending");
  database.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_value) VALUES ('test-import', 'Dubbing Tracker', 'G9', 9, 'false')").run();
  const visibleToEditor = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  const job = visibleToEditor.dubbing.find((entry) => entry.itemId === "undated-dub");
  assert.equal(job.sourcePostedCheck, "checked");
  assert.equal(job.sourceEpisodeNamed, true);
  assert.equal(job.sourcePermissionStatus, "Asked for a sample");
  assert.equal(job.publicationStatus, "not-published");
  assert.equal(visibleToEditor.dubbing.find((entry) => entry.itemId === "dated-dub").sourcePostedCheck, "unchecked");
  assert.equal(visibleToEditor.dubbing.find((entry) => entry.itemId === "dated-dub").publicationStatus, "published");
  const editorPermission = visibleToEditor.permissions.find((entry) => entry.guestId === guestId);
  assert.equal(editorPermission.sourceNote, "Sample sent; response pending");
  assert.equal(Object.hasOwn(editorPermission, "sourceContact"), false);
  assert.deepEqual(job.sourceNotes, [{ row: 8, text: "Sample sent; response pending" }]);
  const visibleToManager = await (await handleProductionCalendarRequest(request(), env, admin)).json();
  const managerPermission = visibleToManager.permissions.find((entry) => entry.guestId === guestId);
  assert.equal(managerPermission.sourceNote, "Sample sent; response pending");
  assert.equal(managerPermission.sourceContact, "private@example.com");
  assert.deepEqual(visibleToManager.dubbing.find((entry) => entry.itemId === "undated-dub").sourceNotes, [{ row: 8, text: "Sample sent; response pending" }]);
});

test("a source note and permission label survive even when the guest cell is blank", async () => {
  database.prepare("INSERT INTO production_items (id, title, source_status, source_ref) VALUES ('guest-missing', 'Ruchir Sharma', 'unverified', 'Dubbing Tracker!A63:H63')").run();
  database.prepare("INSERT INTO production_dubbing (item_id, source_ref) VALUES ('guest-missing', 'Dubbing Tracker!B63:H63')").run();
  const insert = database.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_value) VALUES ('test-import', 'Dubbing Tracker', ?, 63, ?)");
  insert.run("F63", "Yet to reach out");
  insert.run("H63", "Follow-up waiting for response");
  const view = await (await handleProductionCalendarRequest(request(), env, admin)).json();
  const job = view.dubbing.find((entry) => entry.itemId === "guest-missing");
  assert.equal(job.sourcePermissionStatus, "Yet to reach out");
  assert.deepEqual(job.sourceNotes, [{ row: 63, text: "Follow-up waiting for response" }]);
  assert.equal(view.itemGuests.some((entry) => entry.itemId === "guest-missing"), false);
});

test("contact-shaped guest fields are flagged without disclosing the raw value to editors", async () => {
  database.prepare("INSERT INTO production_guests (id, name) VALUES ('contact-guest', 'person@example.com')").run();
  const editorView = await (await handleProductionCalendarRequest(request(), env, editor)).json();
  assert.deepEqual(editorView.guests.find((guest) => guest.id === "contact-guest"), {
    id: "contact-guest", name: "Guest name needs source review", sourceNameNeedsReview: true,
  });
  const managerView = await (await handleProductionCalendarRequest(request(), env, admin)).json();
  assert.equal(managerView.guests.find((guest) => guest.id === "contact-guest").name, "person@example.com");
});
