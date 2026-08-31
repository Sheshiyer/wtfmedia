import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  filterAndProjectMatches,
  parseSourceMode,
  projectDualSourceCitation,
  resolveRequestedSources,
  storedSourceMode,
} from "../src/chat/source-mode.ts";

describe("dual-source chat contract", () => {
  test("unknown or missing sourceMode defaults to published", () => {
    assert.equal(parseSourceMode(undefined), "published");
    assert.equal(parseSourceMode("published"), "published");
    assert.equal(parseSourceMode("uncut"), "uncut");
    assert.equal(parseSourceMode("studio"), "published");
  });

  test("legacy vectors without source_mode are published", () => {
    assert.equal(storedSourceMode({}), "published");
    assert.equal(storedSourceMode({ source_mode: "uncut" }), "uncut");
  });

  test("uncut queries drop published matches and never convert their timestamps", () => {
    const matches = [
      {
        id: "pub-1",
        score: 0.9,
        metadata: {
          video_id: "abcdefghijk",
          title: "Published episode",
          chunk: 0,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
          start: 120,
          timestamped: true,
        },
      },
      {
        id: "uncut-1",
        score: 0.88,
        metadata: {
          video_id: "abcdefghijk",
          title: "Published episode",
          chunk: 0,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
          start: 480,
          timestamped: true,
          source_mode: "uncut",
        },
      },
    ];

    const published = filterAndProjectMatches(matches, "published", 0.45);
    assert.equal(published.length, 1);
    assert.equal(published[0].sourceMode, "published");
    assert.equal(published[0].start, 120);
    assert.equal(published[0].mappingStatus, "mapped");

    const uncut = filterAndProjectMatches(matches, "uncut", 0.45);
    assert.equal(uncut.length, 1);
    assert.equal(uncut[0].sourceMode, "uncut");
    assert.equal(uncut[0].start, 480);
    assert.notEqual(uncut[0].start, published[0].start);
    assert.equal(uncut[0].mappingStatus, "mapped");
    assert.equal(uncut[0].url, "uncut:abcdefghijk");
    assert.equal(published[0].url.includes("youtube.com"), true);
    assert.equal(uncut[0].url.startsWith("http"), false);
  });

  test("uncut citations never inherit a YouTube URL even if metadata.source is one", () => {
    const citation = projectDualSourceCitation(
      {
        id: "uncut:hash:0",
        score: 0.9,
        metadata: {
          video_id: "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
          title: "AI Minister: Omar Al Olama",
          start: 95,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
          source_mode: "uncut",
        },
      },
      "uncut",
      0,
    );
    assert.equal(citation?.url, "uncut:f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293");
    assert.equal(citation?.start, 95);
    assert.equal(citation?.timestamped, true);
  });

  test("a published timestamp is not projected as uncut", () => {
    const citation = projectDualSourceCitation(
      {
        id: "pub-2",
        score: 0.91,
        metadata: {
          video_id: "abcdefghijk",
          title: "Published episode",
          start: 12,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
        },
      },
      "uncut",
      0,
    );
    assert.equal(citation?.sourceMode, "published");
    assert.equal(citation?.start, null);
    assert.equal(citation?.timestamped, false);
    assert.equal(citation?.mappingStatus, "unavailable");
  });

  test("uncut with no uncut corpus uses published YouTube and does not relabel it", () => {
    const matches = [
      {
        id: "pub-a",
        score: 0.92,
        metadata: {
          video_id: "abcdefghijk",
          title: "Published episode A",
          start: 12,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
        },
      },
      {
        id: "pub-b",
        score: 0.81,
        metadata: {
          video_id: "lmnopqrstuv",
          title: "Published episode B",
          start: 40,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=lmnopqrstuv",
        },
      },
    ];
    const resolved = resolveRequestedSources(matches, "uncut", 0.45);
    assert.equal(resolved.sourceMode, "published");
    assert.equal(resolved.uncutUnavailable, true);
    assert.equal(resolved.citations.length, 2);
    assert.equal(resolved.citations[0].sourceMode, "published");
    assert.equal(resolved.citations[0].start, 12);
    assert.equal(resolved.citations[1].sourceMode, "published");
  });

  test("both mode returns uncut and published evidence without relabeling either", () => {
    const matches = [
      {
        id: "uncut:hash-a:0",
        score: 0.95,
        metadata: {
          video_id: "hash-a",
          title: "Uncut episode",
          start: 95,
          timestamped: true,
          source_mode: "uncut",
        },
      },
      {
        id: "pub-a",
        score: 0.9,
        metadata: {
          video_id: "abcdefghijk",
          title: "Published episode",
          start: 12,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
        },
      },
    ];
    const resolved = resolveRequestedSources(matches, "both", 0.45);
    assert.equal(resolved.sourceMode, "both");
    assert.equal(resolved.uncutUnavailable, false);
    assert.equal(resolved.citations.length, 2);
    assert.equal(resolved.citations[0].sourceMode, "uncut");
    assert.equal(resolved.citations[0].url.startsWith("uncut:"), true);
    assert.equal(resolved.citations[1].sourceMode, "published");
    assert.equal(resolved.citations[1].url.includes("youtube.com"), true);
  });

  test("both mode reports uncut unavailable when only published evidence exists", () => {
    const resolved = resolveRequestedSources([
      {
        id: "pub-a",
        score: 0.9,
        metadata: {
          video_id: "abcdefghijk",
          title: "Published episode",
          start: 12,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=abcdefghijk",
        },
      },
    ], "both", 0.45);
    assert.equal(resolved.sourceMode, "both");
    assert.equal(resolved.uncutUnavailable, true);
    assert.equal(resolved.citations.length, 1);
    assert.equal(resolved.citations[0].sourceMode, "published");
  });
});
