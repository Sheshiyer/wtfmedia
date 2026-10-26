"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ProductionBoard } from "@/components/patterns/ProductionBoard";
import { ProductionCalendar } from "@/components/patterns/ProductionCalendar";
import { ProductionDetails } from "@/components/domain/ops/production/ProductionDetails";
import { ProductionLegend } from "@/components/domain/ops/production/ProductionLegend";
import { ProductionSourceView } from "@/components/domain/ops/production/ProductionSourceView";
import { Button } from "@/components/ui/Button";
import { isoDate, shiftMonth } from "@/lib/ops/production";
import {
  dayLabel,
  dubbingStatuses,
  isCalendarActionEvent,
  isProductionBoardItem,
  isProductionSnapshot,
  optionLabel,
  productionStages,
  safeIpColor,
  type ProductionAction,
  type ProductionEvent,
  type ProductionSnapshot,
} from "@/lib/ops/production-data";

type View = "month" | "board" | "dubbing" | "source";

const filterClass = "min-h-11 min-w-[10rem] rounded-control border-2 border-foreground bg-canvas px-2.5 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention";

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function errorForStatus(status: number) {
  if (status === 401 || status === 403) return "This calendar needs an active WTF operator account. Ask an administrator to check your access.";
  if (status === 503) return "The local production database is unavailable. Start the local Cloudflare edge service and retry.";
  return `The production calendar could not be loaded (HTTP ${status}).`;
}

