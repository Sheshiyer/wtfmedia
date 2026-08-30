"use client";

import { Button } from "@/components/ui/Button";
import {
  monthGrid,
  monthLabel,
  weekdayLabels,
  type MonthCell,
  type ProductionPin,
} from "@/lib/ops/production";
import { PostIt } from "@/components/patterns/PostIt";

type ProductionCalendarProps = {
  year: number;
  month: number;
  selected?: string;
  pins: readonly ProductionPin[];
  onSelect: (iso: string) => void;
  onShift: (delta: number) => void;
  selectedPinId?: string;
  onSelectPin?: (id: string) => void;
  onMovePin?: (id: string, day: string) => void;
};

function pinsForDay(pins: readonly ProductionPin[], iso: string) {
  return pins.filter((pin) => pin.day === iso);
}

export function ProductionCalendar({
  year,
  month,
  selected,
  pins,
  onSelect,
  onShift,
  selectedPinId,
  onSelectPin,
  onMovePin,
}: ProductionCalendarProps) {
  const cells = monthGrid(year, month);

  return (
    <section aria-label="production calendar" className="border-2 border-foreground bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground px-4 py-3">
        <h2 className="font-heading text-lg lowercase">{monthLabel(year, month)}</h2>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onShift(-1)}>
            previous month
          </Button>
          <Button type="button" variant="ghost" onClick={() => onShift(1)}>
            next month
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b-2 border-foreground bg-surface-subtle">
        {weekdayLabels.map((label) => (
          <p
            key={label}
            className="px-2 py-2 text-center font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary"
          >
            {label}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => (
          <CalendarDay
            key={cell.iso}
            cell={cell}
            selected={selected === cell.iso}
            pins={pinsForDay(pins, cell.iso)}
            onSelect={onSelect}
            selectedPinId={selectedPinId}
            onSelectPin={onSelectPin}
            onMovePin={onMovePin}
          />
        ))}
      </div>
    </section>
  );
}

function CalendarDay({
  cell,
  selected,
  pins,
  onSelect,
  selectedPinId,
  onSelectPin,
  onMovePin,
}: {
  cell: MonthCell;
  selected: boolean;
  pins: readonly ProductionPin[];
  onSelect: (iso: string) => void;
  selectedPinId?: string;
  onSelectPin?: (id: string) => void;
  onMovePin?: (id: string, day: string) => void;
}) {
  return (
    <div
      data-calendar-day={cell.iso}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const pinId = event.dataTransfer.getData("text/plain");
        if (pinId) onMovePin?.(pinId, cell.iso);
      }}
      className={[
        "min-h-[5.5rem] min-w-0 border-b border-r border-foreground/30 p-2 text-left",
        cell.inMonth ? "bg-canvas" : "bg-surface-subtle text-muted",
        selected ? "bg-attention/30" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSelect(cell.iso)}
        aria-pressed={selected}
        aria-label={`${cell.iso}${pins.length ? `, ${pins.length} sketches` : ""}`}
        className="font-label text-[11px] font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
      >
        {cell.day}
      </button>
      <div className="mt-2 flex flex-col gap-1">
        {pins.map((pin) => (
          <PostIt
            key={pin.id}
            pin={pin}
            compact
            selected={selectedPinId === pin.id}
            onSelect={onSelectPin}
            onDragStart={(event, id) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
