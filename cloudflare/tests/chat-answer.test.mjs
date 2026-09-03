import assert from "node:assert/strict";
import { test } from "node:test";
import { runChat } from "../src/chat/answer.ts";

const vector = Array.from({ length: 1024 }, () => 0.1);

function environment(matches) {
  return {
    AI: {
      async run(model) {
        if (model === "@cf/baai/bge-large-en-v1.5") return { data: [vector] };
        return { response: "The evidence supports this answer [1] and [2]." };
      },
    },
    VECTORIZE: { async query() { return { matches }; } },
  };
}

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
