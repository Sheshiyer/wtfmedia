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
    const system = body.system ?? "";
    const respond = (content) => new Response(
      JSON.stringify({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: content }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    if (system.startsWith("You classify research-assistant answers")) {
      calls.classify.push(body);
      const answerText = body.messages?.[0]?.content ?? "";
      return respond(/nothing else|contain nothing|cannot provide/i.test(answerText) ? "ABSTAIN" : "ANSWERED");
    }
    if (system.startsWith("Rewrite the follow-up question")) {
      calls.reformulate.push(body);
      return respond("timestamps for everything discussed about hospitality on the podcast");
    }
    if (system.startsWith("You label podcast moments")) {
      calls.enrich.push(body);
      const count = (body.messages?.[0]?.content?.match(/MOMENT \d+/gu) ?? []).length || 1;
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
        if (model !== "@cf/baai/bge-large-en-v1.5") throw new Error("generation must use Claude");
        calls.embeddings.push(typeof input?.text === "string" ? input.text : "");
        return { data: [vector] };
      },
    },
    DB: { prepare: () => ({ all: async () => ({ results: [] }) }) },
    VECTORIZE: {
      async query() { return { matches: HOSPITALITY_MATCHES }; },
      async getByIds() { return []; },
    },
    ANTHROPIC_API_KEY: "test-anthropic-key",
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
    const questionLine = call.messages?.[0]?.content?.split("\n").find((line) => line.startsWith("QUESTION:"));
    assert.ok(/hospitality/i.test(questionLine ?? ""), `enrichment judged against bare follow-up: ${questionLine}`);
  }

  const moments = result.body.moments ?? [];
  const mockedVideoIds = new Set(HOSPITALITY_MATCHES.map((match) => match.metadata.video_id));
  assert.ok(moments.length > 0, "hospitality moments should ship");
  assert.ok(moments.every((moment) => mockedVideoIds.has(moment.videoId)), "moments must come from the anchored retrieval");
});

test("cited quotations survive a three-turn Claude conversation without excerpt fallback", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  const answers = [
    'The distinction was: "Service delivers the order. Hospitality makes a guest feel welcome." [1].',
    'The example was: “The team records meal preferences. It also records drink preferences.” [2].',
    'A practical interpretation is to use the recorded preferences to personalize service [1, 2].',
  ];
  let generations = 0;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.system.startsWith("You are the WTF OS research companion")) {
      assert.equal(body.model, "claude-sonnet-5-5");
      const answer = answers[generations++];
      assert.ok(answer, "valid quoted answers must not trigger a repair call");
      if (generations > 1) assert.ok(body.messages[0].content.includes(answers[generations - 2]), "follow-up retains the prior answer");
      return Response.json({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: answer }] });
    }
    return baseFetch(url, init);
  };
  const history = [];
  for (const question of ["What is service versus hospitality?", "Give one example.", "How could a restaurant use it?"]) {
    const result = await runPublicChat(env, { question, sourceMode: "published", episodeId: null, history });
    assert.equal(result.status, 200);
    assert.equal(result.body.responseState, "answered_grounded");
    assert.equal(result.body.modelFallback, false);
    assert.equal(result.body.model, "claude-sonnet-5-5");
    assert.ok(result.body.citedIndices.length > 0);
    history.push({ role: "user", content: question }, { role: "assistant", content: result.body.answer });
  }
  assert.equal(generations, 3);
  assert.equal(calls.reformulate.length, 2);
});

test("citation repair identifies the rejected opening sentence and keeps the follow-up context", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  let generations = 0;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.system.startsWith("You are the WTF OS research companion")) {
      generations++;
      if (generations === 2) {
        assert.ok(body.messages.at(-1).content.includes('"The team records guest preferences"'));
        assert.match(body.messages.at(-1).content, /cite.*remove/i);
        assert.match(body.messages[0].content, /PRIOR CONVERSATION:/);
        assert.equal(body.output_config.format.type, "json_schema");
      }
      return Response.json({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: generations === 1
        ? 'The team records guest preferences. They record meals and drinks [2].'
        : JSON.stringify({ sentences: [{ text: 'The team records guest preferences, including meals and drinks.', citations: [2] }] }) }] });
    }
    return baseFetch(url, init);
  };
  const result = await runPublicChat(env, {
    question: "Give one practical example.", sourceMode: "published", episodeId: null,
    history: [{ role: "user", content: "How is hospitality different from service?" }, { role: "assistant", content: "Hospitality is distinct from service [1]." }],
  });
  assert.equal(result.body.responseState, "answered_grounded");
  assert.equal(result.body.model, "claude-sonnet-5-5");
  assert.equal(generations, 2);
  assert.deepEqual(result.body.citedIndices, [2]);
});

