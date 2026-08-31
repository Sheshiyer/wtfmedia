import assert from "node:assert/strict";
import { test } from "node:test";

import { prepareTranscriptAlignment } from "../src/catalogue/transcript-aligner.ts";

function assertNoTranscriptLeak(record, snippets = []) {
  assert.equal("text" in record, false);
  assert.equal("uncutText" in record, false);
  assert.equal("publishedText" in record, false);
  assert.equal("tokens" in record, false);
  assert.equal("url" in record, false);
  assert.equal("storageKey" in record, false);
  assert.equal("assetBody" in record, false);
  assert.equal("sidecarContent" in record, false);

  const payload = JSON.stringify(record);
  for (const snippet of snippets) {
    assert.equal(payload.includes(snippet), false);
  }
}

test("preserves valid source-native uncut time as exact without leaking transcript text", () => {
  const prepared = prepareTranscriptAlignment(
    [
      {
        publishedSegmentId: "p0",
        publishedIndex: 0,
        startSec: 4,
        text: "published timing should not override native uncut time",
      },
    ],
    [
      {
        uncutSegmentId: "u0",
        uncutIndex: 0,
        sourceNativeTimeSec: 12.5,
        text: "native timed studio line",
      },
    ],
  );

  assert.equal(prepared.length, 1);
  assert.deepEqual(prepared[0], {
    uncutSegmentId: "u0",
    uncutIndex: 0,
    preparedTimeSec: 12.5,
    origin: "source_native",
    precision: "exact",
    confidence: 1,
    matchedPublishedSegmentId: null,
    matchedPublishedIndex: null,
    boundStartSec: 12.5,
    boundEndSec: 12.5,
    confidenceComponents: {
      lexical: 1,
      support: 1,
      bounds: 1,
    },
  });
  assertNoTranscriptLeak(prepared[0], ["native timed studio line"]);
});

test("estimates strong lexical alignment and interpolates an uncut insertion monotonically", () => {
  const prepared = prepareTranscriptAlignment(
    [
      {
        publishedSegmentId: "p0",
        publishedIndex: 0,
        startSec: 0,
        text: "welcome everyone to the show",
      },
      {
        publishedSegmentId: "p1",
        publishedIndex: 1,
        startSec: 10,
        text: "today we discuss startup investing",
      },
      {
        publishedSegmentId: "p2",
        publishedIndex: 2,
        startSec: 20,
        text: "closing thoughts and thanks",
      },
    ],
    [
      {
        uncutSegmentId: "u0",
        uncutIndex: 0,
        text: "welcome everyone to the show",
      },
      {
        uncutSegmentId: "u1",
        uncutIndex: 1,
        text: "quick side note before we continue",
      },
      {
        uncutSegmentId: "u2",
        uncutIndex: 2,
        text: "today we discuss startup investing",
      },
      {
        uncutSegmentId: "u3",
        uncutIndex: 3,
        text: "closing thoughts and thanks",
      },
    ],
    {
      confidenceThreshold: 0.6,
      lexicalAnchorThreshold: 0.7,
    },
  );

  assert.deepEqual(
    prepared.map((record) => record.preparedTimeSec),
    [0, 11, 22, 32],
  );
  assert.ok(prepared[2].preparedTimeSec > 10, "inserted uncut words must shift later anchors");
  assert.deepEqual(
    prepared.map((record) => record.origin),
    [
      "published_text_alignment",
      "published_text_alignment",
      "published_text_alignment",
      "published_text_alignment",
    ],
  );
  assert.deepEqual(
    prepared.map((record) => record.precision),
    ["estimated", "estimated", "estimated", "estimated"],
  );
  assert.deepEqual(
    prepared.map((record) => record.matchedPublishedSegmentId),
    ["p0", null, "p1", "p2"],
  );
  assert.deepEqual(
    prepared.map((record) => record.matchedPublishedIndex),
    [0, null, 1, 2],
  );
  assert.deepEqual(
    prepared[1],
    {
      uncutSegmentId: "u1",
      uncutIndex: 1,
      preparedTimeSec: 11,
      origin: "published_text_alignment",
      precision: "estimated",
      confidence: prepared[1].confidence,
      matchedPublishedSegmentId: null,
      matchedPublishedIndex: null,
      boundStartSec: 0,
      boundEndSec: 22,
      confidenceComponents: prepared[1].confidenceComponents,
    },
  );
  assert.ok(prepared[0].confidence > 0.9);
  assert.ok(prepared[1].confidence >= 0.6);
  assert.ok(prepared[1].confidence < 1);
  assert.ok(prepared.every((record, index, array) => (
    index === 0 || (record.preparedTimeSec ?? -1) >= (array[index - 1].preparedTimeSec ?? -1)
  )));
  for (const record of prepared) {
    assertNoTranscriptLeak(record, ["welcome everyone to the show", "startup investing"]);
  }
});

