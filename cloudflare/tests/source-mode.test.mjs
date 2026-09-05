import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyUncutClockOffset,
  buildCounterpartQueryOptions,
  buildVectorQueryOptions,
  extractNamedEntityPhrases,
  filterMatchesByEpisodeId,
  filterAndProjectMatches,
  findSingleTimelineGaps,
  parseEpisodeId,
  parseSourceMode,
  parseUncutClockOffset,
  pickProjectableCounterpart,
  pickSameMomentCounterpart,
  prioritizeMatchesForQuestion,
  prioritizeMatchesForQuestionWithAnchor,
  projectDualSourceCitation,
  queryCounterpartMatches,
  resolveEpisodeScopedSources,
  resolveRequestedSources,
  storedSourceMode,
  textOverlapScore,
  timestampConfidenceFor,
  UNCUT_OFFSET_KEY_PREFIX,
  withRestoredDualMode,
} from "../src/chat/source-mode.ts";

describe("dual-source chat contract", () => {
  test("anchors named-person questions to matching episode metadata", () => {
    const question = "Tell me everything that Sunil Shetty has told Nikhil Kamath.";
    const matches = prioritizeMatchesForQuestion([
      { id: "wrong", score: 0.99, metadata: { video_id: "QdWHGjReLUo", title: "Nikhil Kamath x Neal Mohan" } },
      { id: "target-1", score: 0.58, metadata: { video_id: "6HE6d0lKh4o", title: "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal" } },
      { id: "target-2", score: 0.55, metadata: { video_id: "6HE6d0lKh4o", title: "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal" } },
    ], question);

    assert.deepEqual(extractNamedEntityPhrases(question), ["Sunil Shetty", "Nikhil Kamath"]);
    assert.deepEqual(matches.map((match) => match.id), ["target-1", "target-2"]);
  });

  test("retains answer-bearing chunks that match any explicit named entity", () => {
    const matches = prioritizeMatchesForQuestion([
      {
        id: "intro-with-both",
        score: 0.94,
        metadata: {
          video_id: "abcdefghijk",
          title: "Martin Escobari at General Atlantic",
          text: "An introduction to General Atlantic.",
        },
      },
      {
        id: "answer-with-guest",
        score: 0.91,
        metadata: {
          video_id: "abcdefghijk",
          title: "Martin Escobari: Trauma, Chaos & Three Industries Worth $100B",
          text: "The answer-bearing discussion names the three industries.",
        },
      },
      {
        id: "unrelated",
        score: 0.99,
        metadata: { video_id: "lmnopqrstuv", title: "Another guest and another fund" },
      },
    ], "What industries did Martin Escobari discuss, and how do they relate to General Atlantic?");

    assert.deepEqual(matches.map((match) => match.id), ["intro-with-both", "answer-with-guest"]);
  });

  test("falls back to all matches when a named person has no evidence anchor", () => {
    const matches = [
      { id: "wrong", score: 0.99, metadata: { title: "Nikhil Kamath x Neal Mohan" } },
    ];
    assert.deepEqual(
      prioritizeMatchesForQuestion(matches, "What did Sunil Shetty say?"),
      matches,
    );
  });

  test("reports false pseudo-entities as unanchored so broad results stay episode-deduplicated", () => {
    for (const question of [
      "Tell me what supplements does Nikhil have?",
      "Tell me about Bangalore traffic and considerations that happened with the Bangalore cops.",
    ]) {
      const prioritized = prioritizeMatchesForQuestionWithAnchor([
        {
          id: "policing-1",
          score: 0.91,
          metadata: { video_id: "LcWoP6KtZKw", title: "WTF is Policing", source_mode: "published" },
        },
        {
          id: "policing-2",
          score: 0.88,
          metadata: { video_id: "LcWoP6KtZKw", title: "WTF is Policing", source_mode: "published" },
        },
        {
          id: "health-1",
          score: 0.84,
          metadata: { video_id: "6HE6d0lKh4o", title: "WTF is Health", source_mode: "published" },
        },
      ], question);

      assert.equal(prioritized.anchored, false);
      const resolved = resolveRequestedSources(prioritized.matches, "published", 0.45, 6, {
        dedupeByEpisode: !prioritized.anchored,
      });
      assert.deepEqual(resolved.citations.map((citation) => citation.segmentId), ["policing-1", "health-1"]);
    }
  });

  test("reports a real evidence phrase anchor and retains its answer-bearing passages", () => {
    const prioritized = prioritizeMatchesForQuestionWithAnchor([
      {
        id: "sam-1",
        score: 0.91,
        metadata: { video_id: "SfOaZIGJ_gs", title: "Sam Altman x Nikhil Kamath", source_mode: "published" },
      },
      {
        id: "sam-2",
        score: 0.89,
        metadata: { video_id: "SfOaZIGJ_gs", title: "Sam Altman x Nikhil Kamath", source_mode: "published" },
      },
      {
        id: "other",
        score: 0.99,
        metadata: { video_id: "abcdefghijk", title: "Another AI episode", source_mode: "published" },
      },
    ], "What did Sam Altman tell Nikhil Kamath?");

    assert.equal(prioritized.anchored, true);
    const resolved = resolveRequestedSources(prioritized.matches, "published", 0.45, 6, {
      dedupeByEpisode: !prioritized.anchored,
    });
    assert.deepEqual(resolved.citations.map((citation) => citation.segmentId), ["sam-1", "sam-2"]);
  });

  test("keeps direct transcript-name evidence inside the anchored citation limit", () => {
    const answer = {
      id: "answer",
      score: 0.7,
      metadata: {
        video_id: "abc12345678",
        title: "Sam Altman x Nikhil Kamath",
        text: "Sam Altman gave the answer in this passage.",
        source_mode: "published",
      },
    };
    const filler = Array.from({ length: 6 }, (_, index) => ({
      id: `filler-${index}`,
      score: 0.96 - index * 0.01,
      metadata: {
        video_id: "abc12345678",
        title: "Sam Altman x Nikhil Kamath",
        text: "General introduction without a direct speaker reference.",
        source_mode: "published",
      },
    }));

    const prioritized = prioritizeMatchesForQuestionWithAnchor(
      [answer, ...filler],
      "What did Sam Altman tell Nikhil Kamath?",
    );
    const resolved = resolveRequestedSources(prioritized.matches, "published", 0.45, 6, {
      dedupeByEpisode: !prioritized.anchored,
    });

    assert.equal(prioritized.anchored, true);
    assert.equal(resolved.citations.some((citation) => citation.segmentId === "answer"), true);
  });

  test("extracts entities from lowercase input via case-insensitive fallback", () => {
    assert.deepEqual(extractNamedEntityPhrases("where does nikhil kamat stay?"), ["Nikhil Kamat"]);
    assert.deepEqual(extractNamedEntityPhrases("what did ranbir kapoor say"), ["Ranbir Kapoor"]);
  });

  test("case-insensitive extraction strips stopwords from phrase edges", () => {
    const entities = extractNamedEntityPhrases("where does nikhil kamath stay in bangalore");
    assert.deepEqual(entities, ["Nikhil Kamath"]);
  });

  test("episode scope accepts only a public YouTube video id", () => {
    assert.equal(parseEpisodeId(" RSB58m7Xwhg "), "RSB58m7Xwhg");
    assert.equal(parseEpisodeId("../private"), null);
    assert.equal(parseEpisodeId("f4ae8eaae69c9ef99a22a45b9caff6a5612b1c93f280aa80fb11755d5d6ed293"), null);
    assert.equal(parseEpisodeId(undefined), null);
  });

  test("source and episode scoped vector queries filter before topK selection", () => {
    assert.deepEqual(buildVectorQueryOptions("RSB58m7Xwhg", "published"), {
      topK: 48,
      returnMetadata: "all",
      filter: {
        source_mode: { $eq: "published" },
        video_id: { $eq: "RSB58m7Xwhg" },
      },
    });
    assert.deepEqual(buildVectorQueryOptions(null, "uncut"), {
      topK: 48,
      returnMetadata: "all",
      filter: { source_mode: { $eq: "uncut" } },
    });
  });

  test("counterpart backfill query pins the episode and the missing timeline", () => {
    assert.deepEqual(buildCounterpartQueryOptions("RSB58m7Xwhg", "uncut"), {
      topK: 8,
      returnMetadata: "all",
      filter: {
        video_id: { $eq: "RSB58m7Xwhg" },
        source_mode: { $eq: "uncut" },
      },
    });
  });

  test("text overlap scores shared moments above shared vocabulary", () => {
    const anchor = "we never bought an ipl team because the valuations made no sense for us";
    const sameMoment = "the reason we never bought an ipl team is that the valuations made no sense for us at all";
    const sameTopic = "cricket in india is a religion and the ipl is its biggest festival every year";
    assert.ok(textOverlapScore(anchor, sameMoment) > 0.5);
    assert.ok(textOverlapScore(anchor, sameTopic) < 0.2);
    assert.equal(textOverlapScore("", sameMoment), 0);
  });

  test("same-moment counterpart prefers text overlap over raw score", () => {
    const picked = pickSameMomentCounterpart(
      "we never bought an ipl team because the valuations made no sense for us",
      [
        { id: "hi-score", score: 0.9, metadata: { text: "cricket in india is a religion and the ipl is its biggest festival" } },
        { id: "same-moment", score: 0.4, metadata: { text: "the reason we never bought an ipl team is that the valuations made no sense for us at all" } },
      ],
    );
    assert.equal(picked?.id, "same-moment");
  });

  test("same-moment counterpart falls back to the strongest candidate without overlap", () => {
    const picked = pickSameMomentCounterpart(
      "quantum chromodynamics lattice gauge theory",
      [
        { id: "weak", score: 0.4, metadata: { text: "cricket in india is a religion" } },
        { id: "strong", score: 0.9, metadata: { text: "football viewership in turkey" } },
      ],
    );
    assert.equal(picked?.id, "strong");
  });

  test("both-mode pairing shows the same moment on both timelines", () => {
    const resolved = resolveRequestedSources([
      {
        id: "pub-anchor",
        score: 0.9,
        metadata: {
          video_id: "abcdefghijk",
          source_mode: "published",
          start: 792,
          timestamped: true,
          text: "we never bought an ipl team because the valuations made no sense for us",
        },
      },
      // Both uncut candidates sit below the 0.55 floor, so the episode relies
      // on counterpart attach; the second uncut episode keeps the mode
      // competitive overall.
      {
        id: "uncut-different-moment",
        score: 0.54,
        metadata: {
          video_id: "abcdefghijk",
          source_asset_id: "asset-a",
          source_mode: "uncut",
          start: 60,
          timestamped: true,
          text: "welcome back to the show everyone today we have a great guest",
        },
      },
      {
        id: "uncut-same-moment",
        score: 0.5,
        metadata: {
          video_id: "abcdefghijk",
          source_asset_id: "asset-a",
          source_mode: "uncut",
          start: 780,
          timestamped: true,
          text: "the reason we never bought an ipl team is that the valuations made no sense for us at all",
        },
      },
      {
        id: "uncut-other-episode",
        score: 0.88,
        metadata: {
          video_id: "lmnopqrstuv",
          source_asset_id: "asset-b",
          source_mode: "uncut",
          start: 12,
          timestamped: true,
          text: "cricket in india is a religion and the ipl is its biggest festival every year",
        },
      },
      {
        id: "pub-other-episode",
        score: 0.86,
        metadata: {
          video_id: "lmnopqrstuv",
          source_mode: "published",
          start: 20,
          timestamped: true,
          text: "cricket in india is a religion and the ipl is its biggest festival every year",
        },
      },
    ], "both", 0.55, 40);

    const uncut = resolved.citations.find(
      (citation) => citation.videoId === "abcdefghijk" && citation.sourceMode === "uncut",
    );
    assert.equal(uncut?.segmentId, "uncut-same-moment");
    assert.equal(uncut?.start, 780);
  });

  test("single-timeline gaps list each episode's missing mode exactly once", () => {
    const resolved = resolveRequestedSources([
      { id: "u-a", score: 0.9, metadata: { video_id: "abcdefghijk", source_asset_id: "asset-a", source_mode: "uncut" } },
      { id: "p-a", score: 0.88, metadata: { video_id: "abcdefghijk", source_mode: "published" } },
      { id: "u-b", score: 0.8, metadata: { video_id: "lmnopqrstuv", source_asset_id: "asset-b", source_mode: "uncut" } },
      { id: "p-c", score: 0.75, metadata: { video_id: "zyxwvutsrqp", source_mode: "published" } },
      { id: "p-c-2", score: 0.7, metadata: { video_id: "zyxwvutsrqp", source_mode: "published" } },
    ], "both", 0.45, 40, { dedupeByEpisode: false });

    assert.deepEqual(findSingleTimelineGaps(resolved.citations), [
      { videoId: "lmnopqrstuv", missing: "published" },
      { videoId: "zyxwvutsrqp", missing: "uncut" },
    ]);
  });

  test("fully paired results have no single-timeline gaps", () => {
    const resolved = resolveRequestedSources([
      { id: "u-a", score: 0.9, metadata: { video_id: "abcdefghijk", source_asset_id: "asset-a", source_mode: "uncut" } },
      { id: "p-a", score: 0.88, metadata: { video_id: "abcdefghijk", source_mode: "published" } },
    ], "both", 0.45);

    assert.deepEqual(findSingleTimelineGaps(resolved.citations), []);
  });

  test("uncut clock offset parses from KV JSON", () => {
    assert.deepEqual(parseUncutClockOffset('{"offset": 186, "pairs": 12}'), { offset: 186, pairs: 12 });
    assert.deepEqual(parseUncutClockOffset('{"offset": -42.5, "pairs": 7}'), { offset: -42.5, pairs: 7 });
    // sub-threshold drift still parses — the applier decides whether to shift
    assert.deepEqual(parseUncutClockOffset('{"offset": 2.3, "pairs": 9}'), { offset: 2.3, pairs: 9 });
    assert.equal(parseUncutClockOffset(null), null);
    assert.equal(parseUncutClockOffset("not-json"), null);
    assert.equal(parseUncutClockOffset('{"offset": "big"}'), null);
    assert.equal(UNCUT_OFFSET_KEY_PREFIX, "alignment:uncut-offset:");
  });

  test("uncut clock offset shifts verified uncut starts and leaves everything else", () => {
    const uncutCitation = {
      n: 1, score: 0.9, videoId: "abcdefghijk", title: "ep", url: "uncut:abcdefghijk",
      sourceMode: "uncut", segmentId: "u-1", start: 800, timestamped: true,
      mappingStatus: "mapped", timestampStatus: "verified", timestampReason: null,
    };
    const corrected = applyUncutClockOffset(uncutCitation, { offset: 186, pairs: 12 });
    assert.equal(corrected.start, 614);
    assert.equal(corrected.timestampStatus, "verified");

    // clamps at zero rather than going negative
    assert.equal(applyUncutClockOffset(uncutCitation, { offset: 9999, pairs: 3 }).start, 0);

    // sub-threshold drift is chunking jitter — untouched
    assert.equal(applyUncutClockOffset(uncutCitation, { offset: 2.3, pairs: 9 }).start, 800);

    // published, unverified, and missing-start citations pass through untouched
    const publishedCitation = { ...uncutCitation, sourceMode: "published" };
    assert.equal(applyUncutClockOffset(publishedCitation, { offset: 186, pairs: 12 }).start, 800);
    const unverified = { ...uncutCitation, timestamped: false, timestampStatus: "source_timing_unavailable" };
    assert.equal(applyUncutClockOffset(unverified, { offset: 186, pairs: 12 }).start, 800);
    const noStart = { ...uncutCitation, start: null, timestamped: false, timestampStatus: "source_timing_unavailable" };
    assert.equal(applyUncutClockOffset(noStart, { offset: 186, pairs: 12 }).start, null);
    assert.equal(applyUncutClockOffset(uncutCitation, null).start, 800);
  });

  test("timestamp confidence reflects timing certainty, not content match", () => {
    const base = { sourceMode: "published", timestampStatus: "verified" };
    assert.equal(timestampConfidenceFor(base, null), 0.97);
    assert.equal(timestampConfidenceFor({ ...base, timestampStatus: "source_timing_unavailable" }, null), 0.25);
    assert.equal(timestampConfidenceFor({ ...base, timestampStatus: "requested_timeline_unavailable" }, null), 0.25);

    const uncut = { sourceMode: "uncut", timestampStatus: "verified" };
    // aligned uncut scales with the number of aligned pairs behind the offset
    assert.equal(timestampConfidenceFor(uncut, { offset: 7, pairs: 20 }), 0.97);
    assert.equal(timestampConfidenceFor(uncut, { offset: 7, pairs: 33 }), 0.97);
    assert.equal(timestampConfidenceFor(uncut, { offset: 7, pairs: 10 }), 0.935);
    assert.equal(timestampConfidenceFor(uncut, { offset: 7, pairs: 1 }), 0.904);
    // alignment attempted but failed (marker entry) — below an unmeasured one
    assert.equal(timestampConfidenceFor(uncut, { offset: 0, pairs: 0 }), 0.5);
    // no measurement at all
    assert.equal(timestampConfidenceFor(uncut, null), 0.6);
    assert.equal(timestampConfidenceFor({ ...uncut, timestampStatus: "source_timing_unavailable" }, { offset: 7, pairs: 20 }), 0.25);
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
    assert.equal(published[0].timestampStatus, "verified");
    assert.equal(published[0].timestampReason, null);

    const uncut = filterAndProjectMatches(matches, "uncut", 0.45);
    assert.equal(uncut.length, 1);
    assert.equal(uncut[0].sourceMode, "uncut");
    assert.equal(uncut[0].start, 480);
    assert.notEqual(uncut[0].start, published[0].start);
    assert.equal(uncut[0].mappingStatus, "mapped");
    assert.equal(uncut[0].timestampStatus, "verified");
    assert.equal(uncut[0].timestampReason, null);
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

  test("counterpart picking skips legacy chunks that fail projection closed", () => {
    // Chamath case: the episode's uncut was ingested twice — a legacy copy
    // whose identity equals the public video id (rejected by the opaque-
    // identity guard) and a proper copy keyed by the asset hash. The picker
    // must skip the unprojectable copy instead of leaving the episode
    // single-timeline.
    const anchor = "we were iterating on the business model every single week";
    const legacy = {
      id: "uncut:legacy:22",
      score: 0.91,
      metadata: {
        video_id: "hAgqDdPgA3g",
        source: "uncut:hAgqDdPgA3g",
        source_mode: "uncut",
        chunk: 22,
        start: 1549,
        timestamped: true,
        text: anchor,
      },
    };
    const proper = {
      id: "uncut:proper:22",
      score: 0.9,
      metadata: {
        video_id: "hAgqDdPgA3g",
        source_asset_id: "6a41876abfc2da92a0dd3d61ce567c5c",
        source_mode: "uncut",
        chunk: 22,
        start: 1549,
        timestamped: true,
        text: anchor,
      },
    };
    // Fail-closed guard still rejects the legacy copy directly.
    assert.equal(projectDualSourceCitation(legacy, "both", 0), null);
    const picked = pickProjectableCounterpart(anchor, [legacy, proper], "both", 0);
    assert.equal(picked?.match, proper);
    assert.equal(picked?.citation.videoId, "hAgqDdPgA3g");
    assert.equal(picked?.citation.sourceMode, "uncut");
    // When every candidate is unprojectable the episode honestly stays
    // single-timeline rather than minting an opaque-less citation.
    assert.equal(pickProjectableCounterpart(anchor, [legacy], "both", 0), null);
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

  test("untimed published citations explain missing native timing without a seek parameter", () => {
    const citation = projectDualSourceCitation({
      id: "pub-untimed",
      score: 0.84,
      metadata: {
        video_id: "abcdefghijk",
        title: "Published transcript without a timing sidecar",
        source_mode: "published",
        timestamp_status: "source_timing_unavailable",
        timestamp_origin: "none",
      },
    }, "published", 0);

    assert.equal(citation?.timestampStatus, "source_timing_unavailable");
    assert.equal(
      citation?.timestampReason,
      "This published transcript was ingested without timestamp data; the link opens the full episode.",
    );
    assert.equal(citation?.url, "https://www.youtube.com/watch?v=abcdefghijk");
    assert.equal(citation?.url.includes("&t="), false);
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

  test("episode-scoped both mode excludes a noncompetitive published timeline", () => {
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
    assert.equal(resolved.evidenceSourceMode, "uncut");
    assert.equal(resolved.citations.every((citation) => citation.sourceMode === "uncut"), true);
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
    assert.equal(resolved.requestedSourceMode, "both");
    assert.equal(resolved.evidenceSourceMode, "published");
    assert.equal(resolved.sourceMode, "published");
    assert.equal(resolved.fallbackReason, "requested_mode_insufficient");
    assert.equal(resolved.uncutUnavailable, true);
    assert.equal(resolved.citations.length, 1);
    assert.equal(resolved.citations[0].sourceMode, "published");
  });

  test("both mode does not reserve capacity for a weak noncompetitive timeline", () => {
    const uncut = Array.from({ length: 6 }, (_, index) => ({
      id: `uncut:strong-${index}:${index}`,
      score: 0.95 - index * 0.01,
      metadata: {
        video_id: `strong0000${index}`,
        source_asset_id: `strong-${index}`,
        title: `Strong uncut ${index}`,
        source_mode: "uncut",
      },
    }));
    const weakPublished = [
      {
        id: "weak-published",
        score: 0.46,
        metadata: { video_id: "weakpub0001", title: "Weak published", source_mode: "published" },
      },
    ];

    const resolved = resolveRequestedSources([...uncut, ...weakPublished], "both", 0.45, 6);

    assert.equal(resolved.requestedSourceMode, "both");
    assert.equal(resolved.evidenceSourceMode, "uncut");
    assert.equal(resolved.fallbackReason, "requested_mode_not_competitive");
    assert.equal(resolved.uncutUnavailable, false);
    assert.equal(resolved.citations.length, 6);
    assert.equal(resolved.citations.every((citation) => citation.sourceMode === "uncut"), true);
  });

  test("both mode keeps both timelines when their strongest evidence is competitive", () => {
    const resolved = resolveRequestedSources([
      {
        id: "uncut:competitive-a:0",
        score: 0.91,
        metadata: { video_id: "abcdefghijk", source_asset_id: "competitive-a", source_mode: "uncut" },
      },
      {
        id: "uncut:competitive-b:0",
        score: 0.89,
        metadata: { video_id: "lmnopqrstuv", source_asset_id: "competitive-b", source_mode: "uncut" },
      },
      {
        id: "published-a",
        score: 0.88,
        metadata: { video_id: "zyxwvutsrqp", source_mode: "published" },
      },
      {
        id: "published-b",
        score: 0.86,
        metadata: { video_id: "ponmlkjihgf", source_mode: "published" },
      },
    ], "both", 0.45, 4);

    assert.equal(resolved.evidenceSourceMode, "both");
    assert.equal(resolved.citations.some((citation) => citation.sourceMode === "uncut"), true);
    assert.equal(resolved.citations.some((citation) => citation.sourceMode === "published"), true);
  });

  test("uncut mode names a clearly stronger published fallback without relabeling it", () => {
    const resolved = resolveRequestedSources([
      {
        id: "uncut:weak-a:0",
        score: 0.81,
        metadata: { video_id: "abcdefghijk", source_asset_id: "weak-a", source_mode: "uncut" },
      },
      {
        id: "uncut:weak-b:0",
        score: 0.79,
        metadata: { video_id: "lmnopqrstuv", source_asset_id: "weak-b", source_mode: "uncut" },
      },
      {
        id: "published-strong-a",
        score: 0.92,
        metadata: { video_id: "zyxwvutsrqp", source_mode: "published" },
      },
      {
        id: "published-strong-b",
        score: 0.9,
        metadata: { video_id: "ponmlkjihgf", source_mode: "published" },
      },
    ], "uncut", 0.45);

    assert.equal(resolved.requestedSourceMode, "uncut");
    assert.equal(resolved.evidenceSourceMode, "published");
    assert.equal(resolved.sourceMode, "published");
    assert.equal(resolved.uncutUnavailable, false);
    assert.equal(resolved.fallbackReason, "requested_mode_not_competitive");
    assert.equal(resolved.citations.every((citation) => citation.sourceMode === "published"), true);
  });

  test("one relevant uncut excerpt is insufficient but not unavailable", () => {
    const resolved = resolveRequestedSources([
      {
        id: "uncut:one:0",
        score: 0.91,
        metadata: { video_id: "abcdefghijk", source_asset_id: "one", source_mode: "uncut" },
      },
    ], "uncut", 0.45);

    assert.equal(resolved.evidenceSourceMode, "uncut");
    assert.equal(resolved.uncutUnavailable, false);
    assert.equal(resolved.fallbackReason, "requested_mode_insufficient");
    assert.equal(resolved.citations.length, 1);
  });

  test("published mode remains published-only when only uncut evidence qualifies", () => {
    const resolved = resolveRequestedSources([
      {
        id: "uncut:only-a:0",
        score: 0.95,
        metadata: { video_id: "abcdefghijk", source_asset_id: "only-a", source_mode: "uncut" },
      },
      {
        id: "uncut:only-b:0",
        score: 0.94,
        metadata: { video_id: "lmnopqrstuv", source_asset_id: "only-b", source_mode: "uncut" },
      },
    ], "published", 0.45);

    assert.equal(resolved.requestedSourceMode, "published");
    assert.equal(resolved.evidenceSourceMode, null);
    assert.deepEqual(resolved.citations, []);
  });

  test("source selection rejects matches without a finite numeric score", () => {
    const resolved = resolveRequestedSources([
      { id: "missing", metadata: { video_id: "abcdefghijk", source_mode: "published" } },
      { id: "nan", score: Number.NaN, metadata: { video_id: "lmnopqrstuv", source_mode: "published" } },
      { id: "valid", score: 0.8, metadata: { video_id: "zyxwvutsrqp", source_mode: "published" } },
    ], "published", 0.45);

    assert.deepEqual(resolved.citations.map((citation) => citation.segmentId), ["valid"]);
  });
});

describe("withRestoredDualMode", () => {
  const baseResolved = {
    citations: [],
    requestedSourceMode: "both",
    evidenceSourceMode: "uncut",
    fallbackReason: "requested_mode_not_competitive",
    sourceMode: "uncut",
    uncutUnavailable: false,
  };

  test("relabels the response as both once backfill re-attaches the counterpart timeline", () => {
    const restored = withRestoredDualMode(baseResolved, [
      { sourceMode: "uncut" },
      { sourceMode: "published" },
    ]);

    assert.equal(restored.sourceMode, "both");
    assert.equal(restored.evidenceSourceMode, "both");
    // The not-competitive caveat no longer applies: both timelines are present.
    assert.equal(restored.fallbackReason, null);
  });

  test("keeps the single-mode label while evidence stays single-timeline", () => {
    const restored = withRestoredDualMode(baseResolved, [
      { sourceMode: "uncut" },
      { sourceMode: "uncut" },
    ]);

    assert.equal(restored.sourceMode, "uncut");
    assert.equal(restored.fallbackReason, "requested_mode_not_competitive");
  });

  test("preserves an insufficient-evidence caveat even when dual mode is restored", () => {
    const restored = withRestoredDualMode(
      { ...baseResolved, fallbackReason: "requested_mode_insufficient" },
      [{ sourceMode: "uncut" }, { sourceMode: "published" }],
    );

    assert.equal(restored.sourceMode, "both");
    assert.equal(restored.fallbackReason, "requested_mode_insufficient");
  });

  test("never relabels a single-mode request", () => {
    const resolved = { ...baseResolved, requestedSourceMode: "uncut" };
    const restored = withRestoredDualMode(resolved, [
      { sourceMode: "uncut" },
      { sourceMode: "published" },
    ]);

    assert.equal(restored.sourceMode, "uncut");
  });
});

describe("queryCounterpartMatches", () => {
  const fakeVectorize = (behaviour) => {
    const calls = [];
    return {
      calls,
      query: async (vector, options) => {
        calls.push(options);
        return behaviour(calls.length, options);
      },
    };
  };

  test("retries a transient published failure once and returns the retried matches", async () => {
    const vectorize = fakeVectorize((call) => {
      if (call === 1) throw new Error("vectorize timeout");
      return { matches: [{ id: "pub:1", metadata: { video_id: "v1", source_mode: "published" } }] };
    });

    const matches = await queryCounterpartMatches(vectorize, [0.1], "v1", "published");

    assert.equal(vectorize.calls.length, 2);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, "pub:1");
    assert.deepEqual(vectorize.calls[0], vectorize.calls[1]);
  });

  test("does not retry the uncut direction", async () => {
    const vectorize = fakeVectorize(() => {
      throw new Error("vectorize timeout");
    });

    await assert.rejects(() => queryCounterpartMatches(vectorize, [0.1], "v1", "uncut"));
    assert.equal(vectorize.calls.length, 1);
  });

  test("surfaces the published failure when the retry also fails", async () => {
    const vectorize = fakeVectorize(() => {
      throw new Error("vectorize down");
    });

    await assert.rejects(() => queryCounterpartMatches(vectorize, [0.1], "v1", "published"));
    assert.equal(vectorize.calls.length, 2);
  });

  test("returns an empty list when the counterpart is genuinely absent", async () => {
    const vectorize = fakeVectorize(() => ({ matches: [] }));

    const matches = await queryCounterpartMatches(vectorize, [0.1], "v1", "published");

    assert.equal(vectorize.calls.length, 1);
    assert.deepEqual(matches, []);
  });
});
