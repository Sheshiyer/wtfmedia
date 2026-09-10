import { describe, expect, it } from "vitest";

import { parsePublicSourceHeader, parsePublicSourceRecords } from "@/lib/provenance/public-source-header";
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

  it("accepts the edge answer start field without exposing extra metadata", () => {
    const sources = parsePublicSourceHeader(JSON.stringify([
      { videoId: "UKag4LVAEdU", title: "Persisted Beta answer", start: 240, sourceMode: "published", internal_rank: 1 },
    ]));

    expect(sources).toEqual([{ videoId: "UKag4LVAEdU", title: "Persisted Beta answer", timeSec: 240, sourceMode: "published" }]);
  });

  it("normalizes persisted citations while retaining their original public number, time, and mode", () => {
    const sources = parsePublicSourceRecords([
      {
        n: 7,
        video_id: "UKag4LVAEdU",
        title: "Persisted Beta answer",
        start: 240,
        source_mode: "uncut",
        mapping_status: "mapped",
        model: "private-model",
        request_id: "private-request",
      },
    ]);

    expect(sources).toEqual([{
      n: 7,
      videoId: "UKag4LVAEdU",
      title: "Persisted Beta answer",
      timeSec: 240,
      sourceMode: "uncut",
      mappingStatus: "mapped",
    }]);
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