test("fails closed below threshold and when invalid uncut time or empty text is present", () => {
  const prepared = prepareTranscriptAlignment(
    [
      {
        publishedSegmentId: "p0",
        publishedIndex: 0,
        startSec: 0,
        text: "compound annual growth",
      },
      {
        publishedSegmentId: "p1",
        publishedIndex: 1,
        startSec: 10,
        text: "patient capital wins",
      },
    ],
    [
      {
        uncutSegmentId: "u0",
        uncutIndex: 0,
        text: "completely unrelated vocabulary",
      },
      {
        uncutSegmentId: "u1",
        uncutIndex: 1,
        sourceNativeTimeSec: Number.NaN,
        text: "patient capital wins",
      },
      {
        uncutSegmentId: "u2",
        uncutIndex: 2,
        text: "   ",
      },
    ],
    {
      confidenceThreshold: 0.8,
      lexicalAnchorThreshold: 0.75,
    },
  );

  assert.deepEqual(prepared, [
    {
      uncutSegmentId: "u0",
      uncutIndex: 0,
      preparedTimeSec: null,
      origin: "unmapped",
      precision: "unavailable",
      confidence: 0,
      matchedPublishedSegmentId: null,
      matchedPublishedIndex: null,
      boundStartSec: null,
      boundEndSec: null,
      confidenceComponents: {
        lexical: 0,
        support: 0,
        bounds: 0,
      },
    },
    {
      uncutSegmentId: "u1",
      uncutIndex: 1,
      preparedTimeSec: null,
      origin: "unmapped",
      precision: "unavailable",
      confidence: 0,
      matchedPublishedSegmentId: null,
      matchedPublishedIndex: null,
      boundStartSec: null,
      boundEndSec: null,
      confidenceComponents: {
        lexical: 0,
        support: 0,
        bounds: 0,
      },
    },
    {
      uncutSegmentId: "u2",
      uncutIndex: 2,
      preparedTimeSec: null,
      origin: "unmapped",
      precision: "unavailable",
      confidence: 0,
      matchedPublishedSegmentId: null,
      matchedPublishedIndex: null,
      boundStartSec: null,
      boundEndSec: null,
      confidenceComponents: {
        lexical: 0,
        support: 0,
        bounds: 0,
      },
    },
  ]);
});

test("ignores invalid published timestamps and never labels published timing as exact uncut", () => {
  const prepared = prepareTranscriptAlignment(
    [
      {
        publishedSegmentId: "p0",
        publishedIndex: 0,
        startSec: Number.POSITIVE_INFINITY,
        text: "markets are noisy",
      },
      {
        publishedSegmentId: "p1",
        publishedIndex: 1,
        startSec: 42,
        text: "durability matters more than hype",
      },
    ],
    [
      {
        uncutSegmentId: "u0",
        uncutIndex: 0,
        text: "markets are noisy",
      },
      {
        uncutSegmentId: "u1",
        uncutIndex: 1,
        text: "durability matters more than hype",
      },
    ],
  );

  assert.equal(prepared[0].preparedTimeSec, null);
  assert.equal(prepared[0].origin, "unmapped");
  assert.equal(prepared[1].preparedTimeSec, 42);
  assert.equal(prepared[1].origin, "published_text_alignment");
  assert.equal(prepared[1].precision, "estimated");
  assert.notEqual(prepared[1].origin, "source_native");
});

