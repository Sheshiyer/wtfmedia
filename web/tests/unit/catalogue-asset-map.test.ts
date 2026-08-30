import { describe, expect, it } from "vitest";
import { loadTitleMap } from "@/lib/catalogue/load-title-map";
import { mapTitleTableAssets, uncutTranscriptKey } from "@/lib/catalogue/asset-map";

describe("title map cloudflare asset keys", () => {
  it("reserves uncut keys for candidate rows and never for quarantined titles", () => {
    const table = loadTitleMap();
    expect(table).not.toBeNull();
    const mapped = mapTitleTableAssets(table!);
    const candidates = mapped.filter((row) => row.uncutPointer === "candidate" && row.status === "mapped");
    const quarantined = mapped.filter((row) => row.status === "quarantined");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((row) => row.uncutKey?.startsWith("uncut/") === true)).toBe(true);
    expect(quarantined.every((row) => row.uncutKey === null)).toBe(true);
    expect(uncutTranscriptKey("https://example.test")).toBeNull();
  });
});
