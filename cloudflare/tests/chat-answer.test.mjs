import assert from "node:assert/strict";
import { test } from "node:test";
import { runChat } from "../src/chat/answer.ts";
import { prepareMemberTurn } from "../src/chat/member-history.ts";

const vector = Array.from({ length: 1024 }, () => 0.1);

function environment(matches, prompts = [], response = "The evidence supports this answer [1] and [2].") {
  return {
    AI: {
      async run(model, input) {
        if (model === "@cf/baai/bge-large-en-v1.5") return { data: [vector] };
        prompts.push(input?.messages);
        return { response };
      },
    },
    VECTORIZE: { async query() { return { matches }; }, async getByIds() { return []; } },
  };
}

test("shared authenticated runner returns the Alpha editor-sheet moment payload", async () => {
  const videoId = "abcdefghijk";
  const env = {
    AI: {
      async run(model, input) {
        if (model === "@cf/baai/bge-large-en-v1.5") return { data: [vector] };
        if (input?.messages?.[0]?.content?.includes("You label podcast moments")) {
          return { response: JSON.stringify({ m: 1, guest: "Nikhil Kamath", theme: "career path", topic: "building conviction", summary: "Nikhil describes building conviction through repeated work.", whyRelevant: "It directly answers how conviction develops.", strength: 5 }) };
        }
        return { response: "Nikhil describes the first step [1] and the next step [2]." };
      },
    },
    VECTORIZE: {
      async query() {
        return { matches: [
          { id: `${videoId}:4`, score: 0.94, metadata: { video_id: videoId, source_mode: "published", title: "Nikhil Kamath on building", text: "Nikhil describes the first step.", timestamped: true, start: 120 } },
          { id: `${videoId}:5`, score: 0.92, metadata: { video_id: videoId, source_mode: "published", title: "Nikhil Kamath on building", text: "Nikhil explains the next step.", timestamped: true, start: 150 } },
        ] };
      },
      async getByIds(ids) {
        return ids.flatMap((id) => id === `${videoId}:6`
          ? [{ id, metadata: { start: 180, text: "The following passage." } }]
          : id === `${videoId}:5`
            ? [{ id, metadata: { start: 150, text: "Nikhil explains the next step." } }]
            : []);
      },
    },
  };

  const answer = await runChat({ question: "What did Nikhil Kamath say about building conviction?", sourceMode: "published" }, env);

  assert.equal(answer.moments?.length, 1);
  assert.deepEqual(answer.citedIndices, [1, 2]);
  assert.deepEqual(answer.moments?.[0], {
    videoId,
    title: "Nikhil Kamath on building",
    url: `https://www.youtube.com/watch?v=${videoId}&t=120s`,
    chunkStart: 4,
    chunkEnd: 5,
    startSec: 120,
    endSec: 180,
    durationSec: 60,
    score: 0.94,
    timestampConfidence: null,
    citationNumbers: [1, 2],
    withinBudget: true,
    guest: "Nikhil Kamath",
    theme: "career path",
    topic: "building conviction",
    summary: "Nikhil describes building conviction through repeated work.",
    whyRelevant: "It directly answers how conviction develops.",
    strength: 5,
  });
  assert.equal(answer.totalMomentDurationSec, 60);
  assert.equal(answer.durationBudgetSec, null);
});

test("shared authenticated runner preserves published YouTube and uncut provenance", async () => {
  const answer = await runChat({ question: "What did the guest say?", sourceMode: "both", requestId: "rag-test-1" }, environment([
    { id: "uncut-segment", score: 0.91, metadata: { video_id: "uncut-video", source_mode: "uncut", source: "uncut:asset-1", title: "Uncut episode", text: "uncut evidence", timestamped: true, start: 18 } },
    { id: "published-segment", score: 0.9, metadata: { video_id: "published-video", source_mode: "published", title: "Published YouTube episode", text: "published evidence", timestamped: true, start: 42 } },
  ]));

  assert.equal(answer.grounded, true);
  assert.equal(answer.sourceMode, "both");
  assert.equal(answer.requestId, "rag-test-1");
  assert.deepEqual(answer.sources.map((source) => source.sourceMode).sort(), ["published", "uncut"]);
  assert.equal(answer.sources.find((source) => source.sourceMode === "uncut")?.url, "uncut:asset-1");
  assert.match(answer.sources.find((source) => source.sourceMode === "published")?.url ?? "", /youtube\.com\/watch/);
});

