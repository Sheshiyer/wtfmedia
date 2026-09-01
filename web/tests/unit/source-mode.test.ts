import { describe, expect, it } from "vitest";

import { parsePublicSourceHeader } from "@/lib/provenance/public-source-header";
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import * as sourceMode from "@/lib/provenance/source-mode";
import { parseSourceMode, publicTimestampForMode } from "@/lib/provenance/source-mode";

describe("dual-source public DTO", () => {
  it("defaults unknown modes to published", () => {
    expect(parseSourceMode(undefined)).toBe("published");
    expect(parseSourceMode("uncut")).toBe("uncut");
    expect(parseSourceMode("studio")).toBe("published");
  });

  it("does not treat a published time as an uncut time", () => {
    expect(
      publicTimestampForMode({
        requested: "uncut",
        citationMode: "published",
        mappingStatus: "mapped",
        timeSec: 90,
      }),
    ).toBeNull();
    expect(
      publicTimestampForMode({
        requested: "published",
        citationMode: "published",
        mappingStatus: "mapped",
        timeSec: 90,
      }),
    ).toBe(90);
    expect(
      publicTimestampForMode({
        requested: "uncut",
        citationMode: "uncut",
        mappingStatus: "unmapped",
        timeSec: 90,
      }),
    ).toBeNull();
  });

  it("parses dual-source header fields and drops private keys", () => {
    const sources = parsePublicSourceHeader(
      encodeURIComponent(
        JSON.stringify([
          {
            video_id: "UKag4LVAEdU",
            title: "Published episode",
            t: 180,
            source_mode: "published",
            mapping_status: "mapped",
            segment_id: "UKag4LVAEdU:0",
            private_path: "must-not-reach-the-ui",
          },
        ]),
      ),
    );

    expect(sources).toEqual([
      {
        videoId: "UKag4LVAEdU",
        title: "Published episode",
        timeSec: 180,
        sourceMode: "published",
        mappingStatus: "mapped",
        segmentId: "UKag4LVAEdU:0",
      },
    ]);
    expect(resolveCitation({ ...sources[0], requestedMode: "uncut" }).activeTimeSec).toBeNull();
    expect(resolveCitation({ ...sources[0], requestedMode: "published" }).activeTimeSec).toBe(180);
  });

  it("filters cited sources by published, uncut, or both mode", () => {
    expect(typeof sourceMode.filterSourcesByMode).toBe("function");
    if (typeof sourceMode.filterSourcesByMode !== "function") return;

    const sources = [
      { title: "Published episode", sourceMode: "published" as const },
      { title: "Uncut episode", sourceMode: "uncut" as const },
      { title: "Another uncut episode", sourceMode: "uncut" as const },
    ];

    expect(sourceMode.filterSourcesByMode(sources, "published")).toEqual([sources[0]]);
    expect(sourceMode.filterSourcesByMode(sources, "uncut")).toEqual([sources[1], sources[2]]);
    expect(sourceMode.filterSourcesByMode(sources, "both")).toEqual(sources);
  });
});
