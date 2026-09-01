import assert from "node:assert/strict";
import { describe, test } from "node:test";

import * as sourceMode from "../src/chat/source-mode.ts";

const {
  buildVectorQueryOptions,
  filterAndProjectMatches,
  filterMatchesByEpisodeId,
  parseEpisodeId,
  parseSourceMode,
  projectDualSourceCitation,
  resolveEpisodeScopedSources,
  resolveRequestedSources,
  storedSourceMode,
} = sourceMode;

describe("dual-source chat contract", () => {
  test("anchors named-person questions to matching episode metadata", () => {
    assert.equal(typeof sourceMode.prioritizeMatchesForQuestion, "function");
    const matches = sourceMode.prioritizeMatchesForQuestion([
      { id: "wrong-1", score: 0.94, metadata: { video_id: "wrongone001", title: "Nikhil Kamath x YouTube CEO, Neal Mohan" } },
      { id: "target-1", score: 0.58, metadata: { video_id: "6HE6d0lKh4o", title: "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal" } },
      { id: "target-2", score: 0.55, metadata: { video_id: "6HE6d0lKh4o", title: "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal" } },
    ], "Tell me everything that Sunil Shetty has told Nikhil Kamath.");

    assert.deepEqual(targetIds(matches), ["target-1", "target-2"]);
  });

  test("leaves generic questions on semantic ranking", () => {
    const matches = [
      { id: "first", score: 0.94, metadata: { video_id: "abcdefghijk", title: "First episode" } },
      { id: "second", score: 0.58, metadata: { video_id: "lmnopqrstuv", title: "Second episode" } },
    ];

    assert.equal(typeof sourceMode.prioritizeMatchesForQuestion, "function");
    assert.deepEqual(targetIds(sourceMode.prioritizeMatchesForQuestion(matches, "What did they discuss about health?")), ["first", "second"]);
  });

  test("returns no candidates when an explicit name has no evidence anchor", () => {
    const matches = [
      { id: "wrong", score: 0.99, metadata: { video_id: "abcdefghijk", title: "Nikhil Kamath x Neal Mohan" } },
    ];

    assert.deepEqual(sourceMode.prioritizeMatchesForQuestion(matches, "What did Sunil Shetty say?"), []);
  });

  test("accepts only public YouTube episode IDs for scope", () => {
    assert.equal(parseEpisodeId("abcdefghijk"), "abcdefghijk");
    assert.equal(parseEpisodeId("  abcdefghijk  "), "abcdefghijk");
    assert.equal(parseEpisodeId("uncut:private-hash"), null);
    assert.equal(parseEpisodeId("too-short"), null);
  });

  test("builds a Vectorize filter and rechecks returned metadata", () => {
    assert.deepEqual(buildVectorQueryOptions("abcdefghijk"), {
      topK: 48,
      returnMetadata: "all",
      filter: { video_id: { $eq: "abcdefghijk" } },
    });
    const matches = filterMatchesByEpisodeId([
      { metadata: { video_id: "abcdefghijk" } },
      { metadata: { video_id: "lmnopqrstuv" } },
    ], "abcdefghijk");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].metadata.video_id, "abcdefghijk");
  });

  test("episode scope keeps multiple chunks from the selected episode", () => {
    const resolved = resolveEpisodeScopedSources([
      { id: "a", score: 0.95, metadata: { video_id: "abcdefghijk", start: 1, timestamped: true } },
      { id: "b", score: 0.94, metadata: { video_id: "abcdefghijk", start: 2, timestamped: true } },
      { id: "c", score: 0.93, metadata: { video_id: "lmnopqrstuv", start: 3, timestamped: true } },
    ], "published", "abcdefghijk", 0.45, 6);
    assert.equal(resolved.citations.length, 2);
    assert.equal(resolved.citations[0].videoId, "abcdefghijk");
    assert.equal(resolved.citations[1].videoId, "abcdefghijk");
  });

  test("named-entity retrieval can keep multiple chunks from one episode", () => {
    const question = "Tell me everything that Sunil Shetty has told Nikhil Kamath.";
    const title = "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal";
    const candidates = sourceMode.prioritizeMatchesForQuestion([
      { id: "a", score: 0.95, metadata: { video_id: "abcdefghijk", title, start: 1, timestamped: true } },
      { id: "b", score: 0.94, metadata: { video_id: "abcdefghijk", title, start: 2, timestamped: true } },
    ], question);
    assert.equal(candidates.length, 2);
    const resolved = resolveEpisodeScopedSources(candidates, "published", null, 0.45, 6, { dedupeByEpisode: false });
    assert.equal(resolved.citations.length, 2);
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

  test("preserves the approved Frame.io URL for uncut source identity", () => {
    const citation = projectDualSourceCitation(
      {
        id: "uncut:hash:0",
        score: 0.9,
        metadata: {
          video_id: "abcdefghijk",
          title: "Uncut episode",
          start: 95,
          timestamped: true,
          source_mode: "uncut",
          frameIoFinalEpUrl: "https://f.io/0I8LmYs9",
        },
      },
      "uncut",
      0,
    );

    assert.equal(citation?.sourceMode, "uncut");
    assert.equal(citation?.videoId, "abcdefghijk");
    assert.equal(citation?.segmentId, "uncut:hash:0");
    assert.equal(citation?.url, "https://f.io/0I8LmYs9");
  });

  test("uncut citations preserve an approved Frame.io URL and source identity", () => {
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

  test("both mode balances published and uncut evidence within the citation limit", () => {
    const matches = [
      { id: "uncut-a", score: 0.96, metadata: { video_id: "uncut-a", source_mode: "uncut", title: "Uncut A" } },
      { id: "uncut-b", score: 0.95, metadata: { video_id: "uncut-b", source_mode: "uncut", title: "Uncut B" } },
      { id: "uncut-c", score: 0.94, metadata: { video_id: "uncut-c", source_mode: "uncut", title: "Uncut C" } },
      { id: "abcdefghijk", score: 0.93, metadata: { video_id: "abcdefghijk", title: "Published A" } },
      { id: "lmnopqrstuv", score: 0.92, metadata: { video_id: "lmnopqrstuv", title: "Published B" } },
      { id: "zyxwvutsrqp", score: 0.91, metadata: { video_id: "zyxwvutsrqp", title: "Published C" } },
    ];

    const resolved = resolveRequestedSources(matches, "both", 0.45, 4);

    assert.deepEqual(resolved.citations.map((citation) => citation.sourceMode), [
      "uncut",
      "published",
      "uncut",
      "published",
    ]);
    assert.deepEqual(resolved.citations.map((citation) => citation.n), [1, 2, 3, 4]);
  });

  test("episode-scoped both mode reserves representation for published and uncut sources", () => {
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

function targetIds(matches) {
  return matches.map((match) => match.id);
}
