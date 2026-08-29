/**
 * Public provenance contract tests.
 *
 * Timeline math can be exercised with explicit, synthetic intervals. Browser
 * code must not load a private catalog or infer an Uncut asset from a citation.
 */

import { describe, expect, it } from "vitest";

import {
  getCatalogEpisodeById,
  getCatalogEpisodes,
  getCatalogSnapshot,
  getDualPlaybackCoordinate,
  getTimelineIntervalsForEpisode,
  resolveCitation,
} from "../../lib/provenance/catalog-mapping";
import { createTimelineEngine, verifyMathematicalSymmetry } from "../../lib/provenance/timeline-engine";
import { formatPlaybackTimestamp } from "../../lib/provenance/useDualPlayback";

const trustedFixture = {
  id: "ep_fixture",
  slug: "fixture",
  title: "Fixture",
  showCategory: "fixture",
  intervals: [
    {
      intervalIndex: 0,
      uncutStartSec: 0,
      uncutEndSec: 60,
      pubStartSec: 0,
      pubEndSec: 60,
      status: "matched" as const,
      confidence: 1,
    },
  ],
};

describe("public provenance boundary", () => {
  it("does not load a private browser catalog", () => {
    const snapshot = getCatalogSnapshot();

    expect(snapshot.version).toBe("public-projection-required");
    expect(snapshot.episodes).toEqual([]);
    expect(getCatalogEpisodes()).toEqual([]);
    expect(getCatalogEpisodeById("ep_fixture")).toBeUndefined();
  });

  it("uses only explicitly supplied, trusted intervals", () => {
    expect(getTimelineIntervalsForEpisode("ep_fixture")).toEqual([]);
    expect(getTimelineIntervalsForEpisode(trustedFixture)).toEqual([
      expect.objectContaining({
        status: "matched",
        uncutStartSec: 0,
        pubEndSec: 60,
      }),
    ]);
  });

  it("rejects incomplete alignment records instead of normalizing a zero-length match", () => {
    expect(getTimelineIntervalsForEpisode({
      id: "ep_incomplete",
      slug: "incomplete",
      title: "Incomplete",
      showCategory: "fixture",
      intervals: [{}],
    })).toEqual([]);
  });

  it("resolves a public YouTube citation without an Uncut or alignment claim", () => {
    const citation = resolveCitation({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=180s",
    });

    expect(citation.youtubeVideoId).toBe("dQw4w9WgXcQ");
    expect(citation.activeTimeSec).toBe(180);
    expect(citation.episode).toBeNull();
    expect(citation.uncutMediaUrl).toBeNull();
    expect(citation.intervals).toEqual([]);
    expect(citation.isUncutOnly).toBe(false);

    expect(resolveCitation({
      url: "https://evilyoutube.com/watch?v=dQw4w9WgXcQ&t=180s",
    }).youtubeVideoId).toBeNull();
  });

  it("returns unmapped rather than an invented dual-playback conversion", () => {
    const coordinate = getDualPlaybackCoordinate({
      episodeIdOrVideoId: "dQw4w9WgXcQ",
      sourceTimeline: "published",
      timeSec: 180,
    });

    expect(coordinate.status).toBe("unmapped");
    expect(coordinate.publishedTimeSec).toBe(180);
    expect(coordinate.uncutTimeSec).toBeNull();
  });
});

describe("explicit timeline math", () => {
  it("converts an explicit trusted alignment symmetrically", () => {
    const intervals = getTimelineIntervalsForEpisode(trustedFixture);
    const engine = createTimelineEngine(intervals);

    expect(engine.convertUncutToPublished(30)).toMatchObject({
      status: "matched",
      targetTimeSec: 30,
    });
    expect(verifyMathematicalSymmetry(intervals).symmetric).toBe(true);
  });

  it("formats timestamps without relying on episode metadata", () => {
    expect(formatPlaybackTimestamp(0)).toBe("0:00");
    expect(formatPlaybackTimestamp(3665)).toBe("1:01:05");
    expect(formatPlaybackTimestamp(null)).toBe("—");
  });
});
