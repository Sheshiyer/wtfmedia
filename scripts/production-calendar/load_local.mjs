#!/usr/bin/env node
/** Load a private workbook snapshot into an explicitly named local SQLite DB. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const IP_IDS = new Map([
  ["WTF Is", "wtf-is"],
  ["WTF Finance", "wtf-finance"],
  ["WTF Online", "wtf-online"],
  ["WTF People", "wtf-people"],
  ["Stitched", "stitched"],
  ["POV", "pov"],
  ["Animated IP", "animated-ip"],
  ["BTS", "bts"],
  ["Ways Of The World", "ways-of-the-world"],
]);

function argsOf(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if ((key === "--input" || key === "--db") && argv[index + 1]) values[key.slice(2)] = argv[++index];
    else throw new Error(`Unknown or incomplete option: ${key}`);
  }
  if (!values.input || !values.db) throw new Error("Usage: node load_local.mjs --input PRIVATE_SNAPSHOT.json --db LOCAL.sqlite");
  if (resolve(values.input) === resolve(values.db)) throw new Error("Input and database paths must differ");
  return values;
}

function sourcePart(source) {
  const index = source.indexOf("!");
  return index < 0 ? { sheet: source, cell: null } : { sheet: source.slice(0, index), cell: source.slice(index + 1) };
}

function rawValue(cell) {
  if (cell.value == null) return null;
  if (typeof cell.value === "object" && cell.value.value != null) return String(cell.value.value);
  return String(cell.value);
}

function agreementStatus(raw) {
  if (raw === true) return "source_checked";
  if (raw === false) return "source_unchecked";
  return "unknown";
}

function requiredSchema(db) {
  const required = [
    "production_ips", "production_items", "production_events", "production_guests",
    "production_item_guests", "production_permissions", "production_dubbing",
    "production_imports", "production_source_cells", "production_import_reviews", "production_source_checks",
  ];
  const existing = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
  const missing = required.filter((name) => !existing.has(name));
  if (missing.length) throw new Error(`Apply local production calendar migrations 0016 and 0017 first; missing ${missing.join(", ")}`);
  const ipColumns = new Set(db.prepare("PRAGMA table_info(production_ips)").all().map((row) => row.name));
  if (!ipColumns.has("target_count") || !ipColumns.has("target_plus")) throw new Error("Apply local migration 0018_production_ip_targets.sql first");
  const itemColumns = new Set(db.prepare("PRAGMA table_info(production_items)").all().map((row) => row.name));
  const checkColumns = new Set(db.prepare("PRAGMA table_info(production_source_checks)").all().map((row) => row.name));
  if (!itemColumns.has("shoot_location") || !checkColumns.has("guest_role")) throw new Error("Apply local migration 0019_production_tracker_details.sql first");
}

function validateSnapshot(snapshot) {
  if (snapshot?.schema_version !== 1 || !/^[0-9a-f]{64}$/u.test(snapshot.source?.sha256 ?? "")) {
    throw new Error("Unsupported or invalid workbook snapshot");
  }
  if (!Array.isArray(snapshot.source_snapshot?.sheets) || !Array.isArray(snapshot.source_snapshot?.cells)) {
    throw new Error("Snapshot is missing source cells");
  }
  for (const key of ["items", "events", "guests", "permissions", "dubbing", "review", "checks"]) {
    if (!Array.isArray(snapshot.candidates?.[key])) throw new Error(`Snapshot is missing candidates.${key}`);
  }
}

export function loadSnapshot(db, snapshot) {
  validateSnapshot(snapshot);
  requiredSchema(db);
  const importId = `pc_import_${snapshot.source.sha256.slice(0, 20)}`;
  const prior = db.prepare("SELECT id FROM production_imports WHERE sha256 = ?").get(snapshot.source.sha256);
  if (prior) return { status: "already_imported", import_id: prior.id, counts: snapshot.counts };

  const ipRows = new Set(db.prepare("SELECT id FROM production_ips").all().map((row) => row.id));
  for (const name of snapshot.ip_names ?? []) {
    const id = IP_IDS.get(name);
    if (id && !ipRows.has(id)) throw new Error(`Missing approved IP seed: ${name}`);
  }

  const insertImport = db.prepare("INSERT INTO production_imports (id, filename, sha256, sheet_count, cell_count) VALUES (?, ?, ?, ?, ?)");
  const insertCell = db.prepare("INSERT INTO production_source_cells (import_id, sheet, cell_ref, row_number, raw_type, raw_value, raw_ooxml, cached_value, formula, fill, style_id, number_format) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertItem = db.prepare("INSERT OR IGNORE INTO production_items (id, ip_id, title, format, stage, owner, shoot_location, source_status, source_ref) VALUES (?, ?, ?, ?, ?, ?, ?, 'unverified', ?)");
  const insertEvent = db.prepare("INSERT OR IGNORE INTO production_events (id, item_id, kind, day, date_state, source_ref) VALUES (?, ?, ?, ?, ?, ?)");
  const insertGuest = db.prepare("INSERT OR IGNORE INTO production_guests (id, name) VALUES (?, ?)");
  const insertItemGuest = db.prepare("INSERT OR IGNORE INTO production_item_guests (item_id, guest_id, agreement_status) VALUES (?, ?, ?)");
  const insertPermission = db.prepare("INSERT OR IGNORE INTO production_permissions (item_id, guest_id, status, source_ref) VALUES (?, ?, ?, ?)");
  const insertDubbing = db.prepare("INSERT OR IGNORE INTO production_dubbing (item_id, target_language, status, source_ref) VALUES (?, ?, ?, ?)");
  const insertReview = db.prepare("INSERT INTO production_import_reviews (id, import_id, sheet, cell_ref, reason) VALUES (?, ?, ?, ?, ?)");
  const insertCheck = db.prepare("INSERT OR IGNORE INTO production_source_checks (item_id, source_row, guest_name, guest_role, guest_agreement, dubbing, hindi_live, agreement_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

  const review = [...snapshot.candidates.review];
  db.exec("BEGIN IMMEDIATE");
  try {
    insertImport.run(importId, snapshot.source.filename, snapshot.source.sha256, snapshot.source_snapshot.sheets.length, snapshot.source_snapshot.cells.length);
    for (const cell of snapshot.source_snapshot.cells) {
      const rowNumber = Number(/\d+/u.exec(cell.cell)?.[0] ?? 0);
      insertCell.run(
        importId,
        cell.sheet,
        cell.cell,
        rowNumber,
        cell.raw_ooxml?.type ?? cell.data_type ?? null,
        rawValue(cell),
        cell.raw_ooxml == null ? null : JSON.stringify(cell.raw_ooxml),
        cell.cached_value == null ? null : (typeof cell.cached_value === "object" && cell.cached_value.value != null ? String(cell.cached_value.value) : String(cell.cached_value)),
        cell.data_type === "f" ? cell.value : null,
        cell.fill == null ? null : JSON.stringify(cell.fill),
        cell.style_id == null ? null : String(cell.style_id),
        cell.number_format ?? null,
      );
    }
    for (const item of snapshot.candidates.items) {
      const ip = item.ip == null ? null : IP_IDS.get(item.ip);
      if (item.ip && !ip) {
        review.push({ code: "unmapped_ip", source: item.source, detail: "The candidate IP has no approved local ID." });
        continue;
      }
      const title = String(item.title ?? item.display_title ?? "").trim();
      if (!title) {
        review.push({ code: "missing_item_label", source: item.source, detail: "Candidate item has no displayable source label." });
        continue;
      }
      insertItem.run(item.id, ip, title, item.format ?? "episode", item.stage ?? "unverified", item.owner_raw ?? null, item.shoot_location_raw ?? null, item.source);
    }
    const actualItems = new Set(db.prepare("SELECT id FROM production_items").all().map((row) => row.id));
    for (const event of snapshot.candidates.events) {
      if (!actualItems.has(event.item_id)) continue;
      insertEvent.run(event.id, event.item_id, event.kind, event.date, event.date_state === "actual" || event.date_state === "planned" ? event.date_state : "unverified", event.source);
    }
    for (const guest of snapshot.candidates.guests) {
      if (!actualItems.has(guest.item_id)) continue;
      insertGuest.run(guest.id, guest.name_raw);
      insertItemGuest.run(guest.item_id, guest.id, agreementStatus(guest.agreement_raw));
    }
    for (const permission of snapshot.candidates.permissions) {
      if (!actualItems.has(permission.item_id)) continue;
      const status = String(permission.status ?? "unknown").replaceAll("_", "-");
      insertPermission.run(permission.item_id, permission.guest_id, status === "unrecognized" ? "unknown" : status, permission.source);
    }
    for (const job of snapshot.candidates.dubbing) {
      if (!actualItems.has(job.item_id)) continue;
      insertDubbing.run(job.item_id, job.target_language ?? "Hindi", job.status ?? "unknown", job.source);
    }
    for (const check of snapshot.candidates.checks) {
      if (!actualItems.has(check.item_id)) continue;
      insertCheck.run(check.item_id, check.source_row, check.guest_name ?? null, check.guest_role ?? null, check.guest_agreement, check.dubbing, check.hindi_live, check.agreement_note ?? null);
    }
    for (let index = 0; index < review.length; index += 1) {
      const issue = review[index];
      const { sheet, cell } = sourcePart(issue.source);
      const digest = createHash("sha256").update(`${importId}\0${index}\0${issue.code}\0${issue.source}`).digest("hex").slice(0, 20);
      insertReview.run(`pc_review_${digest}`, importId, sheet, cell, `${issue.code}: ${issue.detail}`);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return {
    status: "imported",
    import_id: importId,
    counts: {
      source_cells: snapshot.source_snapshot.cells.length,
      items: db.prepare("SELECT COUNT(*) AS n FROM production_items WHERE source_status = 'unverified'").get().n,
      events: db.prepare("SELECT COUNT(*) AS n FROM production_events WHERE date_state = 'unverified'").get().n,
      reviews: review.length,
    },
  };
}

function main() {
  const args = argsOf(process.argv.slice(2));
  const snapshot = JSON.parse(readFileSync(args.input, "utf8"));
  const db = new DatabaseSync(args.db);
  try {
    db.exec("PRAGMA foreign_keys = ON");
    const result = loadSnapshot(db, snapshot);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    db.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "local_import_failed"}\n`);
    process.exitCode = 1;
  }
}
