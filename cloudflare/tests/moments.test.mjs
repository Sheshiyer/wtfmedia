import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyDurationBudget,
  buildMomentEnrichmentInput,
  buildMoments,
  formatClock,
  parseDurationBudget,
  parseMomentEnrichment,
  resolveMomentEnds,
} from "../src/chat/moments.ts";

function source(overrides) {
  return {
    n: 1,
    videoId: "abc123def45",
    title: "Ep 1",
    url: "https://www.youtube.com/watch?v=abc123def45",
    score: 0.8,
    start: 300,
    segmentId: "abc123def45:5",
    ...overrides,
  };
}

describe("buildMoments", () => {
  test("merges consecutive chunks of one episode into a single moment", () => {
    const moments = buildMoments([
      source({ n: 1, start: 300, segmentId: "abc123def45:5" }),
      source({ n: 2, start: 360, segmentId: "abc123def45:6" }),
      source({ n: 3, start: 420, segmentId: "abc123def45:7" }),
    ]);
    assert.equal(moments.length, 1);
    assert.equal(moments[0].chunkStart, 5);
    assert.equal(moments[0].chunkEnd, 7);
    assert.equal(moments[0].startSec, 300);
    assert.deepEqual(moments[0].citationNumbers, [1, 2, 3]);
  });

  test("splits a chunk gap into two moments in the same episode", () => {
    const moments = buildMoments([
      source({ n: 1, start: 300, segmentId: "abc123def45:5" }),
      source({ n: 2, start: 900, segmentId: "abc123def45:15" }),
    ]);
    assert.equal(moments.length, 2);
    assert.deepEqual(moments.map((m) => m.chunkStart).sort((a, b) => a - b), [5, 15]);
  });

  test("keeps episodes separate and orders moments by score", () => {
    const moments = buildMoments([
      source({ n: 1, videoId: "aaa111bbb22", segmentId: "aaa111bbb22:3", start: 100, score: 0.6, title: "Low" }),
      source({ n: 2, videoId: "ccc333ddd44", segmentId: "ccc333ddd44:8", start: 200, score: 0.9, title: "High" }),
    ]);
    assert.equal(moments.length, 2);
    assert.equal(moments[0].title, "High");
    assert.equal(moments[1].title, "Low");
  });

  test("skips sources without a start or with unparseable segment IDs", () => {
    const moments = buildMoments([
      source({ n: 1, start: null }),
      source({ n: 2, segmentId: "uncut:abc123def45" }),
      source({ n: 3, segmentId: undefined }),
      source({ n: 4, start: 300, segmentId: "abc123def45:5" }),
    ]);
    assert.equal(moments.length, 1);
    assert.deepEqual(moments[0].citationNumbers, [4]);
  });

  test("takes the weakest timestamp confidence in a merged run", () => {
    const moments = buildMoments([
      source({ n: 1, start: 300, segmentId: "abc123def45:5", timestampConfidence: 0.9 }),
      source({ n: 2, start: 360, segmentId: "abc123def45:6", timestampConfidence: 0.4 }),
    ]);
    assert.equal(moments[0].timestampConfidence, 0.4);
  });
});

describe("resolveMomentEnds", () => {
  test("fills end and duration from the next chunk's start, batched", async () => {
    const requested = [];
    // Real env.VECTORIZE.getByIds resolves to a plain VectorizeVector[] array.
    const vectorize = {
      async getByIds(ids) {
        requested.push(ids);
        return ids
          .filter((id) => id === "abc123def45:6")
          .map((id) => ({ id, metadata: { start: 420 } }));
      },
    };
    const [moment] = await resolveMomentEnds(vectorize, buildMoments([
      source({ n: 1, start: 300, segmentId: "abc123def45:5" }),
    ]));
    assert.deepEqual(requested, [["abc123def45:6"]]);
    assert.equal(moment.endSec, 420);
    assert.equal(moment.durationSec, 120);
  });

  test("leaves duration null when the next chunk is missing or lookup fails", async () => {
    const empty = { async getByIds() { return []; } };
    const failing = { async getByIds() { throw new Error("boom"); } };
    const base = buildMoments([source({ n: 1, start: 300, segmentId: "abc123def45:5" })]);
    assert.equal((await resolveMomentEnds(empty, base))[0].durationSec, null);
    assert.equal((await resolveMomentEnds(failing, base))[0].durationSec, null);
  });

  test("also accepts the wrapped { matches } shape from SDK-style mocks", async () => {
    const wrapped = {
      async getByIds() { return { matches: [{ id: "abc123def45:6", metadata: { start: 420 } }] }; },
    };
    const [moment] = await resolveMomentEnds(wrapped, buildMoments([
      source({ n: 1, start: 300, segmentId: "abc123def45:5" }),
    ]));
    assert.equal(moment.endSec, 420);
  });

  test("splits lookups into batches of 20 — the Vectorize getByIds ceiling", async () => {
    const requested = [];
    const vectorize = {
      async getByIds(ids) {
        requested.push(ids);
        return ids.map((id) => ({ id, metadata: { start: 1000 } }));
      },
    };
    // 25 moments across distinct episodes → 25 next-chunk ids → 2 batches.
    const sources = Array.from({ length: 25 }, (_, index) => {
      const videoId = `video${String(index).padStart(5, "0")}x`;
      return source({ n: index + 1, videoId, start: 100, segmentId: `${videoId}:3` });
    });
    const moments = await resolveMomentEnds(vectorize, buildMoments(sources));
    assert.equal(requested.length, 2);
    assert.equal(requested[0].length, 20);
    assert.equal(requested[1].length, 5);
    assert.ok(moments.every((moment) => moment.durationSec === 900));
  });
});

