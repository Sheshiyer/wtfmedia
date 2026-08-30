import type { DragEvent } from "react";
import type { ProductionPin } from "@/lib/ops/production";

const tones = {
  attention: "bg-attention text-on-attention",
  editorial: "bg-editorial text-on-editorial",
  knowledge: "bg-knowledge text-on-knowledge",
  live: "border-live bg-canvas text-foreground",
} as const;

export function PostIt({
  pin,
  selected = false,
  compact = false,
  onSelect,
  onDragStart,
}: {
  pin: ProductionPin;
  selected?: boolean;
  compact?: boolean;
  onSelect?: (id: string) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>, id: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={() => onSelect?.(pin.id)}
      onDragStart={(event) => onDragStart?.(event, pin.id)}
      aria-pressed={selected}
      aria-label={`select sketch ${pin.note}`}
      className={`${compact ? "min-h-0 truncate p-1 text-[11px] shadow-[2px_2px_0_var(--wtf-foreground)]" : "min-h-24 p-3 shadow-[4px_4px_0_var(--wtf-foreground)]"} w-full rotate-[-1.5deg] border-2 border-foreground text-left transition-transform hover:-rotate-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information ${tones[pin.tone]} ${selected ? "outline outline-2 outline-offset-4 outline-information" : ""}`}
      data-sketch={pin.sketch ? "true" : undefined}
      data-pin-id={pin.id}
      data-pin-tone={pin.tone}
    >
      {compact ? (
        <span className="block truncate font-label font-semibold">{pin.note}</span>
      ) : (
        <>
          <span className="block font-label text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
            {pin.sketch ? "local only · not synced" : pin.column}
          </span>
          <span className="mt-2 block font-body text-sm leading-snug">{pin.note}</span>
          <span className="mt-3 block font-label text-[11px] tabular-nums">{pin.day}</span>
        </>
      )}
    </button>
  );
}