export function ProductionWorkspace() {
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

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/ops/api/production", { cache: "no-store", signal });
    if (!response.ok) throw new Error(errorForStatus(response.status));
    const body: unknown = await response.json();
    if (!isProductionSnapshot(body)) throw new Error("The production API returned an incomplete calendar response.");
    setSnapshot(body);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void refresh(controller.signal)
      .then(() => setError(""))
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "The production calendar could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  const onAction = useCallback(async (action: ProductionAction, data: Record<string, unknown>) => {
    if (!snapshot || (action === "create_ip" || action === "update_ip" || action === "update_ip_target" ? !snapshot.canManage : !snapshot.canEdit)) return false;
    setBusy(true);
    setError("");
    setNotice("");
    let saved = false;
    try {
      const response = await fetch("/ops/api/production", {
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
      setNotice("Saved to the local production database.");
      return true;
    } catch (cause) {
      if (saved) {
        setError("Saved locally, but the page could not refresh. Reload before making another change.");
        return true;
      }
      setError(cause instanceof Error ? cause.message : "The production change could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh, snapshot]);

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
          <p className="mt-1 font-body text-sm text-secondary">Shoots, releases and dubbing in one place. Select an entry to update it.</p>
        </div>
        {snapshot.canEdit && (creating
          ? <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          : <Button type="button" variant="attention" onClick={() => { setSelectedItemId(null); setSelectedEventId(null); setCreating(true); setError(""); setNotice(""); }}>Add episode</Button>)}
      </div>

      {!creating && (view === "month" || openBlockers > 0) && <div className="flex flex-wrap gap-4 border-b border-foreground/25 pb-3 font-label text-xs text-secondary">
        {view === "month" && <span><strong className="text-foreground">{monthMarks}</strong> dated {monthMarks === 1 ? "mark" : "marks"} in {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month, 1)))}</span>}
        {openBlockers > 0 && <span><strong className="text-editorial">{openBlockers}</strong> open {openBlockers === 1 ? "blocker" : "blockers"}</span>}
      </div>}

      {error && <div role="alert" className="border-l-4 border-editorial bg-surface-raised px-4 py-3 font-body text-sm">{error}</div>}
      {notice && <p role="status" className="border-l-4 border-live bg-surface-raised px-4 py-3 font-body text-sm">{notice}</p>}

      {creating ? (
        <div className="max-w-2xl">
          <ProductionDetails key="creating" snapshot={snapshot} selectedDay={selectedDay} selectedItemId={null} selectedEventId={null} showDayEvents={false} creating creatingDubbing={view === "dubbing"} busy={busy} standalone onSelectItem={setSelectedItemId} onSelectEvent={setSelectedEventId} onStartCreate={() => setCreating(true)} onCreated={(trackedDubbing) => { setCreating(false); setView(trackedDubbing ? "dubbing" : "board"); setIpFilter("all"); setFormatFilter("all"); setStageFilter("all"); setNotice(trackedDubbing ? "Dubbing episode saved. Add guest permissions, notes, and a confirmed go-live date in its details." : "Episode saved. Add dates and details in the selected episode panel."); }} onAction={onAction} />
        </div>
      ) : <>
      <nav aria-label="Production views" className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={view === "month" ? "attention" : "ghost"} pressed={view === "month"} onClick={() => setView("month")}>Calendar</Button>
        <Button type="button" variant={view === "board" ? "attention" : "ghost"} pressed={view === "board"} onClick={() => setView("board")}>Board</Button>
        <Button type="button" variant={view === "dubbing" ? "attention" : "ghost"} pressed={view === "dubbing"} onClick={() => setView("dubbing")}>Dubbing</Button>
        {snapshot.canManage && <button type="button" onClick={() => setView(view === "source" ? "month" : "source")} className="ml-auto font-label text-xs font-bold text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">{view === "source" ? "Back to calendar" : "Workbook reference"}</button>}
      </nav>

      {view !== "source" && <div className="flex flex-wrap items-end gap-3 border border-foreground/35 bg-surface-raised p-3">
        <label className="grid gap-1 font-label text-xs font-bold">IP<select className={filterClass} value={ipFilter} onChange={(event) => setIpFilter(event.target.value)}><option value="all">All IPs</option><option value="unclassified">Needs IP review</option>{snapshot.ips.map((ip) => <option key={ip.id} value={ip.id}>{ip.name}</option>)}</select></label>
        <details className="group"><summary className="min-h-11 cursor-pointer border border-foreground/40 px-3 py-3 font-label text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">More filters{formatFilter !== "all" || stageFilter !== "all" ? " · active" : ""}</summary><div className="mt-2 flex flex-wrap gap-3"><label className="grid gap-1 font-label text-xs font-bold">Format<select className={filterClass} value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}><option value="all">All formats</option>{formats.map((format) => <option key={format} value={format}>{format}</option>)}</select></label><label className="grid gap-1 font-label text-xs font-bold">Stage<select className={filterClass} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All stages</option>{productionStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label></div></details>
        {view === "month" && <label className="grid gap-1 font-label text-xs font-bold">Jump to month<input type="month" className={filterClass} value={`${year}-${String(month + 1).padStart(2, "0")}`} onChange={(event) => { const [nextYear, nextMonth] = event.target.value.split("-").map(Number); if (nextYear && nextMonth) { setYear(nextYear); setMonth(nextMonth - 1); setSelectedDay(isoDate(nextYear, nextMonth - 1, 1)); } }} /></label>}
        {view === "board" && <span className="ml-auto font-label text-xs text-secondary">{boardItems.length} episodes</span>}
      </div>}

      {view === "source" ? <ProductionSourceView sheets={snapshot.sourceSheets} summary={snapshot.sourceSummary} /> : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            {view === "month" && <ProductionCalendar year={year} month={month} selectedDay={selectedDay} events={filteredEvents} items={filteredItems} ips={snapshot.ips} onSelectDay={(day) => { setSelectedDay(day); setSelectedEventId(null); }} onSelectEvent={selectEvent} onShift={shift} />}
            {view === "board" && <ProductionBoard items={boardItems} ips={snapshot.ips} events={filteredEvents} blockers={snapshot.blockers} today={todayInIndia()} onSelectItem={(id) => { setSelectedItemId(id); setSelectedEventId(null); setCreating(false); }} />}
            {view === "dubbing" && <ProductionDubbingList snapshot={snapshot} itemIds={filteredIds} onSelectItem={(id) => { setSelectedItemId(id); setSelectedEventId(null); setCreating(false); }} />}
            <ProductionLegend ips={snapshot.ips} items={snapshot.items} canManage={snapshot.canManage} busy={busy} onAction={onAction} />
          </div>
          <ProductionDetails key={selectedItemId ?? "new"} snapshot={snapshot} selectedDay={selectedDay} selectedItemId={selectedItemId} selectedEventId={selectedEventId} showDayEvents={view === "month"} creating={false} busy={busy} onSelectItem={(id) => { setSelectedItemId(id); setSelectedEventId(null); }} onSelectEvent={setSelectedEventId} onStartCreate={() => setCreating(true)} onAction={onAction} />
        </div>
      )}
      </>}
    </div>
  );
}

