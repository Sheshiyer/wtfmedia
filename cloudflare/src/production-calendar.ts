import { decide } from "./auth/policy.ts";
import type { OperatorContext } from "./auth/operator-context.ts";
import type { DB } from "./db.ts";

type ProductionEnv = { DB: DB };
type Data = Record<string, unknown>;
type Mutation = { action?: unknown; data?: unknown };

const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const colorPattern = /^#[0-9A-Fa-f]{6}$/u;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/u;
const sourceStatuses = new Set(["verified", "unverified", "manual"]);
const dateStates = new Set(["planned", "actual", "unverified"]);
const blockerStatuses = new Set(["open", "resolved"]);
const stages = new Set(["unverified", "prospect", "planned", "shooting", "post-production", "ready", "published", "blocked", "archived"]);
const dubStatuses = new Set(["unknown", "pending", "blocked", "ready", "in-progress", "dubbed", "pushed-out"]);
const permissionStatuses = new Set(["unknown", "not-contacted", "requested", "sample-requested", "approved", "rejected", "no-response", "withdrawn"]);
const eventKinds = new Set(["shoot", "planned-post", "actual-post", "dub-sample", "dub-delivery", "hindi-trailer", "hindi-post", "handoff", "milestone", "other", "main_post", "ip_post", "original_video_date", "dub_schedule"]);
const checkFields = new Set(["guest_agreement", "dubbing", "hindi_live"]);
const checkStates = new Set(["checked", "unchecked"]);
// The two prospect Pipeline sheets are reserved for a separate page. The IP
// sheet remains in this area because its named episodes and targets are in
// scope alongside the production, calendar and dubbing sheets.
const productionSourceSheets = new Set(["Production Tracker Podcast", "Calendar", "Dubbing Tracker", "WTF & Nikhil Kamath IPs"]);
const productionSourceSheetSql = "'Production Tracker Podcast', 'Calendar', 'Dubbing Tracker', 'WTF & Nikhil Kamath IPs'";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers });
}

function record(value: unknown): Data | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Data : null;
}

