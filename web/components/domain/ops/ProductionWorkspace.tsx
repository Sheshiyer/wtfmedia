"use client";

import { useMemo, useState } from "react";
import { PaperFolder } from "@/components/patterns/brand/PaperFolder";
import { ProductionBoard } from "@/components/patterns/ProductionBoard";
import { ProductionCalendar } from "@/components/patterns/ProductionCalendar";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  isProductionColumnId,
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

export function ProductionWorkspace() {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>("calendar");
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState("");
  const [column, setColumn] = useState<ProductionColumnId>("unscheduled");
  const [tone, setTone] = useState<ProductionPinTone>("attention");
  const [note, setNote] = useState("");
  const [pins, setPins] = useState<ProductionPin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string>();
  // These sketches are intentionally browser-local UI state, including in a
  // production build. They never create a backend calendar record.
  const allowSketch = true;

  const shift = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const placeSketch = () => {
    const text = note.trim();
    if (!allowSketch || !selectedDay || !text) return;
    const id = `sketch-${pins.length + 1}`;
    setPins((current) => [
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
    ]);
    setSelectedPinId(id);
    setNote("");
  };

  const moveSelectedSketch = () => {
    if (!allowSketch || !selectedPinId || !selectedDay) return;
    setPins((current) => moveProductionPin(current, selectedPinId, { day: selectedDay, column }));
  };

  return (
    <div className="space-y-8">
      <p className="max-w-[65ch] font-body text-body text-secondary">
        no episode records, owners, or counts are inferred. delete is unavailable.
        {allowSketch
          ? " local sketches stay in this browser tab and are not backend records."
          : " calendar writes wait on a connected backend."}
      </p>

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
              onMovePin={(id, day) => setPins((current) => {
                const pin = current.find((item) => item.id === id);
                return pin ? moveProductionPin(current, id, { day, column: pin.column }) : current;
              })}
            />
          ) : (
            <ProductionBoard
              pins={pins}
              selectedColumn={column}
              onSelectColumn={setColumn}
              selectedPinId={selectedPinId}
              onSelectPin={setSelectedPinId}
              onMovePin={(id, nextColumn) => setPins((current) => {
                const pin = current.find((item) => item.id === id);
                return pin ? moveProductionPin(current, id, { day: pin.day, column: nextColumn }) : current;
              })}
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
            <label className="grid gap-1" htmlFor="pin-owner">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                owner
              </span>
              <select id="pin-owner" disabled className={field} value="">
                <option value="">no owner assigned</option>
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-tone">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                colour / flow
              </span>
              <select
                id="pin-tone"
                value={tone}
                onChange={(event) => setTone(event.target.value as ProductionPinTone)}
                className={field}
              >
                {productionPinTones.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="pin-note">
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
                production note
              </span>
              <textarea
                id="pin-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={160}
                disabled={!allowSketch}
                placeholder={allowSketch ? "add a production note" : "calendar backend is not connected"}
                className={`${field} py-2`}
              />
            </label>
            <Button type="submit" variant="attention" disabled={!allowSketch || !selectedDay || !note.trim()}>
              {allowSketch ? "place local sketch" : "create record"}
            </Button>
            <Button type="button" variant="ghost" disabled={!allowSketch || !selectedPinId || !selectedDay} onClick={moveSelectedSketch}>
              move selected sketch
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
