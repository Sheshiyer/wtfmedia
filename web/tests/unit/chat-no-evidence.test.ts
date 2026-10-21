import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConversationThread } from "@/components/domain/public/ConversationThread";
import { memberAnswerPresentation, type MemberMessage } from "@/lib/member/chat";

const content = "We don’t have enough information about that in the catalogue.";
const sources = [{ n: 1, title: "Candidate episode", videoId: "abcdefghijk", sourceMode: "published" as const }];

describe("answers without supporting evidence", () => {
  it.each(["retrieval_weak", "abstained"] as const)("hides stale evidence on public %s answers", (responseState) => {
    const html = renderToStaticMarkup(createElement(ConversationThread, {
      messages: [{ role: "assistant", content, sources, citedIndices: [1], responseState, abstained: true }],
      loading: false, onRetry() {},
    }));
    expect(html).toContain(content);
    expect(html).not.toContain('data-testid="source-panel"');
    expect(html).not.toContain('data-testid="abstention-label"');
    expect(html).not.toContain("Candidate episode");
  });

  it.each(["retrieval_weak", "abstained", undefined] as const)("hides persisted member/operator evidence on %s answers", (responseState) => {
    const message: MemberMessage = {
      id: "mmsg_12345678", role: "assistant", content, createdAt: "2026-10-21T00:00:00Z",
      groundingState: "ungrounded", responseState, sources, citedIndices: [1], followUps: ["More detail?"],
    };
    const presentation = memberAnswerPresentation(message);
    expect(presentation.sources).toEqual([]);
    expect(presentation.citedIndices).toEqual([]);
    expect(presentation.moments).toBeUndefined();
    expect(presentation.followUps).toEqual([]);
  });

  it.each(["answered_grounded", "synthesis_invalid"] as const)("preserves actual cited evidence for %s", (responseState) => {
    const html = renderToStaticMarkup(createElement(ConversationThread, {
      messages: [{ role: "assistant", content: "Supported excerpt [1].", sources, citedIndices: [1], responseState, abstained: true }],
      loading: false, onRetry() {},
    }));
    expect(html).toContain('data-testid="source-panel"');
    const presentation = memberAnswerPresentation({
      id: "mmsg_12345678", role: "assistant", content: "Supported excerpt [1].", createdAt: "2026-10-21T00:00:00Z",
      groundingState: "grounded", responseState, sources, citedIndices: [1],
    });
    expect(presentation.sources).toEqual(sources);
    expect(presentation.citedIndices).toEqual([1]);
  });
});