function string(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function optionalString(value: unknown, max = 500): string | null | undefined {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  return string(value, max) ?? undefined;
}

function choice(value: unknown, allowed: Set<string>): string | null {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !dayPattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

async function changeLog(db: DB, context: OperatorContext, action: string, entityType: string, entityId: string, after: Data): Promise<void> {
  await db.prepare("INSERT INTO production_change_log (id, actor_operator_id, action, entity_type, entity_id, after_json) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(`pchg_${crypto.randomUUID()}`, context.operatorId, action, entityType, entityId, JSON.stringify(after)).run();
}

function canEdit(context: OperatorContext): boolean {
  return decide(context.role, "production", "write", { environment: context.environment });
}

function canManage(context: OperatorContext): boolean {
  return decide(context.role, "production", "manage", { environment: context.environment });
}

async function sourceRows(request: Request, env: ProductionEnv, context: OperatorContext): Promise<Response> {
  if (!canManage(context)) return json({ error: "forbidden" }, 403);
  const url = new URL(request.url);
  const sheet = url.searchParams.get("sourceSheet");
  if (!sheet || !productionSourceSheets.has(sheet)) return json({ error: "invalid_sheet" }, 400);
  const offset = Math.max(0, Math.min(100000, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0));
  // The owner excluded unnamed Production Tracker rows 17–19 from the working
  // platform. Keep their imported cells in the private archive for fidelity.
  const visibleRows = sheet === "Production Tracker Podcast" ? " AND row_number NOT BETWEEN 17 AND 19" : "";
  const count = await env.DB.prepare(`SELECT COUNT(DISTINCT row_number) AS total FROM production_source_cells WHERE sheet = ?${visibleRows}`).bind(sheet).first<{ total: number }>();
  const rows = await env.DB.prepare(`SELECT DISTINCT row_number FROM production_source_cells WHERE sheet = ?${visibleRows} ORDER BY row_number LIMIT 25 OFFSET ?`).bind(sheet, offset).all<{ row_number: number }>();
  const sourceRows = await Promise.all(rows.results.map(async ({ row_number }) => {
    const cells = await env.DB.prepare("SELECT cell_ref AS ref, raw_value AS value, cached_value AS cachedValue, formula, fill, number_format AS numberFormat FROM production_source_cells WHERE sheet = ? AND row_number = ? ORDER BY LENGTH(cell_ref), cell_ref").bind(sheet, row_number).all();
    return { sheet, rowNumber: row_number, cells: cells.results };
  }));
  const sourceSheets = await env.DB.prepare(`SELECT sheet AS name, COUNT(DISTINCT row_number) AS rows, COUNT(*) AS cells FROM production_source_cells WHERE sheet IN (${productionSourceSheetSql}) GROUP BY sheet ORDER BY sheet`).all();
  return json({ sourceRows, sourceSheets: sourceSheets.results, total: count?.total ?? 0 });
}

async function snapshot(env: ProductionEnv, context: OperatorContext): Promise<Response> {
  const db = env.DB;
  const [ips, items, events, guests, itemGuests, dubbing, permissions, blockers, sourceSheets, review, sourceMarkers, sourceChecks, dubbingCells] = await Promise.all([
    db.prepare("SELECT id, name, parent, color, active, target_count AS targetCount, target_plus AS targetPlus, sort_order AS sortOrder FROM production_ips ORDER BY sort_order, name").all(),
    db.prepare("SELECT id, episode_id AS episodeId, ip_id AS ipId, title, format, stage, owner, notes, shoot_location AS shootLocation, source_status AS sourceStatus, source_ref AS sourceRef FROM production_items ORDER BY created_at, id").all(),
    db.prepare("SELECT id, item_id AS itemId, kind, day, date_state AS dateState, owner, notes, source_ref AS sourceRef FROM production_events ORDER BY day, id").all(),
    db.prepare("SELECT id, name FROM production_guests ORDER BY name").all(),
    db.prepare("SELECT item_id AS itemId, guest_id AS guestId, agreement_status AS agreementStatus FROM production_item_guests ORDER BY item_id, guest_id").all(),
    db.prepare("SELECT item_id AS itemId, target_language AS targetLanguage, status, owner, notes, source_ref AS sourceRef FROM production_dubbing ORDER BY item_id").all(),
    db.prepare("SELECT item_id AS itemId, guest_id AS guestId, status, notes, source_ref AS sourceRef FROM production_permissions ORDER BY item_id, guest_id").all(),
    db.prepare("SELECT id, item_id AS itemId, reason, owner, status, next_action AS nextAction FROM production_blockers ORDER BY status, created_at").all(),
    db.prepare(`SELECT sheet AS name, COUNT(DISTINCT row_number) AS rows, COUNT(*) AS cells FROM production_source_cells WHERE sheet IN (${productionSourceSheetSql}) GROUP BY sheet ORDER BY sheet`).all(),
    db.prepare(`SELECT COUNT(*) AS review FROM production_import_reviews WHERE status = 'open' AND sheet IN (${productionSourceSheetSql})`).first<{ review: number }>(),
    db.prepare("SELECT cell_ref AS cellRef, raw_value AS rawValue FROM production_source_cells WHERE sheet = 'WTF & Nikhil Kamath IPs' AND raw_value LIKE '%Not Live%'").all<{ cellRef: string; rawValue: string }>(),
    db.prepare("SELECT item_id AS itemId, source_row AS sourceRow, guest_name AS guestName, guest_role AS guestRole, guest_agreement AS guestAgreement, dubbing, hindi_live AS hindiLive, agreement_note AS agreementNote FROM production_source_checks ORDER BY source_row").all(),
    db.prepare("SELECT cell_ref AS cellRef, raw_value AS rawValue FROM production_source_cells WHERE sheet = 'Dubbing Tracker' AND substr(cell_ref, 1, 1) IN ('A', 'E', 'F', 'G', 'H')").all<{ cellRef: string; rawValue: string | null }>(),
  ]);
  const dubbingSourceCells = new Map(dubbingCells.results.map((cell) => [cell.cellRef, cell.rawValue]));
  const dubbingRow = (sourceRef: string | null | undefined): number | null => {
    const match = /^Dubbing Tracker![A-H](\d+)(?::[A-H]\d+)?$/u.exec(sourceRef ?? "");
    return match ? Number(match[1]) : null;
  };
  const noteRowsByItem = new Map<string, Set<number>>();
  for (const entry of [...dubbing.results, ...permissions.results] as { itemId: string; sourceRef: string | null }[]) {
    const sourceRow = dubbingRow(entry.sourceRef);
    if (sourceRow === null) continue;
    const rows = noteRowsByItem.get(entry.itemId) ?? new Set<number>();
    rows.add(sourceRow);
    noteRowsByItem.set(entry.itemId, rows);
  }
  const notLiveCells = new Set(sourceMarkers.results.filter((entry) => entry.rawValue.includes("⭕") && /Not Live/iu.test(entry.rawValue)).map((entry) => entry.cellRef));
  // A dated, actual dubbed-post event is the publication receipt. The workbook's
  // Dubbing Tracker column G ("Posted?") is retained as source data but does not
  // establish that a dubbed episode went live when column C is blank.
  const publishedDubDates = new Map<string, string>();
  for (const event of events.results as { itemId: string; kind: string; day: string; dateState: string }[]) {
    if (event.dateState !== "actual" || (event.kind !== "dub_schedule" && event.kind !== "hindi-post")) continue;
    const prior = publishedDubDates.get(event.itemId);
    if (!prior || event.day < prior) publishedDubDates.set(event.itemId, event.day);
  }
  return json({
    ips: ips.results.map((ip) => ({ ...ip, active: ip.active === 1, targetPlus: ip.targetPlus === 1 })),
    items: items.results.map((item) => {
      const sourceRef = (item as { sourceRef?: string }).sourceRef ?? "";
      const row = /^WTF & Nikhil Kamath IPs!A(\d+):F\1$/u.exec(sourceRef)?.[1];
      return { ...item, sourceMarker: row && notLiveCells.has(`D${row}`) ? "not-live" : null };
    }), events: events.results,
    guests: guests.results.map((entry) => {
      const guest = entry as { name: string };
      const sourceNameNeedsReview = guest.name.includes("@");
      return { ...entry, name: sourceNameNeedsReview && !canManage(context) ? "Guest name needs source review" : guest.name, sourceNameNeedsReview };
    }), itemGuests: itemGuests.results,
    dubbing: dubbing.results.map((entry) => {
      const job = entry as { itemId: string; sourceRef: string | null };
      const publishedOn = publishedDubDates.get(job.itemId) ?? null;
      const sourceRow = dubbingRow(job.sourceRef);
      const postedRaw = sourceRow === null ? null : dubbingSourceCells.get(`G${sourceRow}`);
      return {
        ...entry,
        publicationStatus: publishedOn ? "published" : "not-published",
        publishedOn,
        sourceRow,
        sourceSection: sourceRow === null ? null : sourceRow < 31 ? "solo" : "panel",
        sourceEpisodeNamed: sourceRow === null ? null : Boolean(dubbingSourceCells.get(`A${sourceRow}`)?.trim()),
        sourcePermissionStatus: sourceRow === null ? null : dubbingSourceCells.get(`F${sourceRow}`) ?? null,
        sourcePostedCheck: postedRaw === "true" ? "checked" : postedRaw === "false" ? "unchecked" : "not_box",
        sourceNotes: canEdit(context) ? [...(noteRowsByItem.get(job.itemId) ?? [])].sort((a, b) => a - b)
          .map((row) => ({ row, text: dubbingSourceCells.get(`H${row}`) }))
          .filter((note): note is { row: number; text: string } => Boolean(note.text)) : [],
      };
    }), permissions: permissions.results.map((entry) => {
      const permission = entry as { sourceRef: string | null };
      const sourceRow = dubbingRow(permission.sourceRef);
      return {
        ...entry,
        sourceRow,
        sourceNote: !canEdit(context) || sourceRow === null ? null : dubbingSourceCells.get(`H${sourceRow}`) ?? null,
        ...(canManage(context) ? { sourceContact: sourceRow === null ? null : dubbingSourceCells.get(`E${sourceRow}`) ?? null } : {}),
      };
    }), blockers: blockers.results, sourceChecks: sourceChecks.results,
    sourceSheets: canManage(context) ? sourceSheets.results : [],
    sourceSummary: sourceSheets.results.length ? { sheets: sourceSheets.results.length, cells: sourceSheets.results.reduce((sum, entry) => sum + Number((entry as { cells: number }).cells), 0), review: review?.review ?? 0 } : null,
    canEdit: canEdit(context), canManage: canManage(context),
  });
}

async function mutate(env: ProductionEnv, context: OperatorContext, body: Mutation): Promise<Response> {
  if (!canEdit(context)) return json({ error: "forbidden" }, 403);
  const data = record(body.data);
  if (!data || typeof body.action !== "string") return json({ error: "invalid_mutation" }, 400);
  const db = env.DB;
  const action = body.action;
  let entityType = "";
  let entityId = "";
  try {
    if (action === "create_item") {
      const ipId = string(data.ipId, 80);
      const title = string(data.title, 300);
      const format = string(data.format, 80) ?? "episode";
      const stage = choice(data.stage ?? "planned", stages);
      const owner = optionalString(data.owner, 120);
      const notes = optionalString(data.notes, 4000);
      const shootLocation = optionalString(data.shootLocation, 300);
      const trackDubbing = data.trackDubbing === true;
      if (!ipId || !title || !stage || owner === undefined || notes === undefined || shootLocation === undefined || (data.trackDubbing !== undefined && typeof data.trackDubbing !== "boolean")) return json({ error: "invalid_item" }, 400);
      entityId = `pitem_${crypto.randomUUID()}`; entityType = "item";
      const insertItem = db.prepare("INSERT INTO production_items (id, ip_id, title, format, stage, owner, notes, shoot_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(entityId, ipId, title, format, stage, owner, notes ?? "", shootLocation ?? null);
      if (trackDubbing) {
        await db.batch([insertItem, db.prepare("INSERT INTO production_dubbing (item_id, target_language, status, notes) VALUES (?, 'Hindi', 'pending', '')").bind(entityId)]);
      } else {
        await insertItem.run();
      }
    } else if (action === "update_item") {
      entityId = string(data.id, 90) ?? ""; entityType = "item";
      const ipId = data.ipId === null ? null : string(data.ipId, 80);
      const title = string(data.title, 300);
      const format = string(data.format, 80);
      const stage = choice(data.stage, stages);
      const owner = optionalString(data.owner, 120);
      const notes = optionalString(data.notes, 4000);
      const shootLocation = optionalString(data.shootLocation, 300);
      if (!entityId || (data.ipId !== null && !ipId) || !title || !format || !stage || owner === undefined || notes === undefined || shootLocation === undefined) return json({ error: "invalid_item" }, 400);
      const result = await db.prepare("UPDATE production_items SET ip_id = ?, title = ?, format = ?, stage = ?, owner = ?, notes = ?, shoot_location = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
        .bind(ipId, title, format, stage, owner, notes ?? "", shootLocation, entityId).run();
      if (!result.meta.changes) return json({ error: "not_found" }, 404);
    } else if (action === "create_event" || action === "update_event") {
      const itemId = string(data.itemId, 90);
      const kind = choice(data.kind, eventKinds);
      const day = data.day;
      const dateState = choice(data.dateState ?? "planned", dateStates);
      const owner = optionalString(data.owner, 120);
      const notes = optionalString(data.notes, 4000);
      if (!itemId || !kind || !validDay(day) || !dateState || owner === undefined || notes === undefined) return json({ error: "invalid_event" }, 400);
      entityType = "event";
      if (action === "create_event") {
        entityId = `pevt_${crypto.randomUUID()}`;
        await db.prepare("INSERT INTO production_events (id, item_id, kind, day, date_state, owner, notes) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(entityId, itemId, kind, day, dateState, owner, notes ?? "").run();
      } else {
        entityId = string(data.id, 90) ?? "";
        if (!entityId) return json({ error: "invalid_event" }, 400);
        const result = await db.prepare("UPDATE production_events SET item_id = ?, kind = ?, day = ?, date_state = ?, owner = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
          .bind(itemId, kind, day, dateState, owner, notes ?? "", entityId).run();
        if (!result.meta.changes) return json({ error: "not_found" }, 404);
      }
    } else if (action === "create_ip" || action === "update_ip") {
      if (!canManage(context)) return json({ error: "forbidden" }, 403);
      entityId = action === "create_ip" ? `ip_${crypto.randomUUID()}` : string(data.id, 80) ?? ""; entityType = "ip";
      const name = string(data.name, 120);
      const color = typeof data.color === "string" && colorPattern.test(data.color) ? data.color.toUpperCase() : null;
      const parent = optionalString(data.parent, 120);
      const active = typeof data.active === "boolean" ? Number(data.active) : action === "create_ip" ? 1 : null;
      if (!entityId || !name || !color || parent === undefined || active === null) return json({ error: "invalid_ip" }, 400);
      if (action === "create_ip") {
        await db.prepare("INSERT INTO production_ips (id, name, parent, color, active, sort_order) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM production_ips))")
          .bind(entityId, name, parent, color, active).run();
      } else {
        const result = await db.prepare("UPDATE production_ips SET name = ?, parent = ?, color = ?, active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
          .bind(name, parent, color, active, entityId).run();
        if (!result.meta.changes) return json({ error: "not_found" }, 404);
      }
    } else if (action === "update_source_check") {
      const itemId = string(data.itemId, 90);
      const sourceRow = Number(data.sourceRow);
      const field = choice(data.field, checkFields);
      const state = choice(data.state, checkStates);
      if (!itemId || !Number.isInteger(sourceRow) || sourceRow < 2 || !field || !state) return json({ error: "invalid_source_check" }, 400);
      // Field is allowlisted above; never interpolate user-supplied SQL.
      const result = await db.prepare(`UPDATE production_source_checks SET ${field} = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE item_id = ? AND source_row = ?`)
        .bind(state, itemId, sourceRow).run();
      if (!result.meta.changes) return json({ error: "not_found" }, 404);
      entityId = `${itemId}:${sourceRow}:${field}`; entityType = "source_check";
    } else if (action === "update_source_role") {
      const itemId = string(data.itemId, 90);
      const sourceRow = Number(data.sourceRow);
      const guestRole = optionalString(data.guestRole, 500);
      if (!itemId || !Number.isInteger(sourceRow) || sourceRow < 2 || guestRole === undefined) return json({ error: "invalid_source_role" }, 400);
      const result = await db.prepare("UPDATE production_source_checks SET guest_role = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE item_id = ? AND source_row = ?")
        .bind(guestRole, itemId, sourceRow).run();
      if (!result.meta.changes) return json({ error: "not_found" }, 404);
      entityId = `${itemId}:${sourceRow}`; entityType = "source_role";
    } else if (action === "update_ip_target") {
      if (!canManage(context)) return json({ error: "forbidden" }, 403);
      entityId = string(data.id, 80) ?? ""; entityType = "ip_target";
      const targetCount = data.targetCount === null ? null : Number(data.targetCount);
      const targetPlus = data.targetPlus === true ? 1 : data.targetPlus === false ? 0 : null;
      if (!entityId || (targetCount !== null && (!Number.isInteger(targetCount) || targetCount < 0 || targetCount > 100000)) || targetPlus === null) return json({ error: "invalid_ip_target" }, 400);
      const result = await db.prepare("UPDATE production_ips SET target_count = ?, target_plus = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
        .bind(targetCount, targetPlus, entityId).run();
      if (!result.meta.changes) return json({ error: "not_found" }, 404);
    } else if (action === "update_dubbing") {
      entityId = string(data.itemId, 90) ?? ""; entityType = "dubbing";
      const target = string(data.targetLanguage, 80) ?? "Hindi";
      const status = choice(data.status, dubStatuses);
      const owner = optionalString(data.owner, 120);
      const notes = optionalString(data.notes, 4000);
      if (!entityId || !status || owner === undefined || notes === undefined) return json({ error: "invalid_dubbing" }, 400);
      await db.prepare("INSERT INTO production_dubbing (item_id, target_language, status, owner, notes) VALUES (?, ?, ?, ?, ?) ON CONFLICT(item_id) DO UPDATE SET target_language = excluded.target_language, status = excluded.status, owner = excluded.owner, notes = excluded.notes, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')")
        .bind(entityId, target, status, owner, notes ?? "").run();
    } else if (action === "add_guest_to_item") {
      const itemId = string(data.itemId, 90);
      const name = string(data.name, 180);
      if (!itemId || !name) return json({ error: "invalid_guest" }, 400);
      const item = await db.prepare("SELECT 1 AS found FROM production_items WHERE id = ?").bind(itemId).first();
      if (!item) return json({ error: "item_not_found" }, 404);
      const existing = await db.prepare("SELECT id FROM production_guests WHERE lower(name) = lower(?) ORDER BY id LIMIT 1").bind(name).first<{ id: string }>();
      const guestId = existing?.id ?? `pguest_${crypto.randomUUID()}`;
      if (!existing) await db.prepare("INSERT INTO production_guests (id, name) VALUES (?, ?)").bind(guestId, name).run();
      await db.prepare("INSERT OR IGNORE INTO production_item_guests (item_id, guest_id) VALUES (?, ?)").bind(itemId, guestId).run();
      entityId = `${itemId}:${guestId}`; entityType = "item_guest";
    } else if (action === "update_permission") {
      const itemId = string(data.itemId, 90);
      const guestId = string(data.guestId, 90);
      const status = choice(data.status, permissionStatuses);
      const notes = optionalString(data.notes, 4000);
      if (!itemId || !guestId || !status || notes === undefined) return json({ error: "invalid_permission" }, 400);
      const membership = await db.prepare("SELECT 1 AS found FROM production_item_guests WHERE item_id = ? AND guest_id = ?").bind(itemId, guestId).first();
      if (!membership) return json({ error: "guest_not_on_item" }, 400);
      entityId = `${itemId}:${guestId}`; entityType = "permission";
      await db.prepare("INSERT INTO production_permissions (item_id, guest_id, status, notes) VALUES (?, ?, ?, ?) ON CONFLICT(item_id, guest_id) DO UPDATE SET status = excluded.status, notes = excluded.notes, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')")
        .bind(itemId, guestId, status, notes ?? "").run();
    } else if (action === "create_blocker" || action === "update_blocker") {
      const itemId = string(data.itemId, 90);
      const reason = string(data.reason, 1000);
      const owner = optionalString(data.owner, 120);
      const nextAction = optionalString(data.nextAction, 1000);
      const status = choice(data.status ?? "open", blockerStatuses);
      if (!itemId || !reason || owner === undefined || nextAction === undefined || !status) return json({ error: "invalid_blocker" }, 400);
      entityType = "blocker";
      if (action === "create_blocker") {
        entityId = `pblk_${crypto.randomUUID()}`;
        await db.prepare("INSERT INTO production_blockers (id, item_id, reason, owner, status, next_action) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(entityId, itemId, reason, owner, status, nextAction ?? "").run();
      } else {
        entityId = string(data.id, 90) ?? "";
        if (!entityId) return json({ error: "invalid_blocker" }, 400);
        const result = await db.prepare("UPDATE production_blockers SET item_id = ?, reason = ?, owner = ?, status = ?, next_action = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
          .bind(itemId, reason, owner, status, nextAction ?? "", entityId).run();
        if (!result.meta.changes) return json({ error: "not_found" }, 404);
      }
    } else {
      return json({ error: "unknown_action" }, 400);
    }
    await changeLog(db, context, action, entityType, entityId, data);
    return json({ ok: true, id: entityId }, action.startsWith("create_") ? 201 : 200);
  } catch (error) {
    // Expose neither source data nor SQL details to the browser.
    console.error("production mutation failed", { action });
    return json({ error: "production_write_failed" }, 500);
  }
}

export async function handleProductionCalendarRequest(request: Request, env: ProductionEnv, context: OperatorContext): Promise<Response> {
  if (!decide(context.role, "production", "read", { environment: context.environment })) return json({ error: "forbidden" }, 403);
  try {
    if (request.method === "GET") {
      if (new URL(request.url).searchParams.has("sourceSheet")) return await sourceRows(request, env, context);
      return await snapshot(env, context);
    }
    if (request.method === "POST") {
      if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return json({ error: "content_type_required" }, 415);
      if (Number(request.headers.get("content-length") ?? 0) > 16_000) return json({ error: "body_too_large" }, 413);
      const body = await request.json().catch(() => null);
      return await mutate(env, context, record(body) ?? {});
    }
    return json({ error: "method_not_allowed" }, 405);
  } catch (error) {
    console.error("production calendar unavailable");
    return json({ error: "production_unavailable" }, 503);
  }
}
