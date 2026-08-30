"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaperFolder } from "@/components/patterns/brand/PaperFolder";
import { ProductionBoard } from "@/components/patterns/ProductionBoard";
import { ProductionCalendar } from "@/components/patterns/ProductionCalendar";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  calendarConflictStates,
  calendarErrorMessage,
  calendarEventTypes,
  calendarRangeForDays,
  createCalendarEvent,
  kolkataDayToUtc,
  listCalendarEvents,
  updateCalendarEvent,
  utcToKolkataDay,
  type CalendarConflictState,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/ops/calendar";
import {
  isProductionColumnId,
  monthGrid,
  productionColumns,
  productionPinTones,
  shiftMonth,
  type ProductionColumnId,
  type ProductionPin,
  type ProductionPinTone,
} from "@/lib/ops/production";

type View = "calendar" | "board";
type LoadState = "loading" | "ready" | "saving" | "error";

const field =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-body";

function pinForEvent(event: CalendarEvent): ProductionPin | null {
  const day = utcToKolkataDay(event.startsAt);
  if (!day) return null;
  return {
    id: event.id,
    note: event.title,
    day,
    column: event.column,
    owner: event.owner,
    sketch: false,
    tone: event.tone,
  };
}

export function ProductionWorkspace() {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>("calendar");
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState("");
  const [column, setColumn] = useState<ProductionColumnId>("unscheduled");
  const [tone, setTone] = useState<ProductionPinTone>("attention");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [owner, setOwner] = useState("");
  const [ipLabel, setIpLabel] = useState("");
  const [showLabel, setShowLabel] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>("other");
  const [conflictState, setConflictState] = useState<CalendarConflictState>("clear");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string>();
  const requestGeneration = useRef(0);
  const pendingCreateKey = useRef<string | null>(null);

  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const range = useMemo(() => {
    const first = cells.at(0)?.iso;
    const last = cells.at(-1)?.iso;
    return first && last ? calendarRangeForDays(first, last) : null;
  }, [cells]);
  const pins = useMemo(
    () => events.flatMap((event) => {
      const pin = pinForEvent(event);
      return pin ? [pin] : [];
    }),
    [events],
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedPinId),
    [events, selectedPinId],
  );

  const reload = useCallback(async () => {
    if (!range) return false;
    const generation = ++requestGeneration.current;
    setLoadState("loading");
    try {
      const next = await listCalendarEvents(range.from, range.to);
      if (generation !== requestGeneration.current) return false;
      setEvents(next);
      setLoadState("ready");
      return true;
    } catch (error) {
      if (generation !== requestGeneration.current) return false;
      setEvents([]);
      setLoadState("error");
      setMessage(calendarErrorMessage(error));
      return false;
    }
  }, [range]);

  useEffect(() => {
    setMessage(undefined);
    void reload();
  }, [reload]);

  const invalidateCreateKey = () => {
    pendingCreateKey.current = null;
  };

  const shift = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const populateFromEvent = (event: CalendarEvent) => {
    const day = utcToKolkataDay(event.startsAt);
    if (day) setSelectedDay(day);
    setColumn(event.column);
    setTone(event.tone);
    setTitle(event.title);
    setDetails(event.notes ?? "");
    setOwner(event.owner ?? "");
    setIpLabel(event.ipLabel ?? "");
    setShowLabel(event.showLabel ?? "");
    setEventType(event.eventType);
    setConflictState(event.conflictState);
    setSelectedPinId(event.id);
    pendingCreateKey.current = null;
    setMessage(undefined);
  };

  const selectRecord = (id: string) => {
    const event = events.find((item) => item.id === id);
    if (event) populateFromEvent(event);
  };

  const mutationFields = () => {
    const startsAt = kolkataDayToUtc(selectedDay);
    if (!startsAt) return null;
    return {
      title: title.trim(),
      startsAt,
      timezone: "Asia/Kolkata" as const,
      eventType,
      ipLabel: ipLabel.trim() || null,
      showLabel: showLabel.trim() || null,
      owner: owner.trim() || null,
      column,
      tone,
      conflictState,
      notes: details.trim() || null,
    };
  };

  const createRecord = async () => {
    const fields = mutationFields();
    if (!fields || !fields.title) return;
    const key = pendingCreateKey.current ?? `calendar-${crypto.randomUUID()}`;
    pendingCreateKey.current = key;
    setLoadState("saving");
    setMessage(undefined);
    try {
      const created = await createCalendarEvent(fields, key);
      pendingCreateKey.current = null;
      setSelectedPinId(created.id);
      const refreshed = await reload();
      if (refreshed) {
        setMessage("calendar record saved in D1 and the views were refreshed.");
      }
    } catch (error) {
      setLoadState("error");
      setMessage(calendarErrorMessage(error));
    }
  };

  const updateSelectedRecord = async () => {
    const fields = mutationFields();
    if (!fields || !fields.title || !selectedEvent) return;
    setLoadState("saving");
    setMessage(undefined);
    try {
      await updateCalendarEvent(selectedEvent.id, selectedEvent.revision, fields);
      const refreshed = await reload();
      if (refreshed) setMessage("calendar record updated in D1 and the views were refreshed.");
    } catch (error) {
      setLoadState("error");
      setMessage(calendarErrorMessage(error));
      if (error instanceof Error && error.message === "revision_conflict") void reload();
    }
  };

  const moveRecord = async (
    id: string,
    patch: { day?: string; column?: ProductionColumnId },
  ) => {
    const event = events.find((item) => item.id === id);
    if (!event) return;
    const startsAt = patch.day ? kolkataDayToUtc(patch.day) : event.startsAt;
    if (!startsAt) return;
    setSelectedPinId(id);
    setLoadState("saving");
    setMessage(undefined);
    try {
      await updateCalendarEvent(id, event.revision, {
        startsAt,
        column: patch.column ?? event.column,
      });
      const refreshed = await reload();
      if (refreshed) setMessage("calendar record moved and every view was refreshed.");
    } catch (error) {
      setLoadState("error");
      setMessage(calendarErrorMessage(error));
      void reload();
    }
  };

  const busy = loadState === "loading" || loadState === "saving";

  return (
    <div className="space-y-8">
      <p className="max-w-[72ch] font-body text-body text-secondary">
        records shown here come from the target D1 calendar. anyone with this URL may list, create, and update records during this release window. edits are anonymous and cannot be attributed to a verified person. delete is unavailable.
      </p>

      {message ? (
        <p role={loadState === "error" ? "alert" : "status"} className="border-2 border-foreground bg-surface-raised px-4 py-3 font-body text-sm">
          {message}
        </p>
      ) : null}
      {loadState === "loading" ? <p role="status" className="font-body text-sm text-secondary">loading calendar records…</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={view === "calendar" ? "attention" : "ghost"} pressed={view === "calendar"} onClick={() => setView("calendar")}>
          calendar
        </Button>
        <Button type="button" variant={view === "board" ? "attention" : "ghost"} pressed={view === "board"} onClick={() => setView("board")}>
          board
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void reload()}>
          refresh records
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {view === "calendar" ? (
            <ProductionCalendar
              year={year}
              month={month}
              selected={selectedDay}
              pins={pins}
              onSelect={(day) => { setSelectedDay(day); invalidateCreateKey(); }}
              onShift={shift}
              selectedPinId={selectedPinId}
              onSelectPin={selectRecord}
              onMovePin={(id, day) => void moveRecord(id, { day })}
            />
          ) : (
            <ProductionBoard
              pins={pins}
              selectedColumn={column}
              onSelectColumn={(next) => { setColumn(next); invalidateCreateKey(); }}
              selectedPinId={selectedPinId}
              onSelectPin={selectRecord}
              onMovePin={(id, nextColumn) => void moveRecord(id, { column: nextColumn })}
            />
          )}
        </div>
        <aside className="space-y-6 border-2 border-foreground bg-surface-raised p-4">
          <PaperFolder label={selectedEvent ? "record editor" : "record well"} />
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void (selectedEvent ? updateSelectedRecord() : createRecord()); }}>
            <DatePicker id="pin-day" label="day" value={selectedDay} onChange={(value) => { setSelectedDay(value); invalidateCreateKey(); }} />
            <label className="grid gap-1" htmlFor="pin-column">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">column</span>
              <select id="pin-column" value={column} onChange={(event) => { if (isProductionColumnId(event.target.value)) { setColumn(event.target.value); invalidateCreateKey(); } }} className={field}>
                {productionColumns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-event-type">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">event type</span>
              <select id="pin-event-type" value={eventType} onChange={(event) => { setEventType(event.target.value as CalendarEventType); invalidateCreateKey(); }} className={field}>
                {calendarEventTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-owner">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">owner label</span>
              <input id="pin-owner" maxLength={120} className={field} value={owner} onChange={(event) => { setOwner(event.target.value); invalidateCreateKey(); }} placeholder="optional; not verified identity" />
            </label>
            <label className="grid gap-1" htmlFor="pin-ip-label">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">IP label</span>
              <input id="pin-ip-label" maxLength={120} className={field} value={ipLabel} onChange={(event) => { setIpLabel(event.target.value); invalidateCreateKey(); }} placeholder="optional" />
            </label>
            <label className="grid gap-1" htmlFor="pin-show-label">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">show label</span>
              <input id="pin-show-label" maxLength={120} className={field} value={showLabel} onChange={(event) => { setShowLabel(event.target.value); invalidateCreateKey(); }} placeholder="optional" />
            </label>
            <label className="grid gap-1" htmlFor="pin-conflict">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">conflict state</span>
              <select id="pin-conflict" value={conflictState} onChange={(event) => { setConflictState(event.target.value as CalendarConflictState); invalidateCreateKey(); }} className={field}>
                {calendarConflictStates.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-tone">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">colour / flow</span>
              <select id="pin-tone" value={tone} onChange={(event) => { setTone(event.target.value as ProductionPinTone); invalidateCreateKey(); }} className={field}>
                {productionPinTones.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-note">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">production note</span>
              <textarea id="pin-note" value={title} onChange={(event) => { setTitle(event.target.value); invalidateCreateKey(); }} rows={3} maxLength={160} placeholder="record title" className={`${field} py-2`} />
            </label>
            <label className="grid gap-1" htmlFor="pin-details">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">details</span>
              <textarea id="pin-details" value={details} onChange={(event) => { setDetails(event.target.value); invalidateCreateKey(); }} rows={3} maxLength={1000} placeholder="optional; do not add secrets" className={`${field} py-2`} />
            </label>
            <Button type="submit" variant="attention" disabled={busy || !selectedDay || !title.trim()}>
              {loadState === "saving" ? "saving…" : selectedEvent ? "update selected record" : "create record"}
            </Button>
            {selectedEvent ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => { setSelectedPinId(undefined); setTitle(""); setDetails(""); setMessage(undefined); }}>
                start a new record
              </Button>
            ) : null}
          </form>
        </aside>
      </div>
    </div>
  );
}
