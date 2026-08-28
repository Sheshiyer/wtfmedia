import { describe, it, expect } from "vitest";
import {
  normalizeConnectionsData,
  normalizeConnectionNode,
  normalizeConnectionEdge,
  normalizeConnectionOverlap,
} from "../../lib/public/connections";
import {
  PUBLIC_CONNECTIONS_DATA_FIELDS,
  PUBLIC_CONNECTION_NODE_FIELDS,
  PUBLIC_CONNECTION_EDGE_FIELDS,
  PUBLIC_CONNECTION_OVERLAP_FIELDS,
  FORBIDDEN_PUBLIC_FIELDS,
} from "../../lib/public/contracts";

describe("connections public projection", () => {
  // ─── Allowlist field sets ────────────────────────────────────────────

  it("PUBLIC_CONNECTIONS_DATA_FIELDS contains exactly nodes, edges, overlaps, threshold, emergingMin, totalEpisodes, categories, established, emerging, titles", () => {
    expect(PUBLIC_CONNECTIONS_DATA_FIELDS).toEqual([
      "nodes",
      "edges",
      "overlaps",
      "threshold",
      "emergingMin",
      "totalEpisodes",
      "categories",
      "established",
      "emerging",
      "titles",
    ]);
  });

  it("PUBLIC_CONNECTION_NODE_FIELDS contains exactly id, label, category, episodeCount, episodes, mentions", () => {
    expect(PUBLIC_CONNECTION_NODE_FIELDS).toEqual([
      "id",
      "label",
      "category",
      "episodeCount",
      "episodes",
      "mentions",
    ]);
  });

  it("PUBLIC_CONNECTION_EDGE_FIELDS contains exactly a, b, shared, episodes", () => {
    expect(PUBLIC_CONNECTION_EDGE_FIELDS).toEqual(["a", "b", "shared", "episodes"]);
  });

  it("PUBLIC_CONNECTION_OVERLAP_FIELDS contains exactly a, b, shared", () => {
    expect(PUBLIC_CONNECTION_OVERLAP_FIELDS).toEqual(["a", "b", "shared"]);
  });

  // ─── Node normalization ─────────────────────────────────────────────

  it("normalizeConnectionNode strips extra fields", () => {
    const raw = {
      id: "n1",
      label: "AI",
      category: "tech",
      episodeCount: 5,
      episodes: ["vid1", "vid2"],
      mentions: 10,
      // extra fields that must be stripped
      tasks: ["t1"],
      owners: ["alice"],
      leads: ["bob"],
      budgets: 1000,
      briefs: "secret",
      health: "green",
      production: "live",
      permissions: ["admin"],
      credentials: "token",
      internalNote: "do not expose",
    };
    const result = normalizeConnectionNode(raw);
    expect(result).toEqual({
      id: "n1",
      label: "AI",
      category: "tech",
      episodeCount: 5,
      episodes: ["vid1", "vid2"],
      mentions: 10,
    });
    expect(result).not.toHaveProperty("tasks");
    expect(result).not.toHaveProperty("owners");
    expect(result).not.toHaveProperty("leads");
    expect(result).not.toHaveProperty("budgets");
    expect(result).not.toHaveProperty("briefs");
    expect(result).not.toHaveProperty("health");
    expect(result).not.toHaveProperty("production");
    expect(result).not.toHaveProperty("permissions");
    expect(result).not.toHaveProperty("credentials");
    expect(result).not.toHaveProperty("internalNote");
  });

  it("normalizeConnectionNode preserves only allowlisted fields", () => {
    const raw = {
      id: "n2",
      label: "Startups",
      category: "business",
      episodeCount: 3,
      episodes: ["a", "b", "c"],
      mentions: 7,
    };
    const result = normalizeConnectionNode(raw);
    const keys = Object.keys(result);
    for (const key of keys) {
      expect(PUBLIC_CONNECTION_NODE_FIELDS).toContain(key);
    }
  });

  // ─── Edge normalization ─────────────────────────────────────────────

  it("normalizeConnectionEdge strips extra fields", () => {
    const raw = {
      a: "n1",
      b: "n2",
      shared: 4,
      weight: 0.8,
      internalScore: 42,
    };
    const result = normalizeConnectionEdge(raw);
    expect(result).toEqual({ a: "n1", b: "n2", shared: 4 });
    expect(result).not.toHaveProperty("weight");
    expect(result).not.toHaveProperty("internalScore");
  });

  // ─── Overlap normalization ──────────────────────────────────────────

  it("normalizeConnectionOverlap strips extra fields", () => {
    const raw = {
      a: "tech",
      b: "business",
      shared: 7,
      score: 0.95,
    };
    const result = normalizeConnectionOverlap(raw);
    expect(result).toEqual({ a: "tech", b: "business", shared: 7 });
    expect(result).not.toHaveProperty("score");
  });

  // ─── Full data normalization ────────────────────────────────────────

  it("normalizeConnectionsData produces a valid public projection from raw data", () => {
    const raw = {
      threshold: 2,
      emergingMin: 1,
      totalEpisodes: 10,
      categories: [],
      established: [
        {
          id: "n1",
          label: "AI",
          category: "tech",
          episodeCount: 5,
          episodes: ["vid1"],
          mentions: 3,
          tasks: ["t1"],
          owners: ["alice"],
        },
      ],
      emerging: [],
      edges: [{ a: "n1", b: "n2", shared: 3, weight: 0.5, episodes: ["vid1"] }],
      overlaps: [{ a: "tech", b: "business", shared: 2, score: 0.8 }],
      titles: {},
    };
    const result = normalizeConnectionsData(raw as any);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: "n1",
      label: "AI",
      category: "tech",
      episodeCount: 5,
      episodes: ["vid1"],
      mentions: 3,
    });
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toEqual({ a: "n1", b: "n2", shared: 3, episodes: ["vid1"] });
    expect(result.overlaps).toHaveLength(1);
    expect(result.overlaps[0]).toEqual({ a: "tech", b: "business", shared: 2 });
  });

  // ─── Forbidden vocabulary ───────────────────────────────────────────

  it("no public node field name matches FORBIDDEN_PUBLIC_FIELDS", () => {
    for (const field of PUBLIC_CONNECTION_NODE_FIELDS) {
      expect(FORBIDDEN_PUBLIC_FIELDS).not.toContain(field);
    }
  });

  it("no public edge field name matches FORBIDDEN_PUBLIC_FIELDS", () => {
    for (const field of PUBLIC_CONNECTION_EDGE_FIELDS) {
      expect(FORBIDDEN_PUBLIC_FIELDS).not.toContain(field);
    }
  });

  it("no public overlap field name matches FORBIDDEN_PUBLIC_FIELDS", () => {
    for (const field of PUBLIC_CONNECTION_OVERLAP_FIELDS) {
      expect(FORBIDDEN_PUBLIC_FIELDS).not.toContain(field);
    }
  });

  // ─── No operator vocabulary leaks ───────────────────────────────────

  it("normalized output contains no forbidden vocabulary at any path", () => {
    const raw = {
      threshold: 2,
      emergingMin: 1,
      totalEpisodes: 10,
      categories: [],
      established: [
        {
          id: "n1",
          label: "AI",
          category: "tech",
          episodeCount: 5,
          episodes: ["vid1"],
          mentions: 3,
          tasks: ["t1"],
          owners: ["alice"],
          leads: ["bob"],
          budgets: 1000,
          briefs: "secret",
          health: "green",
          production: "live",
          permissions: ["admin"],
          credentials: "token",
        },
      ],
      emerging: [],
      edges: [{ a: "n1", b: "n2", shared: 3 }],
      overlaps: [],
      titles: {},
    };
    const result = normalizeConnectionsData(raw as any);
    const json = JSON.stringify(result);
    for (const word of FORBIDDEN_PUBLIC_FIELDS) {
      expect(json.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  // ─── Real data smoke test ───────────────────────────────────────────

  it("normalizes real connections.json without throwing", async () => {
    const { connections } = await import("../../lib/connections");
    const result = normalizeConnectionsData(connections);
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
    // Every node has only allowlisted fields
    for (const node of result.nodes) {
      const keys = Object.keys(node);
      for (const key of keys) {
        expect(PUBLIC_CONNECTION_NODE_FIELDS).toContain(key);
      }
    }
    // Every edge has only allowlisted fields
    for (const edge of result.edges) {
      const keys = Object.keys(edge);
      for (const key of keys) {
        expect(PUBLIC_CONNECTION_EDGE_FIELDS).toContain(key);
      }
    }
  });
});
