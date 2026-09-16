import assert from "node:assert/strict";
import { test } from "node:test";
import { runPublicChat } from "../src/chat/public-chat.ts";

const vector = Array.from({ length: 1024 }, () => 0.1);

const HOSPITALITY_MATCHES = [
  {
    id: "hospitality:4",
    score: 0.94,
    metadata: {
      video_id: "hospitality",
      source_mode: "published",
      title: "WTF is The Restaurant Game? with Zorawar Kalra",
      text: "There is a big difference between service and hospitality; service is taking a drink and putting it on the table.",
      timestamped: true,
      start: 120,
    },
  },
  {
    id: "restaurant1:7",
    score: 0.91,
    metadata: {
      video_id: "restaurant1",
      source_mode: "published",
      title: "Why A 25-Year-Old Should Build A Hotel",
      text: "We capture the customers' preferences, the way they book, preferences of meals, preferences of drinks.",
      timestamped: true,
      start: 300,
    },
  },
];

function followUpEnv(calls) {
  calls.classify = calls.classify ?? [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    const system = body.messages?.[0]?.content ?? "";
    const respond = (content) => new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    if (system.startsWith("You classify research-assistant answers")) {
      calls.classify.push(body);
      const answerText = body.messages?.[1]?.content ?? "";
      return respond(/nothing else|contain nothing|cannot provide/i.test(answerText) ? "ABSTAIN" : "ANSWERED");
    }
    if (system.startsWith("Rewrite the follow-up question")) {
      calls.reformulate.push(body);
      return respond("timestamps for everything discussed about hospitality on the podcast");
    }
    if (system.startsWith("You label podcast moments")) {
      calls.enrich.push(body);
      const count = (body.messages?.[1]?.content?.match(/MOMENT \d+/gu) ?? []).length || 1;
      const lines = Array.from({ length: count }, (_, index) => JSON.stringify({
        m: index + 1,
        guest: "Zorawar Kalra",
        theme: "hospitality",
        topic: "service vs hospitality",
        summary: "Guests distinguish service from hospitality.",
        whyRelevant: "Directly answers the hospitality question.",
        strength: 5,
      }));
      return respond(lines.join("\n"));
    }
    if (system.startsWith("Suggest up to five short follow-up")) {
      return respond("");
    }
    if (system.startsWith("You are the WTF OS research companion")) {
      calls.answer.push(body);
      return respond("Hospitality was framed as distinct from service [1]. The hotel episode covers captured guest preferences [2].");
    }
    throw new Error(`unexpected prompt: ${system.slice(0, 80)}`);
  };
  return {
    AI: {
      async run(model, input) {
        if (model !== "@cf/baai/bge-large-en-v1.5") throw new Error("generation must use OpenRouter");
        calls.embeddings.push(typeof input?.text === "string" ? input.text : "");
        return { data: [vector] };
      },
    },
    DB: { prepare: () => ({ all: async () => ({ results: [] }) }) },
    VECTORIZE: {
      async query() { return { matches: HOSPITALITY_MATCHES }; },
      async getByIds() { return []; },
    },
    OPENROUTER_API_KEY: "test-openrouter-key",
  };
}

test("bare follow-up stays anchored to the conversation topic for retrieval and moments", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const result = await runPublicChat(env, {
    question: "give me all the timestamps",
    sourceMode: "published",
    episodeId: null,
    history: [
      { role: "user", content: "give me timestamps for everything that was discussed about hospitality" },
      { role: "assistant", content: "The hospitality discussion covered service versus hospitality [1]." },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.responseState, "answered_grounded");

  // Retrieval must embed the resolved topic query, not the bare follow-up.
  assert.equal(calls.reformulate.length, 1, "follow-up should be reformulated against history");
  assert.ok(
    calls.embeddings.every((text) => !/give me all the timestamps/i.test(text)),
    `embedding input should not be the bare follow-up: ${JSON.stringify(calls.embeddings)}`,
  );
  assert.ok(
    calls.embeddings.some((text) => /hospitality/i.test(text)),
    `embedding input should carry the anchored topic: ${JSON.stringify(calls.embeddings)}`,
  );

  // Moment relevance must be judged against the resolved topic too — otherwise
  // off-topic moments mentioning "timestamp" survive the reel filter.
  assert.equal(calls.enrich.length > 0, true, "moments should be enriched");
  for (const call of calls.enrich) {
    const questionLine = call.messages?.[1]?.content?.split("\n").find((line) => line.startsWith("QUESTION:"));
    assert.ok(/hospitality/i.test(questionLine ?? ""), `enrichment judged against bare follow-up: ${questionLine}`);
  }

  const moments = result.body.moments ?? [];
  const mockedVideoIds = new Set(HOSPITALITY_MATCHES.map((match) => match.metadata.video_id));
  assert.ok(moments.length > 0, "hospitality moments should ship");
  assert.ok(moments.every((moment) => mockedVideoIds.has(moment.videoId)), "moments must come from the anchored retrieval");
});

test("citation-free 'nothing else' answer abstains with no sources", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  // The truthful answer to "anything else about X?" cites nothing — absence
  // has no citation. It must ship as an abstention, never as an excerpt dump
  // of whatever the broad retrieval happened to score.
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    const system = body.messages?.[0]?.content ?? "";
    if (system.startsWith("You are the WTF OS research companion")) {
      calls.answer.push(body);
      const content = "No — nothing else about trees was discussed in the catalogue.";
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return baseFetch(url, init);
  };
  const result = await runPublicChat(env, {
    question: "Nothing else was discussed?",
    sourceMode: "published",
    episodeId: null,
    history: [
      { role: "user", content: "what was discussed about trees?" },
      { role: "assistant", content: "Trees came up in two episodes [1] [2]." },
    ],
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.responseState, "abstained");
  assert.deepEqual(result.body.sources, []);
  assert.deepEqual(result.body.citedIndices, []);
  assert.equal(result.body.moments, undefined);
  assert.equal(calls.answer.length, 1, "abstention should skip the repair pass");
});

test("cited abstention ships no sources or moments", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  // The model declares the evidence misses the question but cites the misses
  // anyway — the panel must not render those random episodes as "sources".
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    const system = body.messages?.[0]?.content ?? "";
    if (system.startsWith("You are the WTF OS research companion")) {
      const content = [
        "The excerpts contain nothing about hospitality — no discussion of hotels, restaurants, or travel appears in any of the passages [1] [2].",
        "I also cannot provide timestamps for it: no timestamped content covers the topic [1].",
      ].join("\n\n");
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return baseFetch(url, init);
  };
  const result = await runPublicChat(env, {
    question: "tell me all about hospitality that you know, give me timestamps",
    sourceMode: "published",
    episodeId: null,
    history: [],
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.responseState, "abstained");
  assert.deepEqual(result.body.sources, []);
  assert.deepEqual(result.body.citedIndices, []);
  assert.equal(result.body.moments, undefined);
});

