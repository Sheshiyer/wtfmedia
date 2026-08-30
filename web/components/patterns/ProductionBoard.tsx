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
  selectedPinId,
  onSelectPin,
  onMovePin,
}: {
  pins: readonly ProductionPin[];
  selectedColumn: ProductionColumnId;
  onSelectColumn: (column: ProductionColumnId) => void;
  selectedPinId?: string;
  onSelectPin?: (id: string) => void;
  onMovePin?: (id: string, column: ProductionColumnId) => void;
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
            <div
              className="mt-3 flex min-h-[16rem] flex-col gap-3"
              data-production-column={column.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const pinId = event.dataTransfer.getData("text/plain");
                if (pinId) onMovePin?.(pinId, column.id);
              }}
            >
              {columnPins.length ? (
                columnPins.map((pin) => (
                  <PostIt
                    key={pin.id}
                    pin={pin}
                    selected={selectedPinId === pin.id}
                    onSelect={onSelectPin}
                    onDragStart={(event, id) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", id);
                    }}
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
