import { describe, expect, it } from "vitest";

import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import { parsePublicSourceHeader } from "@/lib/provenance/public-source-header";

describe("public Phase 3 provenance boundary", () => {
  it("does not derive private uncut media or alignment data from a browser catalog snapshot", () => {
    const resolved = resolveCitation({
      videoId: "UKag4LVAEdU",
      timestampSec: 180,
    });

    expect(resolved.youtubeVideoId).toBe("UKag4LVAEdU");
    expect(resolved.uncutMediaUrl).toBeNull();
    expect(resolved.intervals).toEqual([]);
    expect(resolved.isUncutOnly).toBe(false);
  });

  it("decodes the public header aliases and drops unexpected fields", () => {
    const header = encodeURIComponent(JSON.stringify([
      {
        video_id: "UKag4LVAEdU",
        title: "Published episode",
        t: 180,
        url: "https://www.youtube.com/watch?v=UKag4LVAEdU",
        private_path: "must-not-reach-the-ui",
      },
      { video_id: "UKag4LVAEdU", t: null },
    ]));

    const sources = parsePublicSourceHeader(header);
    expect(sources).toEqual([
      {
        videoId: "UKag4LVAEdU",
        title: "Published episode",
        url: "https://www.youtube.com/watch?v=UKag4LVAEdU",
        timeSec: 180,
      },
      { videoId: "UKag4LVAEdU" },
    ]);
    expect(resolveCitation(sources[0])).toMatchObject({
      youtubeVideoId: "UKag4LVAEdU",
      activeTimeSec: 180,
    });
  });
});
