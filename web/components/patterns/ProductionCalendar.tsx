"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { monthGrid, monthLabel, weekdayLabels, type MonthCell } from "@/lib/ops/production";
import {
  eventKindLabel,
  productionActionMark,
  safeIpColor,
  type ProductionEvent,
  type ProductionIp,
  type ProductionItem,
} from "@/lib/ops/production-data";

type CalendarProps = {
  year: number;
  month: number;
  selectedDay: string;
  events: readonly ProductionEvent[];
  items: readonly ProductionItem[];
  ips: readonly ProductionIp[];
  onSelectDay: (day: string) => void;
  onSelectEvent: (event: ProductionEvent) => void;
  onShift: (delta: number) => void;
};

export function ProductionCalendar({
  year,
  month,
  selectedDay,
  events,
  items,
  ips,
  onSelectDay,
  onSelectEvent,
  onShift,
}: CalendarProps) {
  const cells = monthGrid(year, month);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const ipById = new Map(ips.map((ip) => [ip.id, ip]));
  const eventsByDay = new Map<string, ProductionEvent[]>();
  for (const event of events) {
    const existing = eventsByDay.get(event.day) ?? [];
    existing.push(event);
    eventsByDay.set(event.day, existing);
  }
  return (
    <section aria-label="Production month calendar" className="overflow-hidden border-2 border-foreground bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground bg-surface-raised px-4 py-3">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Production dates</p>
          <h2 className="font-heading text-2xl leading-tight">{monthLabel(year, month)}</h2>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onShift(-1)} aria-label="Previous month">
            ← <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button type="button" variant="ghost" onClick={() => onShift(1)} aria-label="Next month">
            <span className="hidden sm:inline">Next</span> →
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[49rem]">
          <div className="grid grid-cols-7 border-b border-foreground/30 bg-surface-subtle">
            {weekdayLabels.map((label) => (
              <p key={label} className="px-2 py-2 text-center font-label text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell) => (
              <CalendarDay
                key={cell.iso}
                cell={cell}
                selected={selectedDay === cell.iso}
                events={eventsByDay.get(cell.iso) ?? []}
                itemById={itemById}
                ipById={ipById}
                onSelectDay={onSelectDay}
                onSelectEvent={onSelectEvent}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarDay({
  cell,
  selected,
  events,
  itemById,
  ipById,
  onSelectDay,
  onSelectEvent,
}: {
  cell: MonthCell;
  selected: boolean;
  events: readonly ProductionEvent[];
  itemById: ReadonlyMap<string, ProductionItem>;
  ipById: ReadonlyMap<string, ProductionIp>;
  onSelectDay: (day: string) => void;
  onSelectEvent: (event: ProductionEvent) => void;
}) {
  const shown = events.slice(0, 3);
  return (
    <div className={[
      "relative min-h-[8rem] min-w-0 border-b border-r border-foreground/20 p-1.5 sm:p-2",
      cell.inMonth ? "bg-canvas" : "bg-surface-subtle",
      selected ? "ring-2 ring-inset ring-attention" : "",
    ].join(" ")}>
      <button
        type="button"
        onClick={() => onSelectDay(cell.iso)}
        aria-label={`${cell.iso}, ${events.length} production ${events.length === 1 ? "event" : "events"}`}
        aria-pressed={selected}
        className="flex min-h-8 min-w-8 items-center justify-center rounded-control font-heading text-lg tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention hover:bg-surface-subtle"
      >
        {cell.day}
      </button>
      <div className="mt-1 space-y-1">
        {shown.map((event) => {
          const item = itemById.get(event.itemId);
          const ip = item?.ipId ? ipById.get(item.ipId) : undefined;
          const mark = productionActionMark(event.kind);
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event)}
              title={`${eventKindLabel(event.kind)} · ${item?.title ?? "Unlinked item"}${event.dateState === "unverified" ? " · needs review" : ""}`}
              aria-label={`${mark ? `${mark.icon} ` : ""}${eventKindLabel(event.kind)}: ${item?.title ?? "Unlinked item"}`}
              className="block w-full truncate border border-foreground/25 border-l-[5px] bg-surface-raised px-1.5 py-1 text-left font-label text-[11px] leading-tight text-foreground transition-colors hover:bg-attention/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
              style={{ borderLeftColor: safeIpColor(ip?.color), backgroundColor: mark?.color } as CSSProperties}
            >
              <span className="font-bold">{mark && <span aria-hidden="true" className="mr-1">{mark.icon}</span>}{eventKindLabel(event.kind)}</span>
              <span className="block truncate text-secondary">{item?.title ?? "Unlinked item"}</span>
            </button>
          );
        })}
        {events.length > shown.length && (
          <button type="button" onClick={() => onSelectDay(cell.iso)} className="w-full text-left font-label text-[11px] font-bold text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention">
            +{events.length - shown.length} more
          </button>
        )}
      </div>
    </div>
  );
}
