import { PostIt } from "@/components/patterns/PostIt";
import {
  productionColumns,
  type ProductionColumnId,
  type ProductionPin,
} from "@/lib/ops/production";

export function ProductionBoard({
  pins,
  selectedColumn,
  onSelectColumn,
}: {
  pins: readonly ProductionPin[];
  selectedColumn: ProductionColumnId;
  onSelectColumn: (column: ProductionColumnId) => void;
}) {
  return (
    <section
      aria-label="production board"
      className="grid gap-3 md:grid-cols-3"
    >
      {productionColumns.map((column, index) => {
        const columnPins = pins.filter((pin) => pin.column === column.id);
        const selected = selectedColumn === column.id;
        return (
          <div
            key={column.id}
            className="min-h-[22rem] border-2 border-foreground bg-surface-raised p-3"
          >
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectColumn(column.id)}
              className={[
                "flex min-h-11 w-full items-center justify-between border-2 px-3 font-label text-sm font-bold lowercase",
                selected
                  ? "border-attention bg-attention text-on-attention"
                  : "border-foreground bg-canvas",
              ].join(" ")}
            >
              <span>{column.label}</span>
              <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em]">
                not activated
              </span>
            </button>
            <div className="mt-3 flex min-h-[16rem] flex-col gap-3">
              {columnPins.length ? (
                columnPins.map((pin, pinIndex) => (
                  <PostIt
                    key={pin.id}
                    pin={pin}
                    tone={(pinIndex % 3) as 0 | 1 | 2}
                  />
                ))
              ) : (
                <p className="m-auto max-w-[24ch] text-center font-body text-sm text-secondary">
                  pins land here when a production record exists.
                </p>
              )}
            </div>
            <p className="sr-only">
              {column.label} column {index + 1} of {productionColumns.length}
            </p>
          </div>
        );
      })}
    </section>
  );
}
