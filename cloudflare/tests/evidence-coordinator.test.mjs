import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  queryEvidenceSources,
  queryEvidenceSourcesForQuestion,
} from "../src/chat/evidence-coordinator.ts";

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

  test("catalogue resolution constrains every source query before topK selection", async () => {
    const calls = [];
    const db = {
      prepare() {
        return {
          async all() {
            return {
              results: [
                { title: "Sam Altman x Nikhil Kamath", video_id: "SfOaZIGJ_gs" },
                { title: "Nikhil Kamath x Neal Mohan", video_id: "8uFOBdle3WY" },
              ],
            };
          },
        };
      },
    };
    const index = {
      async query(_vector, options) {
        calls.push(options);
        return { matches: [] };
      },
    };

    const result = await queryEvidenceSourcesForQuestion(
      db,
      index,
      [1],
      "What did Sam Altman tell Nikhil Kamath?",
      "both",
      null,
    );

    assert.equal(result.episodeId, "SfOaZIGJ_gs");
    assert.equal(result.catalogueAnchored, true);
    assert.equal(calls.length, 2);
    assert.equal(calls.every((call) => call.topK === 48), true);
    assert.equal(calls.every((call) => call.filter.video_id.$eq === "SfOaZIGJ_gs"), true);
  });

  test("Bangalore cops alias constrains every requested mode to Policing before topK", async () => {
    const db = {
      prepare() {
        return {
          async all() {
            return {
              results: [
                {
                  title: "People with The Prime Minister Shri Narendra Modi x Nikhil Kamath | Episode 6 | By WTF",
                  video_id: "yTMYtcQLLaw",
                },
                {
                  title: "Nikhil Kamath ft. Police Comm'r & Traffic Police Comm'r of Bengaluru | WTF is Policing? | Special Ep",
                  video_id: "LcWoP6KtZKw",
                },
              ],
            };
          },
        };
      },
    };
    for (const [mode, expectedModes] of [
      ["published", ["published"]],
      ["uncut", ["uncut", "published"]],
      ["both", ["published", "uncut"]],
    ]) {
      const calls = [];
      const index = {
        async query(_vector, options) {
          calls.push(options);
          return { matches: [] };
        },
      };
      const result = await queryEvidenceSourcesForQuestion(
        db,
        index,
        [1],
        "Tell me about Bangalore traffic and conversations that happened with the Bangalore cops.",
        mode,
        null,
      );

      assert.equal(result.episodeId, "LcWoP6KtZKw", mode);
      assert.equal(result.catalogueAnchored, true, mode);
      assert.deepEqual(calls.map((call) => call.filter), expectedModes.map((sourceMode) => ({
        source_mode: { $eq: sourceMode },
        video_id: { $eq: "LcWoP6KtZKw" },
      })));
    }
  });

  test("an explicit episode scope wins without consulting the catalogue", async () => {
    let catalogueReads = 0;
    const db = {
      prepare() {
        catalogueReads += 1;
        throw new Error("catalogue should not be read");
      },
    };
    const filters = [];
    const index = {
      async query(_vector, options) {
        filters.push(options.filter);
        return { matches: [] };
      },
    };

    const result = await queryEvidenceSourcesForQuestion(
      db,
      index,
      [1],
      "broad question",
      "published",
      "RSB58m7Xwhg",
    );

    assert.equal(catalogueReads, 0);
    assert.equal(result.episodeId, "RSB58m7Xwhg");
    assert.deepEqual(filters, [{
      source_mode: { $eq: "published" },
      video_id: { $eq: "RSB58m7Xwhg" },
    }]);
  });
});
