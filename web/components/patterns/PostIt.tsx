import type { ProductionPin } from "@/lib/ops/production";

const tones = [
  "bg-attention text-on-attention",
  "bg-canvas text-foreground",
  "bg-surface-raised text-foreground",
] as const;

export function PostIt({
  pin,
  tone = 0,
}: {
  pin: ProductionPin;
  tone?: 0 | 1 | 2;
}) {
  return (
    <article
      className={`min-h-24 rotate-[-1.5deg] border-2 border-foreground p-3 shadow-[4px_4px_0_var(--wtf-foreground)] ${tones[tone]}`}
      data-sketch={pin.sketch ? "true" : undefined}
    >
      <p className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {pin.sketch ? "sketch" : pin.column}
      </p>
      <p className="mt-2 font-body text-sm leading-snug">{pin.note}</p>
      <p className="mt-3 font-label text-[11px] tabular-nums">{pin.day}</p>
    </article>
  );
}