test("saved memory reaches the runner as bounded context, never as evidence", async () => {
  const prompts = [];
  await runChat({
    question: "What did the guest say?",
    sourceMode: "published",
    memory: ["prefers concise answers", "second context"],
  }, environment([
    { id: "published-segment-a", score: 0.91, metadata: { video_id: "published-video", source_mode: "published", title: "Published episode A", text: "evidence A", timestamped: true, start: 42 } },
    { id: "published-segment-b", score: 0.9, metadata: { video_id: "published-video-b", source_mode: "published", title: "Published episode B", text: "evidence B", timestamped: true, start: 84 } },
  ], prompts));
  const answerPrompt = JSON.stringify(prompts.at(-1));
  assert.match(answerPrompt, /prefers concise answers/);
  assert.match(answerPrompt, /context only/);
});

test("prior conversation is bounded and distinguished from retrieved evidence", async () => {
  const prompts = [];
  await runChat({
    question: "What did the guest say?",
    priorTurns: [
      { role: "user", content: "oldest excluded topic" },
      ...Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `recent topic ${i} ${"x".repeat(2400)}` })),
    ],
  }, environment([
    { id: "a", score: 0.91, metadata: { video_id: "a", source_mode: "published", title: "Episode A", text: "retrieved evidence A" } },
    { id: "b", score: 0.9, metadata: { video_id: "b", source_mode: "published", title: "Episode B", text: "retrieved evidence B" } },
  ], prompts));
  const messages = prompts.at(-1);
  const prompt = messages[1].content;
  assert.match(prompt, /recent topic 7/);
  assert.doesNotMatch(prompt, /oldest excluded topic/);
  assert.ok(prompt.length < 10_000, "prior conversation must have an aggregate character bound");
  assert.match(prompt, /CONVERSATION CONTEXT/);
  assert.match(messages[0].content, /conversation.*not.*evidence/i);
  assert.match(prompt, /CONTEXT:\n\[1\].*Episode A/s);
  assert.equal(messages.length, 2, "prior assistant text must not become privileged chat messages");
});

test("a member follow-up uses prior user topic to retrieve fresh transcript evidence", async () => {
  const embedded = [];
  const env = environment([]);
  env.AI.run = async (_model, input) => { embedded.push(input.text); return { data: [vector] }; };
  const result = await runChat({ question: "What about the second point?", priorTurns: [{ role: "user", content: "Explain the discussion of batteries" }, { role: "assistant", content: "previous answer is not evidence" }] }, env);
  assert.match(embedded[0], /discussion of batteries/);
  assert.match(embedded[0], /What about the second point/);
  assert.doesNotMatch(embedded[0], /previous answer is not evidence/);
  assert.equal(result.grounded, false, "prior answers alone must not satisfy the evidence gate");
});

const episodeId = "abcdefghijk";
function excerpt(id, videoId = episodeId, sourceMode = "published", title = "Battery discussion") {
  return {
    id,
    score: 0.9,
    metadata: { video_id: videoId, source_mode: sourceMode, source: `uncut:asset-${videoId}`, title, text: "The guest explained how battery costs fell.", timestamped: true, start: 42 },
  };
}

for (const mode of ["published", "uncut", "both"]) {
  test(`episode-scoped ${mode} inference retains multiple excerpts from its one episode`, async () => {
    const matches = mode === "both"
      ? [excerpt("u1", episodeId, "uncut"), excerpt("p1")]
      : [excerpt("one", episodeId, mode), excerpt("two", episodeId, mode)];
    const answer = await runChat({ question: "What was said about batteries?", sourceMode: mode, episodeId }, environment(matches));
    assert.equal(answer.grounded, true);
    assert.equal(answer.modelFallback, false);
    assert.equal(answer.sources.length, 2);
    assert.ok(answer.sources.every((source) => source.videoId === episodeId));
  });
}

test("a follow-up retains the latest prior user name instead of unrelated high-scoring guests", async () => {
  const matches = [
    excerpt("other", "lmnopqrstuv", "published", "Other guest"),
    excerpt("named-one", episodeId, "published", "Nikhil Kamath"),
    excerpt("named-two", episodeId, "published", "Nikhil Kamath"),
  ];
  const answer = await runChat({ question: "What about his investment views?", priorTurns: [
    { role: "user", content: "What did Nikhil Kamath say about risk?" },
    { role: "assistant", content: "Other Guest should not supply an entity anchor." },
    { role: "user", content: "Can you explain further?" },
  ] }, environment(matches));
  assert.equal(answer.modelFallback, false);
  assert.deepEqual(answer.sources.map((source) => source.segmentId), ["named-one", "named-two"]);
});

