"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ProductionBoard } from "@/components/patterns/ProductionBoard";
import { ProductionCalendar } from "@/components/patterns/ProductionCalendar";
import { ProductionDetails } from "@/components/domain/ops/production/ProductionDetails";
import { ProductionLegend } from "@/components/domain/ops/production/ProductionLegend";
import { ProductionSourceView } from "@/components/domain/ops/production/ProductionSourceView";
import { Button } from "@/components/ui/Button";
import { isoDate, shiftMonth } from "@/lib/ops/production";
import {
  isCalendarActionEvent,
  isProductionBoardItem,
  isProductionSnapshot,
  productionStages,
  type ProductionAction,
  type ProductionEvent,
  type ProductionSnapshot,
} from "@/lib/ops/production-data";

type View = "month" | "board" | "source";

const filterClass = "min-h-11 min-w-[10rem] rounded-control border-2 border-foreground bg-canvas px-2.5 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention";

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function errorForStatus(status: number) {
  if (status === 401 || status === 403) return "This calendar needs an active WTF operator account. Ask an administrator to check your access.";
  if (status === 503) return "The production calendar is temporarily unavailable. Please try again later.";
  return `The production calendar could not be loaded (HTTP ${status}).`;
}

export function ProductionWorkspaceView({ fetcher }: { fetcher: typeof fetch }) {
  const [selectedDay, setSelectedDay] = useState(todayInIndia);
  const [year, setYear] = useState(() => Number(todayInIndia().slice(0, 4)));
  const [month, setMonth] = useState(() => Number(todayInIndia().slice(5, 7)) - 1);
  const [view, setView] = useState<View>("month");
  const [snapshot, setSnapshot] = useState<ProductionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ipFilter, setIpFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createTrigger = useRef<HTMLElement | null>(null);
  const startCreate = (day = selectedDay) => {
    if (!snapshot?.canEdit || busy) return;
    createTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedDay(day);
    setCreating(true);
    setError("");
    setNotice("");
  };

  const requestSeq = useRef(0);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const seq = ++requestSeq.current;
    const response = await fetcher("/beta/api/production", { cache: "no-store", signal });
    if (!response.ok) throw new Error(errorForStatus(response.status));
    const body: unknown = await response.json();
    if (!isProductionSnapshot(body)) throw new Error("The production API returned an incomplete calendar response.");
    if (seq === requestSeq.current && !signal?.aborted) setSnapshot(body);
  }, [fetcher]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void refresh(controller.signal)
      .then(() => setError(""))
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "The production calendar could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  const syncActive = Boolean(snapshot?.sheetSync);
  useEffect(() => {
    if (!syncActive || busy || creating) return;
    const controller = new AbortController();
    const poll = () => {
      if (document.visibilityState === "visible") void refresh(controller.signal).catch(() => {});
    };
    const timer = window.setInterval(poll, 30000);
    document.addEventListener("visibilitychange", poll);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [syncActive, busy, creating, refresh]);

  const onAction = useCallback(async (action: ProductionAction, data: Record<string, unknown>) => {
    if (!snapshot || (action === "create_ip" || action === "update_ip" || action === "update_ip_target" ? !snapshot.canManage : !snapshot.canEdit)) return false;
    setBusy(true);
    setError("");
    setNotice("");
    let saved = false;
    try {
      const response = await fetcher("/beta/api/production", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ? `Save failed: ${body.error.replaceAll("_", " ")}.` : errorForStatus(response.status));
      }
      const body = await response.json() as { ok?: boolean; id?: unknown };
      if (body.ok !== true) throw new Error("Save was not confirmed by the production API.");
      saved = true;
      await refresh();
      if (action === "create_item" && typeof body.id === "string") setSelectedItemId(body.id);
      setNotice("Production changes saved.");
      return true;
    } catch (cause) {
      if (saved) {
        setError("Saved, but the page could not refresh. Reload before making another change.");
        return true;
      }
      setError(cause instanceof Error ? cause.message : "The production change could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [fetcher, refresh, snapshot]);

  const formats = useMemo(() => [...new Set(snapshot?.items.map((item) => item.format).filter(Boolean) ?? [])].sort(), [snapshot]);
  const filteredItems = useMemo(() => snapshot?.items.filter((item) =>
    (ipFilter === "all" || (ipFilter === "unclassified" ? item.ipId == null : item.ipId === ipFilter))
    && (formatFilter === "all" || item.format === formatFilter)
    && (stageFilter === "all" || item.stage === stageFilter)) ?? [], [snapshot, ipFilter, formatFilter, stageFilter]);
  const filteredIds = useMemo(() => new Set(filteredItems.map((item) => item.id)), [filteredItems]);
  const filteredEvents = useMemo(() => snapshot?.events.filter((event) => filteredIds.has(event.itemId) && isCalendarActionEvent(event)) ?? [], [snapshot, filteredIds]);
  const boardItems = useMemo(() => filteredItems.filter(isProductionBoardItem), [filteredItems]);
  const openBlockers = snapshot?.blockers.filter((blocker) => blocker.status !== "resolved").length ?? 0;
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthMarks = filteredEvents.filter((event) => event.day.startsWith(monthKey)).length;

  const shift = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const selectEvent = (event: ProductionEvent) => {
    setSelectedEventId(event.id);
    setSelectedItemId(event.itemId);
    setSelectedDay(event.day);
    setCreating(false);
  };

  if (loading && !snapshot) return <div role="status" className="border-2 border-foreground bg-surface-raised p-6 font-body">Loading the production calendar…</div>;
  if (!snapshot) return <div className="border-2 border-foreground bg-surface-raised p-6"><p role="alert" className="font-body text-sm">{error || "The production calendar is unavailable."}</p><Button type="button" variant="attention" className="mt-4" onClick={() => { setLoading(true); void refresh().then(() => setError("")).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Retry failed.")).finally(() => setLoading(false)); }}>Retry</Button></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">WTF production</p>
          <h2 className="font-heading text-2xl leading-tight">Calendar and production board</h2>
          <p className="mt-1 font-body text-sm text-secondary">Shoots and releases in one place. Select an entry to update it.</p>
        </div>
        {snapshot.canEdit && <Button type="button" variant="attention" onClick={() => startCreate()}>Add new episode</Button>}
      </div>

      {(view === "month" || openBlockers > 0) && <div className="flex flex-wrap gap-4 border-b border-foreground/25 pb-3 font-label text-xs text-secondary">
        {view === "month" && <span><strong className="text-foreground">{monthMarks}</strong> dated {monthMarks === 1 ? "mark" : "marks"} in {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month, 1)))}</span>}
        {openBlockers > 0 && <span><strong className="text-editorial">{openBlockers}</strong> active {openBlockers === 1 ? "restriction" : "restrictions"}</span>}
      </div>}

      {snapshot.sheetSync && <p className="font-body text-sm text-secondary">Google Sheets · last successful check {new Date(snapshot.sheetSync.checkedAt).toLocaleString()}{snapshot.sheetSync.reviewCount > 0 && ` · ${snapshot.sheetSync.reviewCount} source matches need review`}</p>}
      {error && <div role="alert" className="border-l-4 border-editorial bg-surface-raised px-4 py-3 font-body text-sm">{error}</div>}
      {notice && <p role="status" className="border-l-4 border-live bg-surface-raised px-4 py-3 font-body text-sm">{notice}</p>}

      <nav aria-label="Production views" className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={view === "month" ? "attention" : "ghost"} pressed={view === "month"} onClick={() => setView("month")}>Calendar</Button>
        <Button type="button" variant={view === "board" ? "attention" : "ghost"} pressed={view === "board"} onClick={() => setView("board")}>Board</Button>
        {snapshot.canManage && <button type="button" onClick={() => setView(view === "source" ? "month" : "source")} className="ml-auto font-label text-xs font-bold text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">{view === "source" ? "Back to calendar" : "Workbook reference"}</button>}
      </nav>

      {view !== "source" && <div className="flex flex-wrap items-end gap-3 border border-foreground/35 bg-surface-raised p-3">
        <label className="grid gap-1 font-label text-xs font-bold">IP<select className={filterClass} value={ipFilter} onChange={(event) => setIpFilter(event.target.value)}><option value="all">All IPs</option><option value="unclassified">Needs IP review</option>{snapshot.ips.map((ip) => <option key={ip.id} value={ip.id}>{ip.name}</option>)}</select></label>
        <details className="group"><summary className="min-h-11 cursor-pointer border border-foreground/40 px-3 py-3 font-label text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">More filters{formatFilter !== "all" || stageFilter !== "all" ? " · active" : ""}</summary><div className="mt-2 flex flex-wrap gap-3"><label className="grid gap-1 font-label text-xs font-bold">Format<select className={filterClass} value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}><option value="all">All formats</option>{formats.map((format) => <option key={format} value={format}>{format}</option>)}</select></label><label className="grid gap-1 font-label text-xs font-bold">Stage<select className={filterClass} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All stages</option>{productionStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label></div></details>
        {view === "month" && <label className="grid gap-1 font-label text-xs font-bold">Jump to month<input type="month" className={filterClass} value={`${year}-${String(month + 1).padStart(2, "0")}`} onChange={(event) => { const [nextYear, nextMonth] = event.target.value.split("-").map(Number); if (nextYear && nextMonth) { setYear(nextYear); setMonth(nextMonth - 1); setSelectedDay(isoDate(nextYear, nextMonth - 1, 1)); } }} /></label>}
        {view === "board" && <span className="ml-auto font-label text-xs text-secondary">{boardItems.length} episodes</span>}
      </div>}

      {view === "source" ? <ProductionSourceView changedAt={snapshot.sheetSync?.changedAt} fetcher={fetcher} sheets={snapshot.sourceSheets} summary={snapshot.sourceSummary} /> : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            {view === "month" && <ProductionCalendar year={year} month={month} selectedDay={selectedDay} events={filteredEvents} items={filteredItems} ips={snapshot.ips} onSelectDay={(day) => { setSelectedDay(day); setSelectedEventId(null); }} onCreateEpisode={snapshot.canEdit ? startCreate : undefined} onSelectEvent={selectEvent} onShift={shift} />}
            {view === "board" && <ProductionBoard items={boardItems} ips={snapshot.ips} events={filteredEvents} blockers={snapshot.blockers} today={todayInIndia()} onSelectItem={(id) => { setSelectedItemId(id); setSelectedEventId(null); setCreating(false); }} />}
            <ProductionLegend ips={snapshot.ips} items={snapshot.items} canManage={snapshot.canManage} busy={busy} onAction={onAction} />
          </div>
          <ProductionDetails key={selectedItemId ?? "new"} snapshot={snapshot} selectedDay={selectedDay} selectedItemId={selectedItemId} selectedEventId={selectedEventId} showDayEvents={view === "month"} creating={false} busy={busy} onSelectItem={(id) => { setSelectedItemId(id); setSelectedEventId(null); }} onSelectEvent={setSelectedEventId} onStartCreate={() => startCreate()} onAction={onAction} />
        </div>
      )}
      <Dialog.Root open={creating} onOpenChange={(open) => { if (!busy) setCreating(open); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-overlay/50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[71] max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-2 border-foreground bg-surface-raised p-4 shadow-xl sm:p-6"
            onCloseAutoFocus={(event) => { event.preventDefault(); createTrigger.current?.focus(); }}
          >
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="font-heading text-2xl">Create new episode</Dialog.Title>
              <Dialog.Close asChild><Button type="button" variant="ghost" disabled={busy} aria-label="Close create episode">×</Button></Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 font-body text-sm text-secondary">Add an episode and its first calendar date. This saves to the app; Google Sheets is unchanged.</Dialog.Description>
            {error && <p role="alert" className="mt-4 font-body text-sm text-editorial">{error}</p>}
            <ProductionDetails key={`create-${selectedDay}`} snapshot={snapshot} selectedDay={selectedDay} selectedItemId={null} selectedEventId={null} showDayEvents={false} creating busy={busy} standalone onSelectItem={setSelectedItemId} onSelectEvent={setSelectedEventId} onStartCreate={() => startCreate()} onCreated={(day) => { if (day) { setSelectedDay(day); setYear(Number(day.slice(0, 4))); setMonth(Number(day.slice(5, 7)) - 1); setView("month"); } else { setView("board"); } setCreating(false); setSelectedEventId(null); setIpFilter("all"); setFormatFilter("all"); setStageFilter("all"); }} onAction={onAction} />
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setCreating(false)}>Cancel</Button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
