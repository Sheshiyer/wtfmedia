/**
 * Public projection privacy contract for episode and connection data.
 *
 * Proves the real on-disk web/src/data/episodes.json and connections.json
 * expose only allowlisted public fields (web/lib/public/contracts.ts) and
 * never carry the forbidden operator/private vocabulary. Reads the files
 * directly from disk (not via require/import) so the assertions bind to
 * what is actually shipped, not a cached module snapshot.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PUBLIC_FIELDS,
  PUBLIC_CONNECTIONS_DATA_FIELDS,
  PUBLIC_CONNECTION_EDGE_FIELDS,
  PUBLIC_CONNECTION_NODE_FIELDS,
  PUBLIC_CONNECTION_OVERLAP_FIELDS,
  PUBLIC_EPISODES_PAYLOAD_FIELDS,
  PUBLIC_EPISODE_FIELDS,
  findDisallowedFields,
  findForbiddenFields,
} from "@/lib/public/contracts";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(here, "../..");

function readJson(relPath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(WEB_ROOT, relPath), "utf8"));
}

describe("public-projection contract — episodes.json", () => {
  const episodes = readJson("src/data/episodes.json") as Record<string, unknown> & {
    entries: Record<string, unknown>[];
  };

  it("exposes only allowlisted top-level fields", () => {
    expect(findDisallowedFields(episodes, PUBLIC_EPISODES_PAYLOAD_FIELDS)).toEqual([]);
  });

  it("exposes only allowlisted fields on every entry", () => {
    for (const entry of episodes.entries) {
      expect(findDisallowedFields(entry, PUBLIC_EPISODE_FIELDS)).toEqual([]);
    }
  });

  it("has no forbidden operator/private field name anywhere in the payload", () => {
    expect(findForbiddenFields(episodes)).toEqual([]);
  });

  it("detects an injected forbidden field on a cloned entry", () => {
    const tainted = structuredClone(episodes);
    (tainted.entries[0] as Record<string, unknown>).owners = ["someone@example.test"];
    const hits = findForbiddenFields(tainted);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.includes("owners"))).toBe(true);
  });
});

describe("public-projection contract — connections.json", () => {
  const connections = readJson("src/data/connections.json") as Record<string, unknown> & {
    established: Record<string, unknown>[];
    emerging: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    overlaps: Record<string, unknown>[];
  };

  it("exposes only allowlisted top-level fields", () => {
    expect(findDisallowedFields(connections, PUBLIC_CONNECTIONS_DATA_FIELDS)).toEqual([]);
  });

  it("exposes only allowlisted fields on every established/emerging node", () => {
    for (const node of [...connections.established, ...connections.emerging]) {
      expect(findDisallowedFields(node, PUBLIC_CONNECTION_NODE_FIELDS)).toEqual([]);
    }
  });

  it("exposes only allowlisted fields on every edge", () => {
    for (const edge of connections.edges) {
      expect(findDisallowedFields(edge, PUBLIC_CONNECTION_EDGE_FIELDS)).toEqual([]);
    }
  });

  it("exposes only allowlisted fields on every overlap", () => {
    for (const overlap of connections.overlaps) {
      expect(findDisallowedFields(overlap, PUBLIC_CONNECTION_OVERLAP_FIELDS)).toEqual([]);
    }
  });

  it("has no forbidden operator/private field name anywhere in the payload", () => {
    expect(findForbiddenFields(connections)).toEqual([]);
  });

  it("detects an injected forbidden field on a cloned node", () => {
    const tainted = structuredClone(connections);
    (tainted.established[0] as Record<string, unknown>).budgets = 1000;
    const hits = findForbiddenFields(tainted);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.includes("budgets"))).toBe(true);
  });
});

describe("public-projection contract — forbidden vocabulary", () => {
  it("includes the plan's explicitly required forbidden field names", () => {
    const required = ["tasks", "owners", "leads", "budgets", "briefs", "health", "production", "permissions"];
    for (const name of required) {
      expect(FORBIDDEN_PUBLIC_FIELDS).toContain(name);
    }
  });
});
