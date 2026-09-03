import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { queryEvidenceSources } from "../src/chat/evidence-coordinator.ts";

describe("evidence coordinator", () => {
  test("both mode reuses one embedding across independent pre-filtered source queries", async () => {
    const vector = [0.1, 0.2, 0.3];
    const calls = [];
    const index = {
      async query(receivedVector, options) {
        calls.push({ receivedVector, options });
        const mode = options.filter.source_mode.$eq;
        return {
          matches: [{ id: `${mode}-1`, score: 0.9, metadata: { source_mode: mode } }],
        };
      },
    };

    const matches = await queryEvidenceSources(index, vector, "both", "RSB58m7Xwhg");

    assert.equal(calls.length, 2);
    assert.equal(calls[0].receivedVector, vector);
    assert.equal(calls[1].receivedVector, vector);
    assert.deepEqual(calls.map((call) => call.options.filter), [
      {
        source_mode: { $eq: "published" },
        video_id: { $eq: "RSB58m7Xwhg" },
      },
      {
        source_mode: { $eq: "uncut" },
        video_id: { $eq: "RSB58m7Xwhg" },
      },
    ]);
    assert.deepEqual(matches.map((match) => match.id), ["published-1", "uncut-1"]);
  });

  test("published mode performs only its own filtered query", async () => {
    const filters = [];
    const index = {
      async query(_vector, options) {
        filters.push(options.filter);
        return { matches: [] };
      },
    };

    assert.deepEqual(await queryEvidenceSources(index, [1], "published", null), []);
    assert.deepEqual(filters, [{ source_mode: { $eq: "published" } }]);
  });

  test("uncut mode also retrieves a separately filtered published fallback", async () => {
    const filters = [];
    const index = {
      async query(_vector, options) {
        filters.push(options.filter);
        return { matches: [] };
      },
    };

    await queryEvidenceSources(index, [1], "uncut", null);
    assert.deepEqual(filters, [
      { source_mode: { $eq: "uncut" } },
      { source_mode: { $eq: "published" } },
    ]);
  });
});