function ProductionDubbingList({ snapshot, itemIds, onSelectItem }: {
  snapshot: ProductionSnapshot;
  itemIds: ReadonlySet<string>;
  onSelectItem: (id: string) => void;
}) {
  const [lane, setLane] = useState("all");
  const rows = snapshot.items.filter((item) => itemIds.has(item.id) && (item.sourceRef?.startsWith("Dubbing Tracker!") || item.sourceRef === null && snapshot.dubbing.some((entry) => entry.itemId === item.id))).map((item) => {
    const dub = snapshot.dubbing.find((entry) => entry.itemId === item.id);
    const blockers = snapshot.blockers.filter((entry) => entry.itemId === item.id && entry.status !== "resolved");
    const guestCount = snapshot.itemGuests.filter((entry) => entry.itemId === item.id).length;
    const approvedGuests = snapshot.itemGuests.filter((entry) => entry.itemId === item.id && snapshot.permissions.find((permission) => permission.itemId === item.id && permission.guestId === entry.guestId)?.status === "approved").length;
    return { item, dub, blockers, guestCount, approvedGuests };
  }).sort((a, b) => (a.dub?.sourceRow ?? 1000) - (b.dub?.sourceRow ?? 1000) || a.item.title.localeCompare(b.item.title));
  const visibleRows = lane === "all" ? rows : rows.filter((row) => lane === "permissions" ? row.guestCount === 0 || row.approvedGuests < row.guestCount : lane === "blocked" ? row.blockers.length > 0 || row.dub?.status === "blocked" : row.dub?.publicationStatus === lane);
  const sourceRows = rows.filter((row) => row.dub?.sourceRow !== null && row.dub?.sourceRow !== undefined);
  const publishedCount = rows.filter((row) => row.dub?.publicationStatus === "published").length;
  const checkedCount = sourceRows.filter((row) => row.dub?.sourcePostedCheck === "checked").length;
  const uncheckedCount = sourceRows.filter((row) => row.dub?.sourcePostedCheck === "unchecked").length;
  const lanes = [{ id: "all", label: "All" }, { id: "not-published", label: "Not published" }, { id: "published", label: "Published" }, { id: "permissions", label: "Needs permission" }, { id: "blocked", label: "Blocked" }];
  return (
    <section aria-label="Dubbing pipeline" className="border-2 border-foreground bg-canvas">
      <div className="border-b-2 border-foreground bg-surface-raised px-4 py-3">
        <h2 className="font-heading text-xl">Dubbed episodes</h2>
        <p className="font-body text-sm text-secondary">A dubbed episode is live only when a go-live date is recorded. Guest permissions and dubbing work are tracked separately in each episode.</p>
        <div className="mt-3 flex flex-wrap gap-3 font-label text-xs"><span><strong>{publishedCount}</strong> live</span><span><strong>{rows.length - publishedCount}</strong> not published</span><span>Workbook Posted? <strong>{checkedCount}</strong> ☑ / <strong>{uncheckedCount}</strong> ☐{sourceRows.length - checkedCount - uncheckedCount > 0 ? ` / ${sourceRows.length - checkedCount - uncheckedCount} no box` : ""}</span></div>
        <p className="mt-1 font-body text-xs text-secondary">The workbook checkbox is shown exactly as recorded. Publication comes from an actual dubbed go-live date, so a checked box with no date remains not published.</p>
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Dubbing views">{lanes.map((choice) => <Button key={choice.id} type="button" variant={lane === choice.id ? "attention" : "ghost"} pressed={lane === choice.id} onClick={() => setLane(choice.id)}>{choice.label}</Button>)}</div>
      </div>
      <div className="divide-y divide-foreground/20">
        {visibleRows.length ? visibleRows.map(({ item, dub, blockers, guestCount, approvedGuests }) => {
          const ip = snapshot.ips.find((candidate) => candidate.id === item.ipId);
          const publication = dub?.publicationStatus === "published" ? `🎙️ Live ${dub.publishedOn ? dayLabel(dub.publishedOn) : ""}` : "Not published";
          return <button type="button" key={item.id} onClick={() => onSelectItem(item.id)} className="grid w-full gap-2 border-l-[5px] px-4 py-3 text-left hover:bg-attention/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention sm:grid-cols-[minmax(12rem,1.7fr)_minmax(9rem,1fr)] sm:items-center" style={{ borderLeftColor: safeIpColor(ip?.color) } as CSSProperties}>
            <span><span className="block font-body text-sm font-semibold">{item.title}</span><span className="font-label text-xs text-secondary">{ip?.name ?? "IP not recorded"}{dub?.sourceSection ? ` · ${dub.sourceSection === "solo" ? "Solo" : "Panel"}` : ""}</span></span>
            <span className="font-label text-xs"><span className="block font-bold">{publication}</span>{dub?.sourceRow && <span className="block text-secondary">Workbook Posted? {dub.sourcePostedCheck === "checked" ? "☑ checked" : dub.sourcePostedCheck === "unchecked" ? "☐ unchecked" : "— no box recorded"}</span>}<span className="block text-secondary">{guestCount ? `${approvedGuests} of ${guestCount} guest permissions approved` : "Guest not identified"} · Dubbing {optionLabel(dubbingStatuses, dub?.status ?? "unknown")}</span>{dub && (dub.notes || dub.sourceNotes.length) ? <span className="block text-secondary">Notes available in episode details</span> : null}{blockers[0] && <span className="block text-editorial">Blocked: {blockers[0].reason}</span>}</span>
          </button>;
        }) : <p className="p-6 font-body text-sm text-secondary">No items match this dubbing view.</p>}
      </div>
    </section>
  );
}
