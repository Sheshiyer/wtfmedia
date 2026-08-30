"use client";

import { useMemo, useState } from "react";
import { connections } from "@/lib/connections";
import { normalizeConnectionsData, type PublicConnectionNode } from "@/lib/public/connections";
import { ConnectionGraph } from "@/components/ConnectionGraph";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

type CategoryTone = "knowledge" | "information" | "attention" | "editorial" | "structure";

const COMPACT_LIST_SIZE = 8;

function categoryTone(category: string): CategoryTone {
  const value = category.toLowerCase();
  if (value.includes("ai") || value.includes("tech") || value.includes("mind") || value.includes("philos")) return "knowledge";
  if (value.includes("india")) return "attention";
  if (value.includes("geo") || value.includes("society")) return "editorial";
  if (value.includes("business") || value.includes("media") || value.includes("culture") || value.includes("science")) return "information";
  return "structure";
}

const toneClasses: Record<CategoryTone, string> = {
  knowledge: "border-knowledge bg-knowledge text-on-knowledge",
  information: "border-information bg-information text-on-information",
  attention: "border-attention bg-attention text-on-attention",
  editorial: "border-editorial bg-editorial text-on-editorial",
  structure: "border-foreground bg-surface-structure text-on-structure",
};

/**
 * Public idea atlas. The graph is an expressive view; the adjacent index and
 * source receipt are the accessible, factual reading of the same projection.
 */
