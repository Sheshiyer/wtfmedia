"use client";

import { useState } from "react";
import { connections } from "@/lib/connections";
import { normalizeConnectionsData } from "@/lib/public/connections";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { GraphWithList } from "@/components/patterns/GraphWithList";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

/**
 * Migrated Connections page (Plan 01-14).
 *
 * Consumes the public projection only — no operator vocabulary, no raw data.
 * Uses GraphWithList pattern: aria-hidden canvas + semantic list with
 * shared selection state.
 */

export default function MigratedConnectionsPage() {
  const data = normalizeConnectionsData(connections);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const established = data.nodes.filter((n) => n.episodeCount >= 3);
  const emerging = data.nodes.filter((n) => n.episodeCount < 3);

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        eyebrow="evidence map"
        title="connections"
        summary="inspect recurring themes and idea overlaps across the catalogue without turning transcript mentions into identity, employment, or relationship claims."
        accent="information"
        context={
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>{data.nodes.length} public idea nodes</span>
            <span>{data.edges.length} source-backed overlaps</span>
            <span>canvas + semantic list</span>
          </div>
        }
      />

      <div className="mx-auto max-w-[var(--wtf-content-max)] space-y-12 px-4 py-8 sm:px-8 xl:px-12 xl:py-12">

      {/* Graph with semantic list fallback */}
      <GraphWithList
        nodes={data.nodes}
        edges={data.edges}
        selectedId={selectedId}
        onSelect={setSelectedId}
        canvas={
          <ConnectionGraph
            nodes={data.nodes}
            edges={data.edges}
            titles={connections.titles}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        }
      />

      {/* Category overlaps */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Category overlaps</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.overlaps.map((o, i) => (
            <div
              key={i}
              className="rounded-lg border-2 border-foreground bg-surface-raised p-4"
            >
              <div className="text-sm font-semibold text-foreground">
                {o.a} + {o.b}
              </div>
              <div className="mt-1 text-xs font-medium text-secondary">
                {o.shared} shared episodes
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Established nodes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Established nodes{" "}
          <span className="text-base font-normal text-secondary">
            ({established.length})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {established.map((n) => (
            <PublicNodeRow key={n.id} node={n} />
          ))}
        </div>
      </section>

      {/* Strongest connections */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Strongest connections</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.edges
            .slice()
            .sort((a, b) => b.shared - a.shared)
            .slice(0, 12)
            .map((e, i) => {
              const la = data.nodes.find((n) => n.id === e.a)?.label || e.a;
              const lb = data.nodes.find((n) => n.id === e.b)?.label || e.b;
              return (
                <div
                  key={i}
                  className="rounded-lg border-2 border-foreground bg-surface-raised p-4"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {la} <span className="text-muted">+</span> {lb}
                  </div>
                  <div className="mt-1 text-xs font-medium text-secondary">
                    {e.shared} shared episodes
                  </div>
                </div>
              );
            })}
        </div>
      </section>

        {/* Emerging nodes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Emerging nodes{" "}
          <span className="text-base font-normal text-secondary">
            ({emerging.length})
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {emerging.map((n) => (
            <PublicNodeRow key={n.id} node={n} />
          ))}
        </div>
        </section>
      </div>
    </div>
  );
}

function PublicNodeRow({
  node,
}: {
  node: {
    id: string;
    label: string;
    category: string;
    episodeCount: number;
    episodes: string[];
  };
}) {
  const catClass = (c: string) => {
    const k = c.toLowerCase();
    if (k.includes("ai") || k.includes("tech")) return "bg-knowledge text-on-knowledge";
    if (k.includes("start") || k.includes("business")) return "bg-information text-on-information";
    if (k.includes("money") || k.includes("finance") || k.includes("market"))
      return "border-live bg-canvas text-foreground";
    if (k.includes("geo") || k.includes("society")) return "bg-editorial text-on-editorial";
    if (k.includes("health")) return "border-live bg-canvas text-foreground";
    if (k.includes("media") || k.includes("culture")) return "bg-information text-on-information";
    if (k.includes("india")) return "bg-attention text-on-attention";
    if (k.includes("mind") || k.includes("philos")) return "bg-surface-structure text-on-structure";
    if (k.includes("science")) return "bg-information text-on-information";
    return "bg-surface-structure text-on-structure";
  };

  return (
    <div className="space-y-2 rounded-lg border-2 border-foreground bg-surface-raised p-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${catClass(node.category)}`}
        >
          {node.category}
        </span>
        <span className="text-sm font-semibold text-foreground">{node.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-foreground/60"
            style={{
              width: `${Math.min(100, (node.episodeCount / 10) * 100)}%`,
            }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-medium text-secondary">
          {node.episodeCount} ep{node.episodeCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {node.episodes.slice(0, 6).map((vid) => (
          <a
            key={vid}
            href={`https://www.youtube.com/watch?v=${vid}`}
            target="_blank"
            rel="noreferrer"
            data-cursor="watch"
            className="max-w-[140px] truncate rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] transition-colors hover:bg-attention/20"
          >
            {vid}
          </a>
        ))}
        {node.episodes.length > 6 && (
          <span className="text-[10px] font-medium text-secondary">
            +{node.episodes.length - 6}
          </span>
        )}
      </div>
    </div>
  );
}