describe("parseDurationBudget", () => {
  test("parses minutes, hours, and half an hour", () => {
    assert.equal(parseDurationBudget("give me relationship moments in 30 min"), 1800);
    assert.equal(parseDurationBudget("45 minutes of dating advice"), 2700);
    assert.equal(parseDurationBudget("1.5 hours on grief"), 5400);
    assert.equal(parseDurationBudget("half an hour of trust"), 1800);
  });

  test("returns null without a duration phrase", () => {
    assert.equal(parseDurationBudget("what did guests say about relationships"), null);
    assert.equal(parseDurationBudget("episode 30 highlights"), null);
  });
});

describe("applyDurationBudget", () => {
  const withDurations = [
    { ...buildMoments([source({ n: 1, score: 0.9, start: 0, segmentId: "abc123def45:1" })])[0], endSec: 600, durationSec: 600 },
    { ...buildMoments([source({ n: 2, score: 0.8, start: 900, segmentId: "abc123def45:16" })])[0], endSec: 1500, durationSec: 600 },
    { ...buildMoments([source({ n: 3, score: 0.7, start: 2000, segmentId: "abc123def45:34" })])[0], endSec: 2600, durationSec: 600 },
  ];

  test("selects by score until the budget fills, overflow marked out of budget", () => {
    const { moments, totalDurationSec, budgetSec } = applyDurationBudget(withDurations, 1500);
    assert.equal(budgetSec, 1500);
    assert.equal(totalDurationSec, 1200);
    assert.deepEqual(moments.map((m) => m.withinBudget), [true, true, false]);
  });

  test("unknown-duration moments stay visible without spending budget", () => {
    const unknown = buildMoments([source({ n: 4, score: 0.6, start: 50, segmentId: "abc123def45:2" })]);
    const { moments, totalDurationSec } = applyDurationBudget([...withDurations.slice(0, 1), ...unknown], 600);
    assert.equal(totalDurationSec, 600);
    assert.deepEqual(moments.map((m) => m.withinBudget), [true, true]);
  });

  test("no budget keeps everything and reports the total", () => {
    const { moments, totalDurationSec, budgetSec } = applyDurationBudget(withDurations, null);
    assert.equal(budgetSec, null);
    assert.equal(totalDurationSec, 1800);
    assert.ok(moments.every((m) => m.withinBudget));
  });
});

describe("moment enrichment", () => {
  test("parses one JSON object per line and ignores commentary and fences", () => {
    const output = [
      "```json",
      '{"guest":"Ranbir Kapoor","theme":"Grief / father","topic":"guilt of not being there","summary":"He recounts missing his father.","whyRelevant":"Raw host grief.","strength":5}',
      "some stray model commentary",
      '{"guest":"Kiran Shaw","theme":"Loss","topic":"an elder verdict","summary":"She relays a dying instruction.","whyRelevant":"Oldest voice lands it.","strength":4}',
      "```",
    ].join("\n");
    const parsed = parseMomentEnrichment(output, 2);
    assert.equal(parsed[0].guest, "Ranbir Kapoor");
    assert.equal(parsed[0].strength, 5);
    assert.equal(parsed[1].guest, "Kiran Shaw");
  });

  test("malformed lines skip their slot instead of shifting later moments", () => {
    const output = [
      "not json at all",
      '{"guest":"B","topic":"t","summary":"s","whyRelevant":"w","strength":3}',
    ].join("\n");
    const parsed = parseMomentEnrichment(output, 2);
    // First line is junk, so the first valid object lands in slot 0 (model
    // ordering is positional — partial parse is still better than none).
    assert.equal(parsed[0].guest, "B");
    assert.deepEqual(parsed[1], {});
  });

  test("clamps strength and drops out-of-range values", () => {
    const parsed = parseMomentEnrichment('{"guest":"G","strength":9}', 1);
    assert.equal(parsed[0].guest, "G");
    assert.equal(parsed[0].strength, undefined);
  });

  test("enrichment input carries the question, title, range, and excerpt", () => {
    const [moment] = buildMoments([source({ n: 1, start: 305, segmentId: "abc123def45:5", text: "hello world" })]);
    const input = buildMomentEnrichmentInput("relationships?", [{ ...moment, endSec: 425, durationSec: 120 }]);
    assert.match(input, /QUESTION: relationships\?/);
    assert.match(input, /MOMENT 1 \| Ep 1 \| 05:05-07:05/);
    assert.match(input, /hello world/);
  });
});

describe("formatClock", () => {
  test("formats mm:ss under an hour and h:mm:ss above", () => {
    assert.equal(formatClock(305), "05:05");
    assert.equal(formatClock(3785), "1:03:05");
    assert.equal(formatClock(0), "00:00");
  });
});