for (const malformed of [
  { sentences: [{ text: 'A supposed fact.', citations: [99] }] },
  { sentences: [{ text: 'A supposed fact.', citations: ['1'] }] },
  { sentences: [{ text: 'An uncited assertion. A cited assertion.', citations: [1] }] },
  { sentences: [] },
  { answer: 'not the expected structure' },
]) {
  test(`invalid structured citation repair retains safe fallback: ${JSON.stringify(malformed)}`, async () => {
    const env = followUpEnv({ reformulate: [], answer: [], enrich: [], embeddings: [] });
    const baseFetch = globalThis.fetch;
    let generationCalls = 0;
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      if (body.system.startsWith("You are the WTF OS research companion")) {
        generationCalls++;
        return Response.json({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: generationCalls === 1
          ? 'An uncited assertion. A cited assertion [1].' : JSON.stringify(malformed) }] });
      }
      return baseFetch(url, init);
    };
    const result = await runPublicChat(env, { question: 'What was said about hospitality?', sourceMode: 'published', episodeId: null });
    assert.equal(result.status, 200);
    assert.equal(result.body.responseState, 'synthesis_invalid');
    assert.match(result.body.answer, /closest cited excerpts/);
    assert.equal(generationCalls, 2);
  });
}

test("citation-free 'nothing else' answer abstains with no sources", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  // The truthful answer to "anything else about X?" cites nothing — absence
  // has no citation. It must ship as an abstention, never as an excerpt dump
  // of whatever the broad retrieval happened to score.
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    const system = body.system ?? "";
    if (system.startsWith("You are the WTF OS research companion")) {
      calls.answer.push(body);
      const content = "No — nothing else about trees was discussed in the catalogue.";
      return new Response(JSON.stringify({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: content }] }), {
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

test("Claude abstention verdict has enough output budget to avoid unnecessary citation repair", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  let generationCalls = 0;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (body.system.startsWith('You classify research-assistant answers')) {
      return Response.json({ model: 'claude-sonnet-5-5', stop_reason: body.max_tokens <= 5 ? 'max_tokens' : 'end_turn', content: [{ type: 'text', text: 'ABSTAIN' }] });
    }
    if (body.system.startsWith('You are the WTF OS research companion')) {
      generationCalls++;
      return Response.json({ model: 'claude-sonnet-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: "The excerpts do not establish yesterday's customer count." }] });
    }
    return baseFetch(url, init);
  };
  const result = await runPublicChat(env, { question: "What was yesterday's customer count?", sourceMode: 'published', episodeId: null });
  assert.equal(result.body.responseState, 'abstained');
  assert.deepEqual(result.body.sources, []);
  assert.deepEqual(result.body.citedIndices, []);
  assert.equal(generationCalls, 1);
});

test("cited abstention ships no sources or moments", async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  // The model declares the evidence misses the question but cites the misses
  // anyway — the panel must not render those random episodes as "sources".
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    const system = body.system ?? "";
    if (system.startsWith("You are the WTF OS research companion")) {
      const content = [
        "The excerpts contain nothing about hospitality — no discussion of hotels, restaurants, or travel appears in any of the passages [1] [2].",
        "I also cannot provide timestamps for it: no timestamped content covers the topic [1].",
      ].join("\n\n");
      return new Response(JSON.stringify({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: content }] }), {
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


test('failed enrichment does not trigger per-moment retries after credential rejection', async () => {
  const calls = { reformulate: [], answer: [], enrich: [], embeddings: [] };
  const env = followUpEnv(calls);
  const baseFetch = globalThis.fetch;
  let enrichCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (JSON.parse(init.body).system.startsWith('You label podcast moments')) {
      enrichCalls++;
      return new Response('private upstream details', { status: 401 });
    }
    return baseFetch(url, init);
  };
  const result = await runPublicChat(env, { question: 'What was said about hospitality?', sourceMode: 'published', episodeId: null });
  assert.equal(result.status, 200);
  assert.equal(result.body.grounded, true);
  assert.equal(enrichCalls, 1);
  assert.doesNotMatch(JSON.stringify(result.body), /private upstream details/);
});
