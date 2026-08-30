"use client";

import { useMemo, useState } from "react";
import { PaperFolder } from "@/components/patterns/brand/PaperFolder";
import { InternalBetaReview } from "@/components/domain/ops/InternalBetaReview";
import { ProductionBoard } from "@/components/patterns/ProductionBoard";
import { ProductionCalendar } from "@/components/patterns/ProductionCalendar";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  emptyProductionWorkspace,
  isProductionColumnId,
  isProductionPinTone,
  moveProductionPin,
  productionColumns,
  productionPinTones,
  shiftMonth,
  type ProductionColumnId,
  type ProductionPin,
  type ProductionPinTone,
} from "@/lib/ops/production";

type View = "calendar" | "board";

const field =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-body";

export function ProductionWorkspace({ showcase = false }: { showcase?: boolean }) {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>("calendar");
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState("");
  const [column, setColumn] = useState<ProductionColumnId>("unscheduled");
  const [tone, setTone] = useState<ProductionPinTone>("attention");
  const [note, setNote] = useState("");
  const [pins, setPins] = useState<ProductionPin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | undefined>();
  const allowSketch = true;
  const selectedPin = pins.find((pin) => pin.id === selectedPinId);

  const shift = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const placeSketch = () => {
    const text = note.trim();
    if (!allowSketch || !selectedDay || !text) return;
    const id = `sketch-${Date.now()}`;
    setPins((current) => {
      return [
        ...current,
        {
          id,
          note: text,
          day: selectedDay,
          column,
          owner: null,
          sketch: true,
          tone,
        },
      ];
    });
    setSelectedPinId(id);
    setNote("");
  };

  const movePin = (
    id: string,
    patch: Partial<Pick<ProductionPin, "day" | "column">>,
  ) => {
    setPins((current) => {
      const pin = current.find((item) => item.id === id);
      if (!pin) return current;
      return moveProductionPin(current, id, {
        day: patch.day ?? pin.day,
        column: patch.column ?? pin.column,
      });
    });
  };

  const moveSelectedPin = () => {
    if (!selectedPin || !selectedDay) return;
    movePin(selectedPin.id, { day: selectedDay, column });
  };

  const sketchNotice = showcase
    ? "local UI showcase · place and move visual sketches in this browser only. No schedule, owner, source, or provider is connected."
    : "local only · not synced · no production record, owner, or calendar provider is activated.";

  return (
    <div className="space-y-8">
      <p className="max-w-[65ch] font-body text-body text-secondary">
        {!showcase && emptyProductionWorkspace.state === "not-activated"
          ? "the production board and calendar are not activated. "
          : null}
        {sketchNotice}
      </p>

      {!showcase ? <InternalBetaReview /> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={view === "calendar" ? "attention" : "ghost"}
          pressed={view === "calendar"}
          onClick={() => setView("calendar")}
        >
          calendar
        </Button>
        <Button
          type="button"
          variant={view === "board" ? "attention" : "ghost"}
          pressed={view === "board"}
          onClick={() => setView("board")}
        >
          board
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          {view === "calendar" ? (
            <ProductionCalendar
              year={year}
              month={month}
              selected={selectedDay}
              pins={pins}
              onSelect={setSelectedDay}
              onShift={shift}
              selectedPinId={selectedPinId}
              onSelectPin={setSelectedPinId}
              onMovePin={(id, day) => movePin(id, { day })}
            />
          ) : (
            <ProductionBoard
              pins={pins}
              selectedColumn={column}
              onSelectColumn={setColumn}
              selectedPinId={selectedPinId}
              onSelectPin={setSelectedPinId}
              onMovePin={(id, nextColumn) => movePin(id, { column: nextColumn })}
            />
          )}
        </div>
        <aside className="space-y-6 border-2 border-foreground bg-surface-raised p-4">
          <PaperFolder label="pin well" />
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              placeSketch();
            }}
          >
            <DatePicker
              id="pin-day"
              label="day"
              value={selectedDay}
              onChange={setSelectedDay}
            />
            <label className="grid gap-1" htmlFor="pin-column">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                column
              </span>
              <select
                id="pin-column"
                value={column}
                onChange={(event) => {
                  if (isProductionColumnId(event.target.value)) {
                    setColumn(event.target.value);
                  }
                }}
                className={field}
              >
                {productionColumns.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-tone">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                colour / flow
              </span>
              <select
                id="pin-tone"
                value={tone}
                onChange={(event) => {
                  if (isProductionPinTone(event.target.value)) {
                    setTone(event.target.value);
                  }
                }}
                className={field}
              >
                {productionPinTones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-owner">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                owner
              </span>
              <select id="pin-owner" disabled className={field} value="">
                <option value="">no owners activated</option>
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-note">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                note
              </span>
              <textarea
                id="pin-note"
                aria-label="production note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={160}
                disabled={!allowSketch}
                placeholder="sketch a pin"
                className={`${field} py-2`}
              />
            </label>
            <Button type="submit" variant="attention" disabled={!selectedDay || !note.trim()}>
              place local sketch
            </Button>
            {selectedPin ? (
              <Button type="button" variant="ghost" onClick={moveSelectedPin} disabled={!selectedDay}>
                move selected sketch
              </Button>
            ) : null}
          </form>
        </aside>
      </div>
    </div>
  );
}
