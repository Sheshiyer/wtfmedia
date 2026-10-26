import { describe, expect, it } from "vitest";
import { parseChatConversationResponse } from "@/lib/ops/chat";

describe("authenticated chat metadata projection", () => {
  it("projects D1 history metadata into assistant source and model fields", () => {
    const parsed = parseChatConversationResponse({
      conversation: {
        id: "cnv_12345678-operator",
        title: "evidence",
        source_mode: "both",
        lifecycle_state: "active",
        created_at: "2026-09-02T00:00:00.000Z",
        updated_at: "2026-09-02T00:01:00.000Z",
        message_count: 2,
      },
      messages: [
        { id: "msg_user", role: "user", content: "question", created_at: "2026-09-02T00:00:00.000Z" },
        {
          id: "msg_assistant",
          role: "assistant",
          content: "answer [1]",
          created_at: "2026-09-02T00:01:00.000Z",
          source_metadata_json: JSON.stringify({
            sources: [{ n: 1, title: "Published episode", videoId: "yt-1", start: 42 }],
            moments: [{ videoId: "abcdefghijk", title: "Published episode", url: "https://www.youtube.com/watch?v=abcdefghijk&t=42s", chunkStart: 4, chunkEnd: 4, startSec: 42, endSec: 72, durationSec: 30, score: 0.9, timestampConfidence: 1, citationNumbers: [1], withinBudget: true, topic: "evidence practice", summary: "The guest describes an evidence practice.", whyRelevant: "It supports the answer.", strength: 5 }],
            totalMomentDurationSec: 30,
            durationBudgetSec: null,
            citedIndices: [1],
            sourceMode: "both",
            uncutUnavailable: false,
          }),
          grounding_state: "grounded",
          model: "test-model",
          model_fallback: 1,
          request_id: "rag-request-1",
        },
      ],
      policy: { archive: true, export: true },
    });

    expect(parsed?.conversation.messageCount).toBe(2);
    expect(parsed?.conversation.messages?.[1]).toMatchObject({
      groundingState: "grounded",
      model: "test-model",
      modelFallback: true,
      requestId: "rag-request-1",
      sourceMode: "both",
      sources: [{ n: 1, title: "Published episode", videoId: "yt-1", start: 42 }],
      moments: {
        moments: [expect.objectContaining({ videoId: "abcdefghijk", topic: "evidence practice" })],
        totalDurationSec: 30,
        budgetSec: null,
      },
      citedIndices: [1],
    });
  });
});
