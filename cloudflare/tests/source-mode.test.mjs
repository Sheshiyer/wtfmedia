import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildVectorQueryOptions,
  filterMatchesByEpisodeId,
  filterAndProjectMatches,
  parseEpisodeId,
  parseSourceMode,
  projectDualSourceCitation,
  resolveEpisodeScopedSources,
  resolveRequestedSources,
  storedSourceMode,
} from "../src/chat/source-mode.ts";

describe("dual-source chat contract", () => {
  test("episode scope accepts only a public YouTube video id", () => {
    assert.equal(parseEpisodeId(" RSB58m7Xwhg "), "RSB58m7Xwhg");
    assert.equal(parseEpisodeId("../private"), null);
    assert.equal(parseEpisodeId("f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293"), null);
    assert.equal(parseEpisodeId(undefined), null);
  });

  test("episode-scoped vector queries filter before topK selection", () => {
    assert.deepEqual(buildVectorQueryOptions("RSB58m7Xwhg"), {
      topK: 12,
      returnMetadata: "all",
      filter: { video_id: { $eq: "RSB58m7Xwhg" } },
    });
    assert.deepEqual(buildVectorQueryOptions(null), {
      topK: 12,
      returnMetadata: "all",
    });
  });

  test("episode scope fails closed when Vectorize returns unrelated matches", () => {
    const matches = [
      { id: "wanted", score: 0.9, metadata: { video_id: "RSB58m7Xwhg" } },
      { id: "other", score: 0.99, metadata: { video_id: "QdWHGjReLUo" } },
      { id: "legacy", score: 0.98, metadata: {} },
    ];
    assert.deepEqual(
      filterMatchesByEpisodeId(matches, "RSB58m7Xwhg").map((match) => match.id),
      ["wanted"],
    );
    assert.equal(filterMatchesByEpisodeId(matches, null), matches);
  });

  test("episode-scoped uncut never falls back to unrelated published evidence", () => {
    const resolved = resolveEpisodeScopedSources([
      {
        id: "other-1",
        score: 0.99,
        metadata: { video_id: "QdWHGjReLUo", source_mode: "published" },
      },
      {
        id: "other-2",
        score: 0.98,
        metadata: { video_id: "SPLFyVyTI1A", source_mode: "published" },
      },
    ], "uncut", "RSB58m7Xwhg", 0.45);

    assert.deepEqual(resolved.citations, []);
    assert.equal(resolved.sourceMode, "uncut");
    assert.equal(resolved.uncutUnavailable, true);
  });

  test("episode scope retains multiple evidence chunks from the selected episode", () => {
    const resolved = resolveEpisodeScopedSources([
      {
        id: "target-1",
        score: 0.93,
        metadata: { video_id: "RSB58m7Xwhg", chunk: 1, source_mode: "published" },
      },
      {
        id: "target-2",
        score: 0.91,
        metadata: { video_id: "RSB58m7Xwhg", chunk: 2, source_mode: "published" },
      },
    ], "published", "RSB58m7Xwhg", 0.45);

    assert.deepEqual(resolved.citations.map((citation) => citation.segmentId), ["target-1", "target-2"]);
  });

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
          source_asset_id: "private-asset-a",
          title: "Published episode",
          chunk: 0,
          source: "uncut:private-asset-a",
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
    assert.equal(uncut[0].url, "uncut:private-asset-a");
    assert.equal(published[0].url.includes("youtube.com"), true);
    assert.equal(uncut[0].url.startsWith("http"), false);
  });

  test("uncut citations use private source identity and never inherit the public YouTube id", () => {
    const citation = projectDualSourceCitation(
      {
        id: "uncut:hash:0",
        score: 0.9,
        metadata: {
          video_id: "RSB58m7Xwhg",
          source_asset_id: "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
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
    assert.equal(citation?.videoId, "RSB58m7Xwhg");
    assert.equal(citation?.start, 95);
    assert.equal(citation?.timestamped, true);
  });

  test("uncut citations preserve an approved Frame.io URL", () => {
    const citation = projectDualSourceCitation(
      {
        id: "uncut:source-a:0",
        score: 0.9,
        metadata: {
          video_id: "RSB58m7Xwhg",
          source_asset_id: "source-a",
          frame_io_url: "https://f.io/0I8LmYs9",
          source_mode: "uncut",
        },
      },
      "uncut",
      0,
    );
    assert.equal(citation?.url, "https://f.io/0I8LmYs9");
  });

  test("uncut citations reject non-Frame.io URLs", () => {
    const citation = projectDualSourceCitation(
      {
        id: "uncut:source-a:0",
        score: 0.9,
        metadata: {
          video_id: "RSB58m7Xwhg",
          source_asset_id: "source-a",
          frame_io_url: "https://example.com/not-frame-io",
          source_mode: "uncut",
        },
      },
      "uncut",
      0,
    );
    assert.equal(citation?.url, "uncut:source-a");
  });

  test("uncut citations fail closed without an opaque source identity", () => {
    assert.equal(projectDualSourceCitation({
      id: "uncut:bad:0",
      score: 0.9,
      metadata: {
        video_id: "RSB58m7Xwhg",
        source: "https://www.youtube.com/watch?v=RSB58m7Xwhg",
        source_mode: "uncut",
      },
    }, "uncut", 0), null);
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
          video_id: "abcdefghijk",
          source_asset_id: "hash-a",
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

  test("episode-scoped both mode reserves room for published evidence when uncut matches dominate", () => {
    const uncut = Array.from({ length: 6 }, (_, index) => ({
      id: `uncut:hash-${index}:${index}`,
      score: 0.99 - index * 0.01,
      metadata: {
        video_id: "abcdefghijk",
        source_asset_id: `hash-${index}`,
        title: "Uncut episode",
        source_mode: "uncut",
      },
    }));
    const published = Array.from({ length: 2 }, (_, index) => ({
      id: `pub-${index}`,
      score: 0.9 - index * 0.01,
      metadata: {
        video_id: "abcdefghijk",
        title: "Published episode",
        source: "https://www.youtube.com/watch?v=abcdefghijk",
      },
    }));

    const resolved = resolveEpisodeScopedSources(
      [...uncut, ...published],
      "both",
      "abcdefghijk",
      0.45,
      6,
    );

    assert.equal(resolved.citations.length, 6);
    assert.equal(resolved.citations.some((citation) => citation.sourceMode === "uncut"), true);
    assert.equal(resolved.citations.some((citation) => citation.sourceMode === "published"), true);
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
