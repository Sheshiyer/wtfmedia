/**
 * Public projection for Connections data (Plan 01-13).
 *
 * Exposes: stable node ID, label, category, episode count/IDs/public links,
 * and edge endpoints/shared count only.
 *
 * No operator permissions, interaction state, tasks, owners, leads, budgets,
 * briefs, health, or production fields may enter the projection.
 */

import {
  PUBLIC_CONNECTIONS_DATA_FIELDS,
  PUBLIC_CONNECTION_NODE_FIELDS,
  PUBLIC_CONNECTION_EDGE_FIELDS,
  PUBLIC_CONNECTION_OVERLAP_FIELDS,
  FORBIDDEN_PUBLIC_FIELDS,
  findDisallowedFields,
  findForbiddenFields,
} from "./contracts";
import type { ConnectionsData } from "@/lib/connections";

// ─── Public types ─────────────────────────────────────────────────────

export type PublicConnectionNode = {
  id: string;
  label: string;
  category: string;
  episodeCount: number;
  episodes: string[];
};

export type PublicConnectionEdge = {
  a: string;
  b: string;
  shared: number;
};

export type PublicConnectionOverlap = {
  a: string;
  b: string;
  shared: number;
};

export type PublicConnectionsData = {
  nodes: PublicConnectionNode[];
  edges: PublicConnectionEdge[];
  overlaps: PublicConnectionOverlap[];
};

// ─── Normalization ────────────────────────────────────────────────────

/**
 * Strip a raw connections node to its public projection.
 * Only the fields declared in PUBLIC_CONNECTION_NODE_FIELDS survive.
 */
export function normalizeConnectionNode(
  raw: Record<string, unknown>
): PublicConnectionNode {
  const out: Record<string, unknown> = {};
  for (const field of PUBLIC_CONNECTION_NODE_FIELDS) {
    if (field in raw) out[field] = raw[field];
  }
  return out as PublicConnectionNode;
}

/**
 * Strip a raw edge to its public projection.
 */
export function normalizeConnectionEdge(
  raw: Record<string, unknown>
): PublicConnectionEdge {
  const out: Record<string, unknown> = {};
  for (const field of PUBLIC_CONNECTION_EDGE_FIELDS) {
    if (field in raw) out[field] = raw[field];
  }
  return out as PublicConnectionEdge;
}

/**
 * Strip a raw overlap to its public projection.
 */
export function normalizeConnectionOverlap(
  raw: Record<string, unknown>
): PublicConnectionOverlap {
  const out: Record<string, unknown> = {};
  for (const field of PUBLIC_CONNECTION_OVERLAP_FIELDS) {
    if (field in raw) out[field] = raw[field];
  }
  return out as PublicConnectionOverlap;
}

/**
 * Normalize the full connections data into its public projection.
 * Validates that no disallowed or forbidden fields survive.
 *
 * @throws {Error} if disallowed or forbidden fields are detected after normalization.
 */
export function normalizeConnectionsData(
  raw: ConnectionsData
): PublicConnectionsData {
  // Merge established + emerging into a single nodes array
  const allNodes = [
    ...(raw.established || []),
    ...(raw.emerging || []),
  ];
  const nodes = allNodes.map((n) =>
    normalizeConnectionNode(n as unknown as Record<string, unknown>)
  );
  const edges = raw.edges.map((e) =>
    normalizeConnectionEdge(e as unknown as Record<string, unknown>)
  );
  const overlaps = (raw.overlaps || []).map((o) =>
    normalizeConnectionOverlap(o as unknown as Record<string, unknown>)
  );

  // Validate: no disallowed fields on any node
  for (const node of nodes) {
    const disallowed = findDisallowedFields(
      node as unknown as Record<string, unknown>,
      PUBLIC_CONNECTION_NODE_FIELDS
    );
    if (disallowed.length > 0) {
      throw new Error(
        `[connections-projection] Disallowed fields on node: ${disallowed.join(", ")}`
      );
    }
    const forbidden = findForbiddenFields(node, "node");
    if (forbidden.length > 0) {
      throw new Error(
        `[connections-projection] Forbidden vocabulary on node: ${forbidden.join(", ")}`
      );
    }
  }

  // Validate: no disallowed fields on any edge
  for (const edge of edges) {
    const disallowed = findDisallowedFields(
      edge as unknown as Record<string, unknown>,
      PUBLIC_CONNECTION_EDGE_FIELDS
    );
    if (disallowed.length > 0) {
      throw new Error(
        `[connections-projection] Disallowed fields on edge: ${disallowed.join(", ")}`
      );
    }
  }

  // Validate: no disallowed fields on any overlap
  for (const overlap of overlaps) {
    const disallowed = findDisallowedFields(
      overlap as unknown as Record<string, unknown>,
      PUBLIC_CONNECTION_OVERLAP_FIELDS
    );
    if (disallowed.length > 0) {
      throw new Error(
        `[connections-projection] Disallowed fields on overlap: ${disallowed.join(", ")}`
      );
    }
  }

  return { nodes, edges, overlaps };
}
