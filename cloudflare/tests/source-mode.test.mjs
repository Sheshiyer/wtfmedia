import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  filterAndProjectMatches,
  answerHasRequiredCitations,
  vectorizeQueryOptions,
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
    assert.equal(parseSourceMode("both"), "both");
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

  test("both mode keeps YouTube and uncut citations in one answer without relabeling", () => {
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
          source_mode: "published",
        },
      },
      {
        id: "u:f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa:0",
        score: 0.9,
        metadata: {
          video_id: "f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
          title: "Uncut episode A",
          start: 95,
          timestamped: true,
          source: "uncut:f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293",
          source_mode: "uncut",
        },
      },
      {
        id: "pub-b",
        score: 0.86,
        metadata: {
          video_id: "lmnopqrstuv",
          title: "Published episode B",
          start: 40,
          timestamped: true,
          source: "https://www.youtube.com/watch?v=lmnopqrstuv",
          source_mode: "published",
        },
      },
    ];

    const resolved = resolveRequestedSources(matches, "both", 0.45);
    assert.equal(resolved.sourceMode, "both");
    assert.equal(resolved.uncutUnavailable, false);
    assert.deepEqual(new Set(resolved.citations.map((source) => source.sourceMode)), new Set(["published", "uncut"]));
    assert.equal(resolved.citations.find((source) => source.sourceMode === "uncut")?.url.startsWith("uncut:"), true);
    assert.equal(resolved.citations.find((source) => source.sourceMode === "published")?.url.includes("youtube.com"), true);
    assert.equal(resolved.citations.find((source) => source.sourceMode === "uncut")?.start, 95);
    assert.equal(resolved.citations.find((source) => source.sourceMode === "published")?.start, 12);
  });

  test("vectorize query asks for enough matches to find sparse uncut records", () => {
    assert.equal(vectorizeQueryOptions().returnMetadata, "all");
    assert.ok(vectorizeQueryOptions().topK >= 48);
    assert.equal(vectorizeQueryOptions().filter, undefined);
    assert.deepEqual(vectorizeQueryOptions("uncut").filter, { source_mode: "uncut" });
  });

  test("answers must cite every assertion, not just one sentence", () => {
    assert.equal(answerHasRequiredCitations("Neal discussed YouTube [1]. Rahman discussed music."), false);
    assert.equal(answerHasRequiredCitations("Neal discussed YouTube [1]. Rahman discussed music [2]."), true);
    assert.equal(answerHasRequiredCitations("The retrieved sources cover several related examples [1-6].", 6), true);
    assert.equal(answerHasRequiredCitations("According to the retrieved excerpts:\n* Neal discussed YouTube [1]."), true);
    assert.equal(answerHasRequiredCitations("A.R. Rahman described music as emotional work [3].", 6), true);
    assert.equal(answerHasRequiredCitations("The A.R. Rahman episode, Ep. 15, connects music and identity [3].", 6), true);
    assert.equal(answerHasRequiredCitations("I do not have enough evidence to answer reliably."), true);
  });
});