export default function MigratedConnectionsPage() {
  const data = useMemo(() => normalizeConnectionsData(connections), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ideasExpanded, setIdeasExpanded] = useState(false);
  const [overlapsExpanded, setOverlapsExpanded] = useState(false);

  const visibleNodes = data.nodes.filter((node) => {
    const normalized = `${node.label} ${node.category}`.toLowerCase();
    return normalized.includes(query.trim().toLowerCase());
  });
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = data.edges.filter((edge) => visibleIds.has(edge.a) && visibleIds.has(edge.b));
  const selectedNode = data.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdges = selectedNode
    ? data.edges.filter((edge) => edge.a === selectedNode.id || edge.b === selectedNode.id)
    : data.edges;
  const displayedNodes = ideasExpanded ? visibleNodes : visibleNodes.slice(0, COMPACT_LIST_SIZE);
  const displayedEdges = overlapsExpanded ? selectedEdges : selectedEdges.slice(0, COMPACT_LIST_SIZE);

  const selectNode = (id: string | null) => {
    if (!id) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => (current === id ? null : id));
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <WorkspaceHeader
        eyebrow="recurring ideas"
        title="connections"
        summary="ideas that keep showing up across episodes. a mention is not a person, a job, or a relationship."
        accent="information"
        context={
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>{data.nodes.length} ideas</span>
            <span>{data.edges.length} shared-episode links</span>
          </div>
        }
      />

      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-8 sm:px-8 xl:px-12 xl:py-12">
        <section className="grid gap-4 border-2 border-foreground bg-surface-raised p-4 shadow-[var(--wtf-depth-card-offset)_var(--wtf-depth-card-offset)_0_0_rgb(var(--wtf-foreground-rgb)_/_0.18)] sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-[var(--wtf-measure-reading)] space-y-1">
              <p className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-secondary">atlas view</p>
              <h2 className="font-display text-[clamp(1.75rem,4vw,3.5rem)] leading-[0.95] text-foreground">follow an idea, then inspect its sources.</h2>
            </div>
            <label className="grid min-w-[min(100%,20rem)] gap-1 font-label text-sm font-bold lowercase text-foreground">
              filter ideas
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="technology, culture, philosophy…"
                className="min-h-11 border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
              />
            </label>
          </div>

          <div aria-hidden="true" tabIndex={-1} data-testid="graph-canvas">
            <ConnectionGraph nodes={visibleNodes} edges={visibleEdges} titles={connections.titles} selectedId={selectedId} onSelect={selectNode} />
          </div>
          <p className="font-label text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-secondary">
            select an idea to inspect published source receipts
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(16rem,0.82fr)_minmax(20rem,1.18fr)]">
          <section role="region" aria-label="Connection nodes" className="border-2 border-foreground bg-surface-raised p-4 sm:p-5">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl text-foreground">idea index</h2>
              <span className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-secondary">{visibleNodes.length} visible</span>
            </div>
            <ul id="connection-idea-list" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1" data-testid="graph-node-list">
              {displayedNodes.map((node) => (
                <li key={node.id}><IdeaButton node={node} selected={node.id === selectedId} onSelect={(id) => selectNode(id)} /></li>
              ))}
            </ul>
            <CompactListToggle
              controls="connection-idea-list"
              expanded={ideasExpanded}
              label="ideas"
              total={visibleNodes.length}
              onToggle={() => setIdeasExpanded((current) => !current)}
            />
            {visibleNodes.length === 0 && <p className="border-2 border-dashed border-foreground/35 p-4 text-sm text-secondary">No public idea matches that filter.</p>}
          </section>

          <section className="border-2 border-foreground bg-surface-raised p-4 sm:p-5" aria-live="polite">
            {selectedNode ? (
              <SourceReceipt key={selectedNode.id} node={selectedNode} edges={selectedEdges} nodes={data.nodes} />
            ) : (
              <div className="grid min-h-64 place-items-center border-2 border-dashed border-foreground/35 bg-surface-subtle p-6 text-center">
                <div className="max-w-[42ch] space-y-3">
                  <p className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-secondary">source receipt</p>
                  <h2 className="font-display text-3xl leading-none text-foreground">Choose an idea.</h2>
                  <p className="text-sm leading-relaxed text-secondary">The receipt will show only its public episode count, directly overlapping ideas, and published source links.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <section aria-label="connection overlaps" className="border-t-2 border-foreground/25 pt-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl text-foreground">visible overlaps</h2>
            <p className="text-sm text-secondary">Each line names an overlap from the same public atlas; no ranking is inferred.</p>
          </div>
          <ul id="connection-overlap-list" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="graph-edge-list">
            {displayedEdges.map((edge) => {
              const first = data.nodes.find((node) => node.id === edge.a)?.label ?? edge.a;
              const second = data.nodes.find((node) => node.id === edge.b)?.label ?? edge.b;
              return (
                <li key={`${edge.a}-${edge.b}`} data-testid={`graph-edge-${edge.a}-${edge.b}`} data-edge-key={`${edge.a}-${edge.b}`} className="border-l-4 border-information bg-surface-subtle px-3 py-2 text-sm text-foreground">
                  <span className="font-bold">{first}</span> + <span className="font-bold">{second}</span>
                  <span className="ml-2 text-secondary">{edge.shared} shared episode{edge.shared === 1 ? "" : "s"}</span>
                </li>
              );
            })}
          </ul>
          <CompactListToggle
            controls="connection-overlap-list"
            expanded={overlapsExpanded}
            label="overlaps"
            total={selectedEdges.length}
            onToggle={() => setOverlapsExpanded((current) => !current)}
          />
        </section>
      </div>
    </div>
  );
}

function CompactListToggle({
  controls,
  expanded,
  label,
  total,
  onToggle,
}: {
  controls: string;
  expanded: boolean;
  label: string;
  total: number;
  onToggle: () => void;
}) {
  if (total <= COMPACT_LIST_SIZE) return null;

  const accessibleLabel = expanded
    ? `show fewer ${label}`
    : `show ${total - COMPACT_LIST_SIZE} more ${label}`;

  return (
    <button
      type="button"
      aria-controls={controls}
      aria-expanded={expanded}
      onClick={onToggle}
      className="mt-4 inline-flex min-h-11 items-center border-2 border-foreground bg-canvas px-3 font-label text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
    >
      {accessibleLabel}
    </button>
  );
}

