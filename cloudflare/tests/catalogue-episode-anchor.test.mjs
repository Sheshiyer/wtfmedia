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
  {
    title: "People with The Prime Minister Shri Narendra Modi x Nikhil Kamath | Episode 6 | By WTF",
    video_id: "yTMYtcQLLaw",
  },
  {
    title: "Nikhil Kamath ft. Police Comm'r & Traffic Police Comm'r of Bengaluru | WTF is Policing? | Special Ep",
    video_id: "LcWoP6KtZKw",
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

  test("anchors Bangalore cops traffic language to the published Policing episode", async () => {
    assert.equal(
      await resolveCatalogueEpisodeId(
        catalogueDb(),
        "Tell me about Bangalore traffic and conversations that happened with the Bangalore cops.",
      ),
      "LcWoP6KtZKw",
    );
  });

  test("supports bounded Bangalore and Bengaluru policing aliases", async () => {
    for (const question of [
      "What did the Bangalore police say?",
      "How do Bengaluru cops handle traffic?",
      "Explain the Bengaluru police traffic strategy.",
    ]) {
      assert.equal(await resolveCatalogueEpisodeId(catalogueDb(), question), "LcWoP6KtZKw");
    }
  });

  test("does not anchor a catalogue episode from connector words alone", async () => {
    assert.equal(await resolveCatalogueEpisodeId(catalogueDb(), "with the"), null);
  });

  test("does not resolve a bounded alias when its catalogue episode is absent", async () => {
    assert.equal(
      await resolveCatalogueEpisodeId(
        catalogueDb(catalogue.filter((episode) => episode.video_id !== "LcWoP6KtZKw")),
        "Tell me about Bangalore traffic and the Bangalore cops.",
      ),
      null,
    );
  });

  test("fails closed for broad, confusable, and cross-episode policing language", async () => {
    for (const question of [
      "Bangalore",
      "Bangalore traffic",
      "police",
      "cops",
      "traffic policy",
      "Tell me about people with anxiety",
      "Why do people with power behave differently?",
      "How do people with disabilities navigate cities?",
      "policing AI systems",
      "community policing in Mumbai",
      "Compare Bangalore police with Sam Altman",
    ]) {
      assert.equal(await resolveCatalogueEpisodeId(catalogueDb(), question), null, question);
    }
  });
});
