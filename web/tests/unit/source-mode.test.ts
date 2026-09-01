import { describe, expect, it } from "vitest";

import { parsePublicSourceHeader } from "@/lib/provenance/public-source-header";
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import { isSourceMode, parseSourceMode, publicTimestampForMode } from "@/lib/provenance/source-mode";

describe("dual-source public DTO", () => {
  it("defaults unknown modes to published", () => {
    expect(parseSourceMode(undefined)).toBe("published");
    expect(parseSourceMode("uncut")).toBe("uncut");
    expect(parseSourceMode("both")).toBe("both");
    expect(parseSourceMode("studio")).toBe("published");
    expect(isSourceMode("both")).toBe(true);
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
    expect(
      publicTimestampForMode({
        requested: "both",
        citationMode: "published",
        mappingStatus: "mapped",
        timeSec: 90,
      }),
    ).toBe(90);
    expect(
      publicTimestampForMode({
        requested: "both",
        citationMode: "uncut",
        mappingStatus: "mapped",
        timeSec: 120,
      }),
    ).toBe(120);
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

  it("shows an uncut clock without a YouTube url", () => {
    const sources = parsePublicSourceHeader(
      encodeURIComponent(
        JSON.stringify([
          {
            video_id: "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
            title: "AI Minister: Omar Al Olama",
            t: 95,
            source_mode: "uncut",
            mapping_status: "mapped",
            segment_id: "uncut:f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293:0",
          },
        ]),
      ),
    );
    const resolved = resolveCitation({ ...sources[0], requestedMode: "uncut" });
    expect(sources[0]?.url).toBeUndefined();
    expect(resolved.activeTimeSec).toBe(95);
    expect(resolved.youtubeVideoId).toBeNull();
    expect(resolved.uncutMediaUrl).toBeNull();
  });
});
