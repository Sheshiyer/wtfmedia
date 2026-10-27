"use client";

import type { CSSProperties } from "react";
import { ProductionActionBadge } from "@/components/domain/ops/production/ProductionActionBadge";
import {
  dayLabel,
  productionBoardLane,
  safeIpColor,
  type ProductionBlocker,
  type ProductionBoardLane,
  type ProductionEvent,
  type ProductionIp,
  type ProductionItem,
} from "@/lib/ops/production-data";

const lanes: { id: ProductionBoardLane; title: string; description: string }[] = [
  { id: "post-production", title: "Post-production", description: "Marked this way in the production tracker" },
  { id: "scheduled", title: "Coming up", description: "A future production date is recorded" },
  { id: "no-release-date", title: "No release date", description: "No confirmed release or upcoming date" },
  { id: "published", title: "Live", description: "Marked Posted or has an actual release date" },
];

export function ProductionBoard({
  items,
  ips,
  events,
  blockers,
  today,
  onSelectItem,
}: {
  items: readonly ProductionItem[];
  ips: readonly ProductionIp[];
  events: readonly ProductionEvent[];
  blockers: readonly ProductionBlocker[];
  today: string;
  onSelectItem: (itemId: string) => void;
}) {
  const ipById = new Map(ips.map((ip) => [ip.id, ip]));
  const eventsByItem = new Map<string, ProductionEvent[]>();
  for (const event of events) {
    const list = eventsByItem.get(event.itemId) ?? [];
    list.push(event);
    eventsByItem.set(event.itemId, list);
  }
  const visibleLanes = lanes.map((lane) => ({
    ...lane,
    items: items.filter((item) => productionBoardLane(item, eventsByItem.get(item.id) ?? [], today) === lane.id),
  })).filter((lane) => lane.items.length > 0);

  if (!visibleLanes.length) return <section className="border-2 border-foreground bg-canvas p-6 font-body text-sm text-secondary">No production items match these filters. Add an episode or choose another IP.</section>;

  return (
    <section aria-label="Production board" className="min-w-0 border-2 border-foreground bg-surface-subtle">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] items-start gap-3 p-3">
        {visibleLanes.map((lane) => (
          <div key={lane.id} className="min-w-0 border border-foreground/40 bg-canvas [overflow-wrap:anywhere]">
            <div className="border-b-2 border-foreground px-3 py-2">
              <div className="flex items-center justify-between gap-2"><h2 className="font-heading text-lg">{lane.title}</h2><span className="font-label text-xs font-bold tabular-nums text-secondary">{lane.items.length}</span></div>
              <p className="font-body text-xs text-secondary">{lane.description}</p>
            </div>
            <div className="space-y-2 p-2">
              {lane.items.map((item) => {
                const ip = item.ipId ? ipById.get(item.ipId) : undefined;
                const timeline = [...(eventsByItem.get(item.id) ?? [])].sort((a, b) => a.day.localeCompare(b.day));
                const highlight = timeline.find((event) => event.day > today) ?? timeline.at(-1);
                const openBlocks = blockers.filter((blocker) => blocker.itemId === item.id && blocker.status !== "resolved");
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    className="min-w-0 w-full border border-foreground/50 border-l-[6px] bg-surface-raised p-3 text-left hover:bg-attention/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
                    style={{ borderLeftColor: safeIpColor(ip?.color) } as CSSProperties}
                  >
                    <span className="font-label text-[11px] font-bold uppercase tracking-[0.06em] text-secondary">{ip?.name ?? "IP not recorded"}</span>
                    <span className="mt-1 block font-body text-sm font-semibold leading-snug text-foreground">{item.title}</span>
                    {item.sourceMarker === "not-live" && <span className="mt-1 block font-label text-xs text-secondary">⭕️ Not Live in the workbook</span>}
                    {highlight && <span className="mt-2 block font-label text-xs text-secondary"><ProductionActionBadge kind={highlight.kind} /> · {dayLabel(highlight.day)}</span>}
                    {item.owner && <span className="mt-1 block font-label text-xs text-secondary" title={item.owner}>Lead: {item.owner}</span>}
                    {openBlocks.length > 0 && <span className="mt-2 inline-block border border-editorial px-1.5 py-0.5 font-label text-[11px] font-bold text-editorial">{openBlocks.length} {openBlocks.length === 1 ? "blocker" : "blockers"}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
