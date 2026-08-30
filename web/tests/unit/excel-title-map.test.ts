import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  QUARANTINED_TRANSCRIPT_TITLES,
  catalogueSheetPairs,
  mapCatalogueTitles,
  parseTitleMapTable,
  type SnapshotSheet,
} from "@/lib/catalogue/excel-title-map";
import { loadTitleMap } from "@/lib/catalogue/load-title-map";

const snapshotRoot = resolve(process.cwd(), "../.planning/inputs/podcast-catalog/2026-08-27");

function loadSheet(kind: "internal" | "transcripts", slug: string, sheet: string): SnapshotSheet {
  const data = JSON.parse(
    readFileSync(resolve(snapshotRoot, kind, `${slug}.json`), "utf8"),
  ) as { records: SnapshotSheet["records"] };
  return { sheet, records: data.records };
}

describe("excel snapshot title map", () => {
  const table = mapCatalogueTitles({
    snapshotAt: "2026-08-27",
    internal: catalogueSheetPairs().map((pair) =>
      loadSheet("internal", pair.internal, pair.internal),
    ),
    transcripts: catalogueSheetPairs().map((pair) =>
      loadSheet("transcripts", pair.transcript, pair.transcript),
    ),
  });

  it("uses the 59/62 snapshot counts after dropping blank titles", () => {
    expect(table.internalCount).toBe(59);
    expect(table.transcriptCount).toBe(62);
    expect(table.quarantinedCount).toBe(3);
    expect(table.mappedCount + table.missingSourceCount + table.quarantinedCount).toBe(table.rows.length);
  });

  it("quarantines the three unmatched transcript titles and excludes them from activation", () => {
    const quarantined = table.rows.filter((row) => row.status === "quarantined");
    expect(quarantined.map((row) => row.title).sort()).toEqual([...QUARANTINED_TRANSCRIPT_TITLES].sort());
    for (const row of quarantined) {
      expect(row.internal).toBeUndefined();
      expect(row.transcript).toBeDefined();
      expect(row.uncutActivation).toBe("not-activated");
      expect(row.transcript?.rowHash.startsWith("sha256:")).toBe(true);
    }
  });

  it("marks Internal clean-cut pointers as candidate, never activated uncut", () => {
    const mapped = table.rows.filter((row) => row.status === "mapped");
    expect(mapped.length).toBeGreaterThan(0);
    for (const row of mapped) {
      expect(row.internal?.rowHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(row.transcript?.rowHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(row.uncutActivation).toBe("not-activated");
      expect(["absent", "candidate"]).toContain(row.uncutPointer);
    }
    expect(table.rows.some((row) => JSON.stringify(row).includes("http"))).toBe(false);
  });

  it("writes a privacy-safe mapping table next to the snapshot", () => {
    const artifact = {
      snapshotAt: table.snapshotAt,
      internalCount: table.internalCount,
      transcriptCount: table.transcriptCount,
      quarantinedCount: table.quarantinedCount,
      mappedCount: table.mappedCount,
      missingSourceCount: table.missingSourceCount,
      quarantinedTitles: [...QUARANTINED_TRANSCRIPT_TITLES],
      rows: table.rows,
    };
    const payload = `${JSON.stringify(artifact, null, 2)}\n`;
    writeFileSync(resolve(snapshotRoot, "title-map.json"), payload, "utf8");
    writeFileSync(resolve(process.cwd(), "lib/catalogue/title-map.json"), payload, "utf8");
    const written = JSON.parse(readFileSync(resolve(snapshotRoot, "title-map.json"), "utf8"));
    expect(written.quarantinedCount).toBe(3);
    expect(JSON.stringify(written).includes("http://")).toBe(false);
    expect(JSON.stringify(written).includes("https://")).toBe(false);
  });

  it("loads the web copy of the title map and rejects url leakage", () => {
    const loaded = loadTitleMap();
    expect(loaded?.mappedCount).toBe(59);
    expect(loaded?.quarantinedCount).toBe(3);
    expect(parseTitleMapTable({ ...table, rows: table.rows.slice(0, 1) })).toBeNull();
    expect(
      parseTitleMapTable({
        ...table,
        rows: table.rows.map((row) => ({ ...row, title: `https://example.test/${row.title}` })),
      }),
    ).toBeNull();
  });
});
