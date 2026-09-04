import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolveCatalogueEpisodeId } from "../src/chat/catalogue-episode-anchor.ts";

const catalogue = [
  {
    title: "Sam Altman x Nikhil Kamath: How to Win When AI Changes Everything | People by WTF | Episode 13",
    video_id: "SfOaZIGJ_gs",
  },
  {
    title: "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal",
    video_id: "6HE6d0lKh4o",
  },
  {
    title: "Nikhil Kamath x Netflix Co-CEO, Ted Sarandos | People by WTF Ep. 10",
    video_id: "QT2FGbR0nIM",
  },
  {
    title: "Nikhil Kamath x YouTube CEO, Neal Mohan | People by WTF Ep. 9",
    video_id: "8uFOBdle3WY",
  },
];

function catalogueDb(rows = catalogue) {
  const queries = [];
  return {
    queries,
    prepare(query) {
      queries.push(query);
      return {
        async all() {
          return { results: rows };
        },
      };
    },
  };
}

describe("catalogue episode anchor", () => {
  test("resolves the unique Sam Altman episode before semantic retrieval", async () => {
    const db = catalogueDb();

    const videoId = await resolveCatalogueEpisodeId(
      db,
      "What are the key points discussed between Sam Altman and Nikhil Kamath?",
    );

    assert.equal(videoId, "SfOaZIGJ_gs");
    assert.equal(db.queries.length, 1);
  });

  test("does not scope a query from the catalogue-common host name alone", async () => {
    assert.equal(
      await resolveCatalogueEpisodeId(catalogueDb(), "Tell me what supplements does Nikhil have?"),
      null,
    );
  });

  test("tolerates a one-character spelling drift in a distinctive guest phrase", async () => {
    assert.equal(
      await resolveCatalogueEpisodeId(catalogueDb(), "What did Sunil Shetty tell Nikhil Kamath about health?"),
      "6HE6d0lKh4o",
    );
  });

  test("fails closed when two catalogue titles share the best distinctive phrase", async () => {
    const ambiguous = [
      { title: "Sam Altman with Nikhil Kamath, part one", video_id: "abcdefghijk" },
      { title: "Sam Altman with Nikhil Kamath, part two", video_id: "lmnopqrstuv" },
    ];

    assert.equal(
      await resolveCatalogueEpisodeId(catalogueDb(ambiguous), "What did Sam Altman tell Nikhil Kamath?"),
      null,
    );
  });
});
