import assert from "node:assert/strict";
import test from "node:test";

import { runAlphaChat } from "../src/chat/alpha-gateway.ts";

test("Alpha gateway carries only the public chat contract into Beta persistence", async () => {
  let request;
  const result = await runAlphaChat({
    question: "What did the guest say about evidence?",
    sourceMode: "published",
    episodeId: "abcdefghijk",
    requestId: "beta-turn-1",
    priorTurns: [{ role: "user", content: "Earlier question" }],
    memory: ["must never cross the Alpha boundary"],
  }, {
    WTFMEDIA_ALPHA_WEB: {
      async fetch(value) {
        request = value;
        return new Response("The guest described evidence [1].", {
          headers: {
            "X-Sources": encodeURIComponent(JSON.stringify([{
              n: 1,
              score: 0.91,
              video_id: "abcdefghijk",
              title: "Evidence episode",
              url: "https://www.youtube.com/watch?v=abcdefghijk&t=42s",
              t: 42,
              source_mode: "published",
              mapping_status: "mapped",
              timestamp_status: "verified",
              segment_id: "abcdefghijk:4",
            }])),
            "X-Moments": encodeURIComponent(JSON.stringify({
              moments: [{
                video_id: "abcdefghijk",
                title: "Evidence episode",
                url: "https://www.youtube.com/watch?v=abcdefghijk&t=42s",
                start_sec: 42,
                end_sec: 72,
                duration_sec: 30,
                score: 0.91,
                timestamp_confidence: 1,
                citation_numbers: [1],
                within_budget: true,
                topic: "evidence",
                summary: "The guest describes evidence.",
                why_relevant: "It directly supports the answer.",
                strength: 5,
              }],
              total_duration_sec: 30,
              budget_sec: null,
            })),
            "X-Cited-Indices": "[1]",
            "X-Source-Mode": "published",
            "X-Uncut-Unavailable": "false",
            "X-Model": "alpha-model",
            "X-Fallback": "false",
          },
        });
      },
    },
  });

  assert.equal(request.url, "https://wtfhq.in/api/chat");
  const payload = await request.json();
  assert.deepEqual(payload.messages, [
    { role: "user", content: "Earlier question" },
    { role: "user", content: "What did the guest say about evidence?" },
  ]);
  assert.equal(JSON.stringify(payload).includes("must never cross"), false);
  assert.equal(result.answer, "The guest described evidence [1].");
  assert.equal(result.grounded, true);
  assert.equal(result.sources[0].segmentId, "abcdefghijk:4");
  assert.equal(result.moments[0].topic, "evidence");
  assert.deepEqual(result.citedIndices, [1]);
  assert.equal(result.requestId, "beta-turn-1");
});

test("Alpha gateway rejects transport failures and drops malformed public projections", async () => {
  await assert.rejects(() => runAlphaChat({ question: "question" }, {
    WTFMEDIA_ALPHA_WEB: { async fetch() { return new Response("unavailable", { status: 503 }); } },
  }), /alpha_chat_unavailable/);

  const result = await runAlphaChat({ question: "question" }, {
    WTFMEDIA_ALPHA_WEB: {
      async fetch() {
        return new Response("Truthful fallback.", {
          headers: {
            "X-Moments": encodeURIComponent(JSON.stringify({ moments: [{ video_id: "abcdefghijk", start_sec: 1, citation_numbers: [1, 99] }] })),
            "X-Sources": encodeURIComponent(JSON.stringify([{ n: 1, video_id: "abcdefghijk", title: "Episode", source_mode: "published", timestamp_status: "verified", t: 1 }])),
            "X-Cited-Indices": "[1, 99]",
            "X-Fallback": "true",
          },
        });
      },
    },
  });
  assert.equal(result.sources.length, 1);
  assert.deepEqual(result.moments[0].citationNumbers, [1]);
  assert.deepEqual(result.citedIndices, undefined);
  assert.equal(result.grounded, false);
  assert.equal(result.modelFallback, true);
});

test("Alpha gateway fails closed on undeclared answer markers and invalid episode scope", async () => {
  const env = {
    WTFMEDIA_ALPHA_WEB: {
      async fetch() {
        return new Response("Supported [1]. Unsupported [99].", {
          headers: {
            "X-Sources": encodeURIComponent(JSON.stringify([{
              n: 1,
              video_id: "abcdefghijk",
              title: "Episode",
              source_mode: "published",
              timestamp_status: "verified",
              t: 1,
            }])),
            "X-Cited-Indices": "[1]",
            "X-Fallback": "false",
          },
        });
      },
    },
  };
  const result = await runAlphaChat({ question: "question" }, env);
  assert.equal(result.grounded, false);
  assert.equal(result.citedIndices, undefined);
  await assert.rejects(
    () => runAlphaChat({ question: "question", episodeId: "private-d1-id" }, env),
    /invalid_episode_id/,
  );
});