function IdeaButton({ node, selected, onSelect }: { node: PublicConnectionNode; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      data-testid={`graph-node-${node.id}`}
      data-node-id={node.id}
      aria-pressed={selected}
      onClick={() => onSelect(node.id)}
      className={[
        "w-full border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised",
        selected ? "border-information bg-information text-on-information" : "border-foreground bg-canvas text-foreground hover:bg-attention",
      ].join(" ")}
    >
      <span className="block font-label text-[0.6875rem] font-bold uppercase tracking-[0.1em] opacity-75">{node.category}</span>
      <span className="mt-1 block font-label text-sm font-bold lowercase">{node.label}</span>
      <span className="mt-1 block text-xs opacity-80">{node.episodeCount} public episode{node.episodeCount === 1 ? "" : "s"}</span>
    </button>
  );
}

function SourceReceipt({ node, edges, nodes }: { node: PublicConnectionNode; edges: ReturnType<typeof normalizeConnectionsData>["edges"]; nodes: PublicConnectionNode[] }) {
  const [directOverlapsExpanded, setDirectOverlapsExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const adjacent = edges.map((edge) => {
    const adjacentId = edge.a === node.id ? edge.b : edge.a;
    return { node: nodes.find((item) => item.id === adjacentId), shared: edge.shared };
  }).filter((item): item is { node: PublicConnectionNode; shared: number } => Boolean(item.node));
  const displayedAdjacent = directOverlapsExpanded ? adjacent : adjacent.slice(0, COMPACT_LIST_SIZE);
  const displayedSources = sourcesExpanded ? node.episodes : node.episodes.slice(0, COMPACT_LIST_SIZE);

  return (
    <div data-testid="graph-selection-detail" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-secondary">public source receipt</p>
          <h2 className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-[0.9] text-foreground">{node.label}</h2>
        </div>
        <span className={`border-2 px-2 py-1 font-label text-[0.6875rem] font-bold uppercase tracking-[0.1em] ${toneClasses[categoryTone(node.category)]}`}>{node.category}</span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="border-2 border-foreground bg-canvas p-3">
          <dt className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-secondary">public episode mentions</dt>
          <dd className="mt-1 font-display text-3xl text-foreground">{node.episodeCount}</dd>
        </div>
        <div className="border-2 border-foreground bg-canvas p-3">
          <dt className="font-label text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-secondary">direct atlas overlaps</dt>
          <dd className="mt-1 font-display text-3xl text-foreground">{adjacent.length}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <h3 className="font-label text-sm font-bold lowercase text-foreground">direct overlaps</h3>
        {adjacent.length > 0 ? (
          <>
            <ul id="connection-direct-overlap-list" className="flex flex-wrap gap-2">
              {displayedAdjacent.map((item) => <li key={item.node.id} className="border-2 border-information bg-surface-subtle px-2 py-1 text-sm text-foreground">{item.node.label} <span className="text-secondary">· {item.shared}</span></li>)}
            </ul>
            <CompactListToggle
              controls="connection-direct-overlap-list"
              expanded={directOverlapsExpanded}
              label="direct overlaps"
              total={adjacent.length}
              onToggle={() => setDirectOverlapsExpanded((current) => !current)}
            />
          </>
        ) : <p className="text-sm text-secondary">No direct public overlap is recorded for this idea.</p>}
      </div>

      <div className="space-y-2">
        <h3 className="font-label text-sm font-bold lowercase text-foreground">published sources</h3>
        <ul id="connection-published-source-list" className="grid gap-2 sm:grid-cols-2">
          {displayedSources.map((videoId) => (
            <li key={videoId}>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                data-testid={`graph-episode-link-${videoId}`}
                data-episode-id={videoId}
                className="block min-h-11 border-2 border-foreground bg-canvas px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
              >
                {connections.titles[videoId] ?? videoId}
              </a>
            </li>
          ))}
        </ul>
        <CompactListToggle
          controls="connection-published-source-list"
          expanded={sourcesExpanded}
          label="published sources"
          total={node.episodes.length}
          onToggle={() => setSourcesExpanded((current) => !current)}
        />
      </div>
    </div>
  );
}
