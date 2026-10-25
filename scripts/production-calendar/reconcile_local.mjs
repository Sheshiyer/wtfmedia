#!/usr/bin/env node
/** Apply confirmed workbook interpretations to an existing local import.
 * Never touches a remote database and never overwrites user-edited records.
 */
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";

const [snapshotPath, databasePath] = process.argv.slice(2);
if (!snapshotPath || !databasePath) throw new Error("Usage: node reconcile_local.mjs PRIVATE_SNAPSHOT.json LOCAL.sqlite");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const db = new DatabaseSync(databasePath);
try {
  db.exec("PRAGMA foreign_keys = ON");
  const receipt = db.prepare("SELECT id FROM production_imports WHERE sha256 = ?").get(snapshot.source.sha256);
  if (!receipt) throw new Error("Snapshot must already be imported into this local database");
  const changed = new Set(db.prepare("SELECT entity_id FROM production_change_log WHERE entity_type IN ('item', 'event', 'dubbing')").all().map((row) => row.entity_id));
  const ipIds = new Map([["WTF Is", "wtf-is"], ["WTF Finance", "wtf-finance"], ["WTF People", "wtf-people"]]);
  const expectedItems = new Set(snapshot.candidates.items.map((item) => item.id));
  const counts = { items: 0, events: 0, dubbing: 0, checks: 0, reviews: 0, staleReviewsResolved: 0, removedGeneratedSlots: 0 };
  db.exec("BEGIN IMMEDIATE");
  try {
    const itemSelect = db.prepare("SELECT source_ref AS sourceRef, source_status AS sourceStatus, ip_id AS ipId, stage, shoot_location AS shootLocation FROM production_items WHERE id = ?");
    const itemUpdate = db.prepare("UPDATE production_items SET ip_id = COALESCE(?, ip_id), stage = COALESCE(?, stage), shoot_location = COALESCE(shoot_location, ?) WHERE id = ?");
    for (const item of snapshot.candidates.items) {
      const existing = itemSelect.get(item.id);
      if (!existing || existing.sourceRef !== item.source || existing.sourceStatus !== "unverified" || changed.has(item.id)) continue;
      const targetIp = ipIds.get(item.ip) ?? null;
      const targetStage = item.stage ?? null;
      const targetLocation = item.shoot_location_raw ?? null;
      if ((targetIp && targetIp !== existing.ipId) || (targetStage && targetStage !== existing.stage) || (targetLocation && !existing.shootLocation)) {
        counts.items += itemUpdate.run(targetIp, targetStage, targetLocation, item.id).changes;
      }
    }
    const eventSelect = db.prepare("SELECT source_ref AS sourceRef, date_state AS dateState FROM production_events WHERE id = ?");
    const eventUpdate = db.prepare("UPDATE production_events SET date_state = ? WHERE id = ?");
    for (const event of snapshot.candidates.events) {
      const existing = eventSelect.get(event.id);
      if (existing?.sourceRef !== event.source || changed.has(event.id)) continue;
      if ((existing.dateState === "unverified" && ["actual", "planned"].includes(event.date_state))
        || (event.kind === "original_video_date" && existing.dateState === "planned" && event.date_state === "unverified")) {
        eventUpdate.run(event.date_state, event.id); counts.events += 1;
      }
    }
    const dubSelect = db.prepare("SELECT source_ref AS sourceRef, status FROM production_dubbing WHERE item_id = ?");
    const dubUpdate = db.prepare("UPDATE production_dubbing SET status = ? WHERE item_id = ?");
    for (const job of snapshot.candidates.dubbing) {
      const existing = dubSelect.get(job.item_id);
      if (existing?.sourceRef === job.source && existing.status === "unknown" && !changed.has(job.item_id) && job.status === "pushed-out") {
        dubUpdate.run(job.status, job.item_id); counts.dubbing += 1;
      }
    }
    const checkInsert = db.prepare("INSERT OR IGNORE INTO production_source_checks (item_id, source_row, guest_name, guest_role, guest_agreement, dubbing, hindi_live, agreement_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const checkRoleUpdate = db.prepare("UPDATE production_source_checks SET guest_role = ? WHERE item_id = ? AND source_row = ? AND guest_role IS NULL");
    const checkNoteUpdate = db.prepare("UPDATE production_source_checks SET agreement_note = ? WHERE item_id = ? AND source_row = ? AND agreement_note IS NOT ?");
    for (const check of snapshot.candidates.checks) {
      if (changed.has(check.item_id)) continue;
      counts.checks += checkInsert.run(check.item_id, check.source_row, check.guest_name ?? null, check.guest_role ?? null, check.guest_agreement, check.dubbing, check.hindi_live, check.agreement_note ?? null).changes;
      if (check.guest_role) counts.checks += checkRoleUpdate.run(check.guest_role, check.item_id, check.source_row).changes;
      if (check.agreement_note !== null) counts.checks += checkNoteUpdate.run(check.agreement_note, check.item_id, check.source_row, check.agreement_note).changes;
    }
    const reviewExists = db.prepare("SELECT 1 FROM production_import_reviews WHERE import_id = ? AND sheet = ? AND cell_ref = ? AND reason = ?");
    const reviewInsert = db.prepare("INSERT OR IGNORE INTO production_import_reviews (id, import_id, sheet, cell_ref, reason) VALUES (?, ?, ?, ?, ?)");
    const currentReviews = new Set();
    for (const issue of snapshot.candidates.review) {
      const separator = issue.source.indexOf("!");
      if (separator < 0) continue;
      const sheet = issue.source.slice(0, separator);
      const cell = issue.source.slice(separator + 1);
      const reason = `${issue.code}: ${issue.detail}`;
      currentReviews.add(`${sheet}\0${cell}\0${reason}`);
      if (reviewExists.get(receipt.id, sheet, cell, reason)) continue;
      const digest = createHash("sha256").update(`${receipt.id}\0${issue.code}\0${issue.source}`).digest("hex").slice(0, 20);
      counts.reviews += reviewInsert.run(`pc_review_${digest}`, receipt.id, sheet, cell, reason).changes;
    }
    const openReviews = db.prepare("SELECT id, sheet, cell_ref AS cellRef, reason FROM production_import_reviews WHERE import_id = ? AND status = 'open' AND mapped_item_id IS NULL").all(receipt.id);
    const resolveStaleReview = db.prepare("UPDATE production_import_reviews SET status = 'resolved' WHERE id = ? AND status = 'open'");
    for (const issue of openReviews) {
      if (!currentReviews.has(`${issue.sheet}\0${issue.cellRef ?? ""}\0${issue.reason}`)) {
        counts.staleReviewsResolved += resolveStaleReview.run(issue.id).changes;
      }
    }
    const staleSlots = db.prepare("SELECT id, title, source_ref AS sourceRef FROM production_items WHERE source_ref LIKE 'WTF & Nikhil Kamath IPs!A%'").all();
    const hasDependents = db.prepare("SELECT (SELECT COUNT(*) FROM production_events WHERE item_id = ?) + (SELECT COUNT(*) FROM production_item_guests WHERE item_id = ?) + (SELECT COUNT(*) FROM production_blockers WHERE item_id = ?) AS n");
    const removeDub = db.prepare("DELETE FROM production_dubbing WHERE item_id = ? AND status = 'unknown'");
    const removeItem = db.prepare("DELETE FROM production_items WHERE id = ? AND source_status = 'unverified'");
    for (const item of staleSlots) {
      if (expectedItems.has(item.id) || changed.has(item.id) || !/^WTF & Nikhil Kamath IPs!A(1[0-4]):F\1$/u.test(item.sourceRef) || !/^(POV|Animated IP) #\d+$/u.test(item.title)) continue;
      if (hasDependents.get(item.id, item.id, item.id).n) continue;
      removeDub.run(item.id);
      counts.removedGeneratedSlots += removeItem.run(item.id).changes;
    }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  process.stdout.write(`${JSON.stringify(counts)}\n`);
} finally { db.close(); }
