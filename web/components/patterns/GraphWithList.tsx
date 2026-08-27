"use client";

import { useState, useCallback, type ReactNode } from "react";

/**
 * GraphWithList — shared-selection pattern (Plan 01-14).
 *
 * Wraps an expressive canvas (aria-hidden, non-tabbable) with an equivalent
 * semantic list so keyboard and screen-reader users get full parity.
 *
 * Selection state is public: the parent owns the selected ID and can
 * lift it into URL state or analytics if needed.
 */

export type GraphNode = {
  id: string;
  label: string;
  category: string;
  episodeCount: number;
  episodes: string[];
};

export type GraphEdge = {
  a: string;
  b: string;
  shared: number;
};

export type GraphWithListProps = {
  /** Normalised projection nodes. */
  nodes: GraphNode[];
  /** Normalised projection edges. */
  edges: GraphEdge[];
  /** Currently selected node ID (public state). */
  selectedId: string | null;
  /** Selection change handler (public state). */
  onSelect: (id: string | null) => void;
  /** Canvas slot — receives pointer events but is aria-hidden. */
  canvas: ReactNode;
  /** Optional class on the outer wrapper. */
  className?: string;
};

export function GraphWithList({
  nodes,
  edges,
  selectedId,
  onSelect,
  canvas,
  className,
}: GraphWithListProps) {
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id === selectedId ? null : id);
    },
    [onSelect, selectedId],
  );

  return (
    <div className={className}>
      {/* Expressive canvas — decorative, not keyboard-reachable */}
      <div aria-hidden="true" tabIndex={-1} data-testid="graph-canvas">
        {canvas}
      </div>

      {/* Semantic node list */}
      <div role="region" aria-label="Connection nodes">
        <ul className="space-y-2" data-testid="graph-node-list">
          {nodes.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                data-testid={`graph-node-${node.id}`}
                data-node-id={node.id}
                aria-pressed={node.id === selectedId}
                onClick={() => handleSelect(node.id)}
                className="w-full text-left rounded-lg border-2 border-ink bg-cream p-3 space-y-1 hover:bg-wtf-yellow transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink/61">{node.category}</span>
                  <span className="text-sm font-semibold text-ink">
                    {node.label}
                  </span>
                </div>
                <div className="text-xs text-ink/61">
                  {node.episodeCount} episode
                  {node.episodeCount !== 1 ? "s" : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Semantic edge list */}
      <div role="region" aria-label="Connection edges" className="mt-4">
        <ul className="space-y-1" data-testid="graph-edge-list">
          {edges.map((edge) => {
            const la = nodes.find((n) => n.id === edge.a)?.label ?? edge.a;
            const lb = nodes.find((n) => n.id === edge.b)?.label ?? edge.b;
            return (
              <li
                key={`${edge.a}-${edge.b}`}
                data-testid={`graph-edge-${edge.a}-${edge.b}`}
                data-edge-key={`${edge.a}-${edge.b}`}
                className="text-xs text-ink/61"
              >
                {la} + {lb} ({edge.shared} shared)
              </li>
            );
          })}
        </ul>
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div
          role="region"
          aria-label={`Details for ${selectedNode.label}`}
          data-testid="graph-selection-detail"
          className="mt-4 rounded-lg border-2 border-ink bg-cream p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/61">
              {selectedNode.category}
            </span>
            <span className="text-lg font-bold text-ink">
              {selectedNode.label}
            </span>
          </div>
          <div className="text-sm text-ink/61">
            {selectedNode.episodeCount} episode
            {selectedNode.episodeCount !== 1 ? "s" : ""}
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedNode.episodes.map((vid) => (
              <a
                key={vid}
                href={`https://www.youtube.com/watch?v=${vid}`}
                target="_blank"
                rel="noreferrer"
                data-testid={`graph-episode-link-${vid}`}
                data-episode-id={vid}
                className="text-xs px-2 py-1 rounded bg-ink/5 hover:bg-wtf-yellow transition-colors"
              >
                {vid}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