test("replays deterministically and does not mutate caller inputs", () => {
  const published = [
    {
      publishedSegmentId: "p0",
      publishedIndex: 0,
      startSec: 1,
      text: "long horizon patience matters",
    },
    {
      publishedSegmentId: "p1",
      publishedIndex: 1,
      startSec: 9,
      text: "cash flow discipline compounds",
    },
  ];
  const uncut = [
    {
      uncutSegmentId: "u0",
      uncutIndex: 0,
      text: "long horizon patience matters",
    },
    {
      uncutSegmentId: "u1",
      uncutIndex: 1,
      text: "cash flow discipline compounds",
    },
  ];
  const publishedSnapshot = structuredClone(published);
  const uncutSnapshot = structuredClone(uncut);

  const first = prepareTranscriptAlignment(published, uncut);
  const second = prepareTranscriptAlignment(published, uncut);

  assert.deepEqual(first, second);
  assert.deepEqual(published, publishedSnapshot);
  assert.deepEqual(uncut, uncutSnapshot);
});

test("uses stable monotonic tie-breaking for repeated overlapping language", () => {
  const prepared = prepareTranscriptAlignment(
    [
      {
        publishedSegmentId: "p0",
        publishedIndex: 0,
        startSec: 0,
        text: "founders learn capital discipline",
      },
      {
        publishedSegmentId: "p1",
        publishedIndex: 1,
        startSec: 10,
        text: "operators learn capital discipline deeply",
      },
      {
        publishedSegmentId: "p2",
        publishedIndex: 2,
        startSec: 20,
        text: "operators learn capital discipline deeply together",
      },
      {
        publishedSegmentId: "p3",
        publishedIndex: 3,
        startSec: 30,
        text: "closing reflections",
      },
    ],
    [
      {
        uncutSegmentId: "u0",
        uncutIndex: 0,
        text: "operators learn capital discipline deeply",
      },
      {
        uncutSegmentId: "u1",
        uncutIndex: 1,
        text: "operators learn capital discipline deeply together",
      },
      {
        uncutSegmentId: "u2",
        uncutIndex: 2,
        text: "closing reflections",
      },
    ],
  );

  assert.deepEqual(
    prepared.map((record) => record.matchedPublishedIndex),
    [1, 2, 3],
  );
  assert.deepEqual(
    prepared.slice(1).map((record, index) => (
      Number((record.preparedTimeSec - prepared[index].preparedTimeSec).toFixed(6))
    )),
    [10, 10],
  );
  assert.ok(prepared[0].preparedTimeSec < 10, "published-only intro words should shift uncut time earlier");
});

test("accepts tightly bounded interpolation by default and rejects a weak broad gap", () => {
  const tight = prepareTranscriptAlignment(
    [
      { publishedSegmentId: "p0", publishedIndex: 0, startSec: 10, text: "a durable opening anchor" },
      { publishedSegmentId: "p1", publishedIndex: 1, startSec: 20, text: "a durable closing anchor" },
    ],
    [
      { uncutSegmentId: "u0", uncutIndex: 0, text: "a durable opening anchor" },
      { uncutSegmentId: "u1", uncutIndex: 1, text: "an inserted studio aside" },
      { uncutSegmentId: "u2", uncutIndex: 2, text: "a durable closing anchor" },
    ],
  );
  assert.equal(tight[1].preparedTimeSec, 15);
  assert.ok(tight[1].confidence >= 0.8);
  assert.ok(tight[1].confidence < 1);

  const broad = prepareTranscriptAlignment(
    [
      { publishedSegmentId: "p0", publishedIndex: 0, startSec: 10, text: "a durable opening anchor" },
      { publishedSegmentId: "p1", publishedIndex: 1, startSec: 900, text: "a durable closing anchor" },
    ],
    [
      { uncutSegmentId: "u0", uncutIndex: 0, text: "a durable opening anchor" },
      ...Array.from({ length: 60 }, (_, index) => ({
        uncutSegmentId: `gap-${index}`,
        uncutIndex: index + 1,
        text: `unmatched inserted studio aside ${index}`,
      })),
      { uncutSegmentId: "u61", uncutIndex: 61, text: "a durable closing anchor" },
    ],
  );
  assert.equal(broad[30].preparedTimeSec, null);
  assert.equal(broad[30].origin, "unmapped");
});
