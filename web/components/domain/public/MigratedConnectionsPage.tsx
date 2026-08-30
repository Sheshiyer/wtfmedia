"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { connections } from "@/lib/connections";
import { normalizeConnectionsData } from "@/lib/public/connections";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

function catClass(category: string) {
  const key = category.toLowerCase();
  if (key.includes("ai") || key.includes("tech")) return "bg-knowledge text-on-knowledge";
  if (key.includes("start") || key.includes("business")) return "bg-information text-on-information";
  if (key.includes("money") || key.includes("finance") || key.includes("market"))
    return "border-live bg-canvas text-foreground";
  if (key.includes("geo") || key.includes("society")) return "bg-editorial text-on-editorial";
  if (key.includes("health")) return "border-live bg-canvas text-foreground";
  if (key.includes("media") || key.includes("culture")) return "bg-information text-on-information";
  if (key.includes("india")) return "bg-attention text-on-attention";
  if (key.includes("mind") || key.includes("philos")) return "bg-surface-structure text-on-structure";
  if (key.includes("science")) return "bg-information text-on-information";
  return "bg-surface-structure text-on-structure";
}

/**
 * Migrated Connections page (Plan 01-14).
 *
 * Consumes the public projection only — no operator vocabulary, no raw data.
 * Keeps the graph primary, paired with a searchable semantic evidence panel.
 */

export default function MigratedConnectionsPage() {
  const data = normalizeConnectionsData(connections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const sortedNodes = useMemo(
    () => data.nodes.slice().sort((a, b) => b.episodeCount - a.episodeCount),
    [data.nodes],
  );
  const selectedNode = sortedNodes.find((node) => node.id === selectedId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredNodes = useMemo(() => {
    if (!normalizedQuery) return sortedNodes;
    return sortedNodes.filter((node) => {
      const episodeTitles = node.episodes
        .map((episodeId) => connections.titles[episodeId] ?? "")
        .join(" ");
      return `${node.label} ${node.category} ${episodeTitles}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [normalizedQuery, sortedNodes]);
  const strongestEdges = useMemo(
    () => data.edges.slice().sort((a, b) => b.shared - a.shared).slice(0, 8),
    [data.edges],
  );

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        eyebrow="recurring ideas"
        title="connections"
        summary="ideas that keep showing up across episodes. a mention is not a person, a job, or a relationship."
        accent="information"
        context={
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>{data.nodes.length} ideas</span>
            <span>{data.edges.length} shared-episode links</span>
          </div>
        }
      />

      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)] xl:px-12 xl:py-12">
        <section aria-label="connections graph" className="min-w-0">
          <div aria-hidden="true" tabIndex={-1} data-testid="graph-canvas">
            <ConnectionGraph
              nodes={data.nodes}
              edges={data.edges}
              titles={connections.titles}
              selectedId={selectedNode?.id ?? null}
              onSelect={setSelectedId}
            />
          </div>
        </section>

        <aside className="min-w-0 border-2 border-foreground bg-surface-raised p-4 shadow-[6px_6px_0_var(--wtf-foreground)] lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <label htmlFor="connections-search" className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            search ideas and episodes
          </label>
          <input
            id="connections-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-information"
            placeholder="idea or episode title"
          />

          <section role="region" aria-label="Connection nodes" className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-bold lowercase text-foreground">ideas</h2>
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                {filteredNodes.length}
              </span>
            </div>
            <ul className="space-y-2" data-testid="graph-node-list">
              {filteredNodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    data-testid={`graph-node-${node.id}`}
                    data-node-id={node.id}
                    aria-pressed={node.id === selectedNode?.id}
                    onClick={() => setSelectedId(node.id === selectedNode?.id ? null : node.id)}
                    className="w-full rounded-control border-2 border-foreground bg-canvas p-3 text-left transition-colors hover:bg-attention/20 aria-pressed:bg-attention/20"
                  >
                    <span className={`mb-2 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${catClass(node.category)}`}>
                      {node.category}
                    </span>
                    <span className="block text-sm font-semibold text-foreground">
                      {node.label}
                    </span>
                    <span className="mt-1 block text-xs text-secondary">
                      {node.episodeCount} episode{node.episodeCount !== 1 ? "s" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section role="region" aria-label="Connection edges" className="mt-6">
            <h2 className="mb-2 font-heading text-xl font-bold lowercase text-foreground">strongest links</h2>
            <ul className="space-y-2" data-testid="graph-edge-list">
              {strongestEdges.map((edge) => {
                const a = data.nodes.find((node) => node.id === edge.a)?.label ?? edge.a;
                const b = data.nodes.find((node) => node.id === edge.b)?.label ?? edge.b;
                return (
                  <li
                    key={`${edge.a}-${edge.b}`}
                    data-testid={`graph-edge-${edge.a}-${edge.b}`}
                    data-edge-key={`${edge.a}-${edge.b}`}
                    className="rounded-control border border-foreground/20 bg-canvas px-3 py-2 text-xs text-secondary"
                  >
                    <span className="font-semibold text-foreground">{a}</span> +{" "}
                    <span className="font-semibold text-foreground">{b}</span>{" "}
                    ({edge.shared} shared)
                  </li>
                );
              })}
            </ul>
          </section>

          {selectedNode ? (
            <section
              role="region"
              aria-label={`Details for ${selectedNode.label}`}
              data-testid="graph-selection-detail"
              className="mt-6 space-y-3 border-t-2 border-foreground pt-5"
            >
              <div>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                  selected idea
                </p>
                <h2 className="mt-1 font-heading text-2xl font-bold lowercase text-foreground">
                  {selectedNode.label}
                </h2>
              </div>
              <div className="space-y-2">
                {selectedNode.episodes.map((episodeId) => (
                  <Link
                    key={episodeId}
                    href={`/episodes/${encodeURIComponent(episodeId)}`}
                    data-testid={`graph-episode-link-${episodeId}`}
                    data-episode-id={episodeId}
                    className="block rounded-control border border-foreground/20 bg-canvas px-3 py-2 text-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:bg-surface-subtle"
                  >
                    {connections.titles[episodeId] ?? "published episode"}
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-6 border-t-2 border-foreground pt-5">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                select an idea
              </p>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Pick a node in the graph or the list to see the episodes behind
                that recurring idea.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