test("an explicit new person replaces the prior name for retrieval and evidence filtering", async () => {
  const embedded = [];
  const env = environment([
    excerpt("old", episodeId, "published", "Nikhil Kamath"),
    excerpt("new-one", "lmnopqrstuv", "published", "Bill Gates"),
    excerpt("new-two", "lmnopqrstuv", "published", "Bill Gates"),
  ]);
  const originalRun = env.AI.run;
  env.AI.run = async (model, input) => { if (input.text) embedded.push(input.text); return originalRun(model, input); };
  const answer = await runChat({ question: "What did Bill Gates say?", priorTurns: [{ role: "user", content: "What did Nikhil Kamath say?" }] }, env);
  assert.deepEqual(answer.sources.map((source) => source.segmentId), ["new-one", "new-two"]);
  assert.doesNotMatch(embedded[0], /Nikhil Kamath/);
});

for (const invalid of [undefined, NaN, Infinity, -Infinity, "0.9"]) {
  test(`retrieval rejects invalid score ${String(invalid)} before counting evidence`, async () => {
    const bad = excerpt("bad", "lmnopqrstuv");
    bad.score = invalid;
    const prompts = [];
    const answer = await runChat({ question: "What was said about batteries?" }, environment([excerpt("good"), bad], prompts));
    assert.equal(answer.grounded, false);
    assert.equal(answer.sources.length, 1);
    assert.equal(prompts.length, 0, "one valid excerpt cannot enter inference");
  });
}

for (const invalid of [undefined, null, "", "  \n ", 123]) {
  test(`retrieval rejects blank or non-text excerpts ${JSON.stringify(invalid)} before inference`, async () => {
    const bad = excerpt("bad", "lmnopqrstuv");
    bad.metadata.text = invalid;
    const prompts = [];
    const answer = await runChat({ question: "What was said about batteries?" }, environment([excerpt("good"), bad], prompts));
    assert.equal(answer.grounded, false);
    assert.equal(answer.sources.length, 1);
    assert.equal(prompts.length, 0);
  });
}

for (const response of [
  "A cited sentence [1]. An unsupported factual sentence.",
  "A cited paragraph [1].\n\nAn uncited paragraph with no final punctuation",
  "- A cited item [1].\n- An uncited list item",
  "A factual claim.\n\n[1]",
  "## Batteries last forever\nA cited sentence [1].",
  "A valid source [1] followed by an unknown source [99].",
]) {
  test(`uncited prose or invalid citation falls back to excerpts: ${response}`, async () => {
    const answer = await runChat({ question: "What was said about batteries?" }, environment([excerpt("a"), excerpt("b", "lmnopqrstuv")], [], response));
    assert.equal(answer.modelFallback, true);
    assert.match(answer.answer, /closest cited excerpts/);
    assert.match(answer.answer, /battery costs fell/);
    assert.doesNotMatch(answer.answer, /unsupported factual sentence|uncited paragraph|uncited list item/);
  });
}

for (const response of [
  "Costs fell [1]. Efficiency improved [2].",
  "Costs fell. [1] Efficiency improved. [2]",
  "## Findings\n1. Costs fell by 3.5 percent [1].\n2. Dr. Smith described efficiency [2].",
]) {
  test(`fully cited prose survives without fallback: ${response}`, async () => {
    const answer = await runChat({ question: "What was said about batteries?" }, environment([excerpt("a"), excerpt("b", "lmnopqrstuv")], [], response));
    assert.equal(answer.answer, response);
    assert.equal(answer.modelFallback, false);
  });
}

test("invalid member episode IDs are denied before any database access", async () => {
  const db = { prepare() { assert.fail("invalid episode scope reached the database"); } };
  for (const invalid of ["short", "abcdefghijkl", "a".repeat(128), "bad/id", null, 42]) {
    const turn = await prepareMemberTurn(db, 1, undefined, { question: "Question", episodeId: invalid, idempotencyKey: "test-request-key", requestId: "test-request-id" });
    assert.equal(turn, null);
  }
});

test("public generation shares scoped evidence and citation coverage while keeping its JSON adapter", async () => {
  const { default: worker } = await import("../src/index.ts");
  const env = {
    ...environment([excerpt("a"), excerpt("b")], [], "Cited fact [1]. Uncited assertion."),
    EDGE_SHARED_SECRET: "local-contract-only",
    ALLOWED_ORIGIN: "https://public.test",
    WTFMEDIA_STATE: { get: async () => null, put: async () => {} },
  };
  const response = await worker.fetch(new Request("https://edge.test/v1/chat", {
    method: "POST", headers: { "content-type": "application/json", "x-edge-secret": env.EDGE_SHARED_SECRET, "x-request-id": "public-contract-request" },
    body: JSON.stringify({ question: "What was said about batteries?", episodeId, sourceMode: "published" }),
  }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), "public-contract-request");
  const answer = await response.json();
  assert.equal(answer.sources.length, 2);
  assert.equal(answer.modelFallback, true);
  assert.match(answer.answer, /closest cited excerpts/);
});
