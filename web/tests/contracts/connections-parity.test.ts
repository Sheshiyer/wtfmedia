import { describe, it, expect } from "vitest";
import {
  normalizeConnectionsData,
  type PublicConnectionNode,
  type PublicConnectionEdge,
} from "../../lib/public/connections";
import { connections } from "../../lib/connections";

/**
 * Connections parity tests (Plan 01-14, Task 1).
 *
 * Verify that the public projection produces stable IDs, edge keys,
 * labels, counts, and source links that the GraphWithList pattern
 * can consume without mutation.
 */

describe("connections parity — projection stability", () => {
  const data = normalizeConnectionsData(connections);

  it("every node has a non-empty stable id", () => {
    for (const node of data.nodes) {
      expect(node.id).toBeTruthy();
      expect(typeof node.id).toBe("string");
      expect(node.id.length).toBeGreaterThan(0);
    }
  });

  it("every node has a non-empty label", () => {
    for (const node of data.nodes) {
      expect(node.label).toBeTruthy();
      expect(typeof node.label).toBe("string");
    }
  });

  it("every node has a positive episodeCount", () => {
    for (const node of data.nodes) {
      expect(node.episodeCount).toBeGreaterThan(0);
    }
  });

  it("every node has a non-empty episodes array", () => {
    for (const node of data.nodes) {
      expect(Array.isArray(node.episodes)).toBe(true);
      expect(node.episodes.length).toBeGreaterThan(0);
    }
  });

  it("every episode ID is a non-empty string", () => {
    for (const node of data.nodes) {
      for (const ep of node.episodes) {
        expect(typeof ep).toBe("string");
        expect(ep.length).toBeGreaterThan(0);
      }
    }
  });

  it("node IDs are unique", () => {
    const ids = data.nodes.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every edge has valid a and b references to existing node IDs", () => {
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    for (const edge of data.edges) {
      expect(nodeIds.has(edge.a)).toBe(true);
      expect(nodeIds.has(edge.b)).toBe(true);
    }
  });

  it("every edge has a positive shared count", () => {
    for (const edge of data.edges) {
      expect(edge.shared).toBeGreaterThan(0);
    }
  });

  it("edge keys (a-b) are unique", () => {
    const keys = data.edges.map((e) => `${e.a}-${e.b}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("every node category is a non-empty string", () => {
    for (const node of data.nodes) {
      expect(typeof node.category).toBe("string");
      expect(node.category.length).toBeGreaterThan(0);
    }
  });

  it("projection contains no operator vocabulary", () => {
    const json = JSON.stringify(data);
    const forbidden = [
      "tasks",
      "owners",
      "leads",
      "budgets",
      "briefs",
      "health",
      "production",
      "permissions",
      "credentials",
    ];
    for (const word of forbidden) {
      expect(json.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

describe("connections parity — graph/list contract", () => {
  const data = normalizeConnectionsData(connections);

  it("GraphWithList can derive edge display labels from node lookup", () => {
    for (const edge of data.edges) {
      const la = data.nodes.find((n) => n.id === edge.a)?.label;
      const lb = data.nodes.find((n) => n.id === edge.b)?.label;
      expect(la).toBeTruthy();
      expect(lb).toBeTruthy();
    }
  });

  it("GraphWithList can derive episode source links from node episodes", () => {
    for (const node of data.nodes) {
      for (const ep of node.episodes) {
        const url = `https://www.youtube.com/watch?v=${ep}`;
        expect(url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      }
    }
  });

  it("node count matches sum of established + emerging from raw data", () => {
    const rawEstablished = connections.established.length;
    const rawEmerging = connections.emerging.length;
    expect(data.nodes.length).toBe(rawEstablished + rawEmerging);
  });

  it("edge count matches raw data", () => {
    expect(data.edges.length).toBe(connections.edges.length);
  });

  it("overlap count matches raw data", () => {
    expect(data.overlaps.length).toBe(connections.overlaps.length);
  });
});
