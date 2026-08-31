import type { DB } from "./db.ts";

export const calendarEventTypes = ["recording", "edit", "publish", "review", "other"] as const;
export const calendarWorkflowColumns = ["unscheduled", "on-calendar", "blocked"] as const;
export const calendarTones = ["attention", "editorial", "knowledge", "live"] as const;
export const calendarConflictStates = ["clear", "potential", "confirmed"] as const;

type CalendarEventType = (typeof calendarEventTypes)[number];
type CalendarWorkflowColumn = (typeof calendarWorkflowColumns)[number];
type CalendarTone = (typeof calendarTones)[number];
type CalendarConflictState = (typeof calendarConflictStates)[number];

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  timezone: "Asia/Kolkata";
  eventType: CalendarEventType;
  ipLabel: string | null;
  showLabel: string | null;
  owner: string | null;
  column: CalendarWorkflowColumn;
  tone: CalendarTone;
  conflictState: CalendarConflictState;
  notes: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

type CalendarRow = {
  event_id: string;
  title: string;
  starts_at: string;
  timezone: "Asia/Kolkata";
  event_type: CalendarEventType;
  ip_label: string | null;
  show_label: string | null;
  owner_label: string | null;
  workflow_column: CalendarWorkflowColumn;
  tone: CalendarTone;
  conflict_state: CalendarConflictState;
  notes: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type CalendarEnv = {
  DB: DB;
  WTFMEDIA_STATE: KVNamespace;
  CALENDAR_READ_RATE_LIMIT_PER_MINUTE?: string;
  CALENDAR_WRITE_RATE_LIMIT_PER_MINUTE?: string;
};

const MAX_BODY_BYTES = 16_000;
const EARLIEST_INSTANT = Date.parse("2020-01-01T00:00:00.000Z");
const LATEST_INSTANT = Date.parse("2041-01-01T00:00:00.000Z");
const MAX_LIST_WINDOW_MS = 370 * 24 * 60 * 60 * 1_000;
const EVENT_ID = /^cal_[a-f0-9]{32}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{16,128}$/;
const CORRELATION_ID = /^[A-Za-z0-9._:-]{8,128}$/;

const selectedColumns = `
  event_id, title, starts_at, timezone, event_type, ip_label, show_label,
  owner_label, workflow_column, tone, conflict_state, notes, revision,
  created_at, updated_at
`;

function calendarReply(body: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function toEvent(row: CalendarRow): CalendarEvent {
  return {
    id: row.event_id,
    title: row.title,
    startsAt: row.starts_at,
    timezone: row.timezone,
    eventType: row.event_type,
    ipLabel: row.ip_label,
    showLabel: row.show_label,
    owner: row.owner_label,
    column: row.workflow_column,
    tone: row.tone,
    conflictState: row.conflict_state,
    notes: row.notes,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? value as T
    : null;
}

function boundedText(value: unknown, maximum: number, nullable = false): string | null | undefined {
  if (nullable && value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return undefined;
  return normalized;
}

function canonicalInstant(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp < EARLIEST_INSTANT || timestamp >= LATEST_INSTANT) return null;
  return new Date(timestamp).toISOString() === value ? value : null;
}

type MutableEvent = Omit<CalendarEvent, "id" | "revision" | "createdAt" | "updatedAt">;

function validateEvent(value: Record<string, unknown>): MutableEvent | null {
  const title = boundedText(value.title, 160);
  const startsAt = canonicalInstant(value.startsAt);
  const eventType = enumValue(value.eventType, calendarEventTypes);
  const column = enumValue(value.column, calendarWorkflowColumns);
  const tone = enumValue(value.tone, calendarTones);
  const conflictState = enumValue(value.conflictState, calendarConflictStates);
  const ipLabel = boundedText(value.ipLabel, 120, true);
  const showLabel = boundedText(value.showLabel, 120, true);
  const owner = boundedText(value.owner, 120, true);
  const notes = boundedText(value.notes, 1_000, true);

  if (
    title === undefined || !startsAt || value.timezone !== "Asia/Kolkata" ||
    !eventType || !column || !tone || !conflictState || ipLabel === undefined ||
    showLabel === undefined || owner === undefined || notes === undefined
  ) return null;

  return {
    title,
    startsAt,
    timezone: "Asia/Kolkata",
    eventType,
    ipLabel,
    showLabel,
    owner,
    column,
    tone,
    conflictState,
    notes,
  };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get("Content-Type")?.split(";", 1)[0] !== "application/json") return null;
  const declared = Number(request.headers.get("Content-Length") || "0");
  if (declared > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestCorrelationId(request: Request) {
  const supplied = request.headers.get("X-Request-ID")?.trim();
  return supplied && CORRELATION_ID.test(supplied) ? supplied : crypto.randomUUID();
}

function safeLimit(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 1_000 ? value : fallback;
}

export async function allowCalendarRequest(request: Request, env: CalendarEnv): Promise<boolean> {
  const write = request.method !== "GET";
  const limit = safeLimit(
    write ? env.CALENDAR_WRITE_RATE_LIMIT_PER_MINUTE : env.CALENDAR_READ_RATE_LIMIT_PER_MINUTE,
    write ? 12 : 60,
  );
  const source = request.headers.get("X-Client-IP")?.trim() || "unknown";
  const sourceDigest = (await sha256(source)).slice(0, 32);
  const minute = Math.floor(Date.now() / 60_000);
  const key = `calendar-rate:${write ? "write" : "read"}:${minute}:${sourceDigest}`;
  const seen = Number((await env.WTFMEDIA_STATE.get(key)) || "0");
  if (!Number.isFinite(seen) || seen >= limit) return false;
  await env.WTFMEDIA_STATE.put(key, String(seen + 1), { expirationTtl: 120 });
  return true;
}

async function listCalendar(request: Request, env: CalendarEnv) {
  const url = new URL(request.url);
  const from = canonicalInstant(url.searchParams.get("from"));
  const to = canonicalInstant(url.searchParams.get("to"));
  if (!from || !to || from >= to || Date.parse(to) - Date.parse(from) > MAX_LIST_WINDOW_MS) {
    return calendarReply({ error: "invalid_range" }, 400);
  }
  if ([...url.searchParams.keys()].some((key) => key !== "from" && key !== "to")) {
    return calendarReply({ error: "invalid_query" }, 400);
  }
  const result = await env.DB.prepare(`
    SELECT ${selectedColumns}
    FROM calendar_events
    WHERE starts_at >= ? AND starts_at < ?
    ORDER BY starts_at ASC, event_id ASC
    LIMIT 500
  `).bind(from, to).all<CalendarRow>();
  return calendarReply({ events: result.results.map(toEvent) });
}

const createKeys = [
  "title", "startsAt", "timezone", "eventType", "ipLabel", "showLabel",
  "owner", "column", "tone", "conflictState", "notes",
] as const;

async function createCalendar(request: Request, env: CalendarEnv) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return calendarReply({ error: "idempotency_key_required" }, 400);
  }
  const payload = await readJson(request);
  if (!payload || !hasOnlyKeys(payload, createKeys)) return calendarReply({ error: "invalid_event" }, 400);
  const event = validateEvent(payload);
  if (!event) return calendarReply({ error: "invalid_event" }, 400);

  const keyHash = await sha256(idempotencyKey);
  const existing = await env.DB.prepare(`SELECT ${selectedColumns} FROM calendar_events WHERE idempotency_key_hash = ?`)
    .bind(keyHash).first<CalendarRow>();
  if (existing) return calendarReply({ event: toEvent(existing), idempotent: true });

  const id = `cal_${crypto.randomUUID().replaceAll("-", "")}`;
  const now = new Date().toISOString();
  const correlationId = requestCorrelationId(request);
  try {
    const row = await env.DB.prepare(`
      INSERT INTO calendar_events (
        event_id, title, starts_at, timezone, event_type, ip_label, show_label,
        owner_label, workflow_column, tone, conflict_state, notes,
        idempotency_key_hash, revision, last_correlation_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      RETURNING ${selectedColumns}
    `).bind(
      id, event.title, event.startsAt, event.timezone, event.eventType, event.ipLabel,
      event.showLabel, event.owner, event.column, event.tone, event.conflictState,
      event.notes, keyHash, correlationId, now, now,
    ).first<CalendarRow>();
    if (!row) throw new Error("calendar_create_failed");
    return calendarReply(
      { event: toEvent(row), idempotent: false },
      201,
      { Location: `/api/calendar/${row.event_id}`, "X-Request-ID": correlationId },
    );
  } catch (error) {
    const raced = await env.DB.prepare(`SELECT ${selectedColumns} FROM calendar_events WHERE idempotency_key_hash = ?`)
      .bind(keyHash).first<CalendarRow>();
    if (raced) return calendarReply({ event: toEvent(raced), idempotent: true });
    throw error;
  }
}

async function updateCalendar(request: Request, env: CalendarEnv, id: string) {
  if (!EVENT_ID.test(id)) return calendarReply({ error: "not_found" }, 404);
  const payload = await readJson(request);
  if (!payload || !hasOnlyKeys(payload, [...createKeys, "revision"])) {
    return calendarReply({ error: "invalid_event" }, 400);
  }
  if (!Number.isInteger(payload.revision) || Number(payload.revision) < 1) {
    return calendarReply({ error: "revision_required" }, 400);
  }
  if (!createKeys.some((key) => Object.hasOwn(payload, key))) {
    return calendarReply({ error: "invalid_event" }, 400);
  }
  const current = await env.DB.prepare(`SELECT ${selectedColumns} FROM calendar_events WHERE event_id = ?`)
    .bind(id).first<CalendarRow>();
  if (!current) return calendarReply({ error: "not_found" }, 404);
  if (current.revision !== payload.revision) {
    return calendarReply({ error: "revision_conflict", currentRevision: current.revision }, 409);
  }

  const merged = validateEvent({ ...toEvent(current), ...payload });
  if (!merged) return calendarReply({ error: "invalid_event" }, 400);
  const now = new Date().toISOString();
  const correlationId = requestCorrelationId(request);
  const row = await env.DB.prepare(`
    UPDATE calendar_events
    SET title = ?, starts_at = ?, timezone = ?, event_type = ?, ip_label = ?,
        show_label = ?, owner_label = ?, workflow_column = ?, tone = ?,
        conflict_state = ?, notes = ?, revision = revision + 1,
        last_correlation_id = ?, updated_at = ?
    WHERE event_id = ? AND revision = ?
    RETURNING ${selectedColumns}
  `).bind(
    merged.title, merged.startsAt, merged.timezone, merged.eventType, merged.ipLabel,
    merged.showLabel, merged.owner, merged.column, merged.tone, merged.conflictState,
    merged.notes, correlationId, now, id, payload.revision,
  ).first<CalendarRow>();
  if (!row) {
    const latest = await env.DB.prepare("SELECT revision FROM calendar_events WHERE event_id = ?")
      .bind(id).first<{ revision: number }>();
    return latest
      ? calendarReply({ error: "revision_conflict", currentRevision: latest.revision }, 409)
      : calendarReply({ error: "not_found" }, 404);
  }
  return calendarReply({ event: toEvent(row) }, 200, { "X-Request-ID": correlationId });
}

export async function handleCalendarRequest(request: Request, env: CalendarEnv): Promise<Response> {
  const url = new URL(request.url);
  const idMatch = /^\/v1\/calendar\/(cal_[a-f0-9]{32})$/.exec(url.pathname);

  try {
    if (request.method === "GET" && url.pathname === "/v1/calendar") return listCalendar(request, env);
    if (request.method === "POST" && url.pathname === "/v1/calendar") return createCalendar(request, env);
    if (request.method === "PATCH" && idMatch) return updateCalendar(request, env, idMatch[1]);
    if (request.method === "DELETE" && (idMatch || url.pathname === "/v1/calendar")) {
      return calendarReply({ error: "method_not_allowed" }, 405, { Allow: "GET, POST, PATCH" });
    }
    return calendarReply({ error: "not_found" }, 404);
  } catch {
    return calendarReply({ error: "calendar_unavailable" }, 503);
  }
}
