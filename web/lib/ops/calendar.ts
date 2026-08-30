export const calendarEventTypes = ["recording", "edit", "publish", "review", "other"] as const;
export const calendarConflictStates = ["clear", "potential", "confirmed"] as const;

export type CalendarEventType = (typeof calendarEventTypes)[number];
export type CalendarConflictState = (typeof calendarConflictStates)[number];

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  timezone: "Asia/Kolkata";
  eventType: CalendarEventType;
  ipLabel: string | null;
  showLabel: string | null;
  owner: string | null;
  column: "unscheduled" | "on-calendar" | "blocked";
  tone: "attention" | "editorial" | "knowledge" | "live";
  conflictState: CalendarConflictState;
  notes: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type CalendarMutation = Omit<CalendarEvent, "id" | "revision" | "createdAt" | "updatedAt">;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class CalendarApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly currentRevision?: number,
  ) {
    super(code);
    this.name = "CalendarApiError";
  }
}

function isEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<CalendarEvent>;
  const nullableText = (field: unknown) => field === null || typeof field === "string";
  return (
    typeof event.id === "string" && /^cal_[a-f0-9]{32}$/.test(event.id) &&
    typeof event.title === "string" && typeof event.startsAt === "string" &&
    event.timezone === "Asia/Kolkata" &&
    (calendarEventTypes as readonly unknown[]).includes(event.eventType) &&
    nullableText(event.ipLabel) && nullableText(event.showLabel) && nullableText(event.owner) &&
    (["unscheduled", "on-calendar", "blocked"] as readonly unknown[]).includes(event.column) &&
    (["attention", "editorial", "knowledge", "live"] as readonly unknown[]).includes(event.tone) &&
    (calendarConflictStates as readonly unknown[]).includes(event.conflictState) && nullableText(event.notes) &&
    typeof event.revision === "number" && Number.isInteger(event.revision) && event.revision >= 1 &&
    typeof event.createdAt === "string" && typeof event.updatedAt === "string"
  );
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json().catch(() => ({}));
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  if (!response.ok) {
    throw new CalendarApiError(
      typeof body.error === "string" ? body.error : "calendar_unavailable",
      response.status,
      typeof body.currentRevision === "number" ? body.currentRevision : undefined,
    );
  }
  return body;
}

export async function listCalendarEvents(
  from: string,
  to: string,
  fetcher: Fetcher = fetch,
): Promise<CalendarEvent[]> {
  const query = new URLSearchParams({ from, to });
  const body = await responseJson(await fetcher(`/api/calendar?${query}`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  }));
  if (!Array.isArray(body.events) || body.events.some((event) => !isEvent(event))) {
    throw new CalendarApiError("invalid_calendar_response", 502);
  }
  return body.events;
}

export async function createCalendarEvent(
  event: CalendarMutation,
  idempotencyKey: string,
  fetcher: Fetcher = fetch,
): Promise<CalendarEvent> {
  const body = await responseJson(await fetcher("/api/calendar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(event),
  }));
  if (!isEvent(body.event)) throw new CalendarApiError("invalid_calendar_response", 502);
  return body.event;
}

export async function updateCalendarEvent(
  id: string,
  revision: number,
  patch: Partial<CalendarMutation>,
  fetcher: Fetcher = fetch,
): Promise<CalendarEvent> {
  const body = await responseJson(await fetcher(`/api/calendar/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision, ...patch }),
  }));
  if (!isEvent(body.event)) throw new CalendarApiError("invalid_calendar_response", 502);
  return body.event;
}

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function kolkataDayToUtc(day: string) {
  if (!dateParts(day)) return null;
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

export function utcToKolkataDay(instant: string) {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function calendarRangeForDays(firstDay: string, lastDay: string) {
  const first = dateParts(firstDay);
  const last = dateParts(lastDay);
  if (!first || !last || first > last) return null;
  last.setUTCDate(last.getUTCDate() + 1);
  const toDay = last.toISOString().slice(0, 10);
  const from = kolkataDayToUtc(firstDay);
  const to = kolkataDayToUtc(toDay);
  return from && to ? { from, to } : null;
}

export function calendarErrorMessage(error: unknown) {
  if (!(error instanceof CalendarApiError)) return "calendar is temporarily unavailable. your changes were not saved.";
  if (error.code === "revision_conflict") return "this record changed elsewhere. the calendar has been refreshed; review it before retrying.";
  if (error.code === "rate_limited") return "calendar activity is temporarily limited. wait a minute, then retry.";
  if (error.code === "same_origin_required") return "calendar changes must be made from this WTF OS page.";
  if (error.code === "invalid_event") return "check the calendar fields and retry. your input is still here.";
  return "calendar is temporarily unavailable. your changes were not saved.";
}
