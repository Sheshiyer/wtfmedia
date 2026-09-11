import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appendMemberHistoryPage,
  memberCommittedRequestForRetry,
  memberSessionIsAdmitted,
  memberConversationHref,
  memberGreeting,
  parseMemberConversationResponse,
  parseMemberHistoryResponse,
  memberAnswerPresentation,
  retryIntentForMemberResponse,
  shouldFinishMemberPaginationRequest,
  sourceModeForMemberQuestion,
  shouldApplyMemberResponse,
  shouldKeepMemberScrollPinned,
} from "@/lib/member/chat";

const memberWorkspace = readFileSync(new URL("../../components/domain/member/MemberChatWorkspace.tsx", import.meta.url), "utf8");
const betaChatAdapter = readFileSync(new URL("../../components/domain/beta/BetaChatAdapter.ts", import.meta.url), "utf8");
const sourcePanel = readFileSync(new URL("../../components/domain/public/SourcePanel.tsx", import.meta.url), "utf8");

describe("member chat client contract", () => {
  it("projects an owned retryable conversation without exposing infrastructure fields", () => {
    const parsed = parseMemberConversationResponse({
      conversation: {
        id: "mcnv_12345678",
        title: "Evidence question",
        source_mode: "published",
        lifecycle_state: "active",
        created_at: "2026-09-11T00:00:00.000Z",
        updated_at: "2026-09-11T00:01:00.000Z",
      },
      messages: [{ id: "mmsg_12345678", role: "user", content: "Question", created_at: "2026-09-11T00:00:00.000Z" }],
      retryable: true,
    });

    expect(parsed).toMatchObject({ retryable: true, conversation: { id: "mcnv_12345678", sourceMode: "published" } });
    expect(memberConversationHref(parsed!.conversation.id)).toBe("/beta/chat/mcnv_12345678");
  });

  it("retains an opaque next cursor while rejecting malformed conversation ids", () => {
    expect(parseMemberHistoryResponse({
      conversations: [{ id: "mcnv_abcdefgh", title: "Saved", source_mode: "both", lifecycle_state: "active" }],
      nextCursor: "opaque.cursor:1",
    })).toMatchObject({ nextCursor: "opaque.cursor:1" });
    expect(memberConversationHref("not-a-member-conversation")).toBeNull();
  });

  it("uses only a short display name with a neutral greeting fallback", () => {
    expect(memberGreeting("Asha", "Asha Iyer")).toBe("Welcome back, Asha");
    expect(memberGreeting("", "Asha Iyer")).toBe("Welcome back, Asha");
    expect(memberGreeting(undefined, undefined)).toBe("Welcome to your workspace");
  });

  it("does not apply a new-chat response after its originating route is stale", () => {
    expect(shouldApplyMemberResponse({ requestEpoch: 4, currentEpoch: 4, requestPath: "/beta", currentPath: "/beta" })).toBe(true);
    expect(shouldApplyMemberResponse({ requestEpoch: 4, currentEpoch: 5, requestPath: "/beta", currentPath: "/beta/settings" })).toBe(false);
  });

  it("recovers a pending loaded conversation with a fresh client retry key", () => {
    const pending = parseMemberConversationResponse({
      conversation: { id: "mcnv_abcdefgh", title: "Pending", source_mode: "both", lifecycle_state: "active" },
      messages: [{ id: "mmsg_abcdefgh", role: "user", content: "Continue this", created_at: "2026-09-11T00:00:00.000Z" }],
      retryable: true,
      retrySourceMode: "both",
    });

    expect(retryIntentForMemberResponse(pending!)).toEqual({ question: "Continue this", sourceMode: "both", resumeMessageId: "mmsg_abcdefgh" });
  });

  it("uses only the Edge-owned pending retry evidence scope", () => {
    const pending = parseMemberConversationResponse({
      conversation: { id: "mcnv_abcdefgh", title: "Pending", source_mode: "published", lifecycle_state: "active" },
      messages: [{ id: "mmsg_abcdefgh", role: "user", content: "Continue uncut", created_at: "2026-09-11T00:00:00.000Z" }],
      retryable: true,
      retrySourceMode: "uncut",
    });
    const missingScope = parseMemberConversationResponse({
      conversation: { id: "mcnv_abcdefgh", title: "Pending", source_mode: "both", lifecycle_state: "active" },
      messages: [{ id: "mmsg_abcdefgh", role: "user", content: "Do not infer scope", created_at: "2026-09-11T00:00:00.000Z" }],
      retryable: true,
    });

    expect(retryIntentForMemberResponse(pending!)).toMatchObject({ sourceMode: "uncut" });
    expect(retryIntentForMemberResponse(missingScope!)).toBeNull();
  });

  it("keeps the loaded conversation evidence mode for a continuation", () => {
    expect(sourceModeForMemberQuestion({ sourceMode: "uncut" }, null, "A follow-up")).toBe("uncut");
    expect(sourceModeForMemberQuestion({ sourceMode: "published" }, { question: "Retry me", sourceMode: "both", resumeMessageId: "mmsg_abcdefgh" }, "Retry me")).toBe("both");
    expect(sourceModeForMemberQuestion(null, null, "A new private question", "uncut")).toBe("uncut");
  });

  it("renders private member UI only for the admitted current session identity", () => {
    expect(memberSessionIsAdmitted({ isLoaded: true, isSignedIn: true, currentIdentity: "session-a", admittedIdentity: "session-a" })).toBe(true);
    expect(memberSessionIsAdmitted({ isLoaded: true, isSignedIn: true, currentIdentity: "session-b", admittedIdentity: "session-a" })).toBe(false);
    expect(memberSessionIsAdmitted({ isLoaded: true, isSignedIn: false, currentIdentity: null, admittedIdentity: "session-a" })).toBe(false);
  });

  it("reconciles a refreshed session page without duplicating a conversation", () => {
    const current = parseMemberHistoryResponse({
      conversations: [{ id: "mcnv_abcdefgh", title: "Earlier", source_mode: "published", lifecycle_state: "active" }],
      nextCursor: "cursor-1",
    })!;
    const next = parseMemberHistoryResponse({
      conversations: [
        { id: "mcnv_abcdefgh", title: "Earlier updated", source_mode: "published", lifecycle_state: "active" },
        { id: "mcnv_ijklmnop", title: "Older", source_mode: "both", lifecycle_state: "active" },
      ],
      nextCursor: null,
    })!;

    expect(appendMemberHistoryPage(current, next)).toMatchObject({
      nextCursor: null,
      conversations: [{ id: "mcnv_abcdefgh" }, { id: "mcnv_ijklmnop" }],
    });
  });

  it("reuses only the committed key for the exact unresolved turn", () => {
    const committed = {
      idempotencyKey: "request-key-123",
      conversationId: "mcnv_abcdefgh",
      question: "Continue this",
      sourceMode: "both" as const,
      resumeMessageId: "mmsg_abcdefgh",
    };

    expect(memberCommittedRequestForRetry(committed, { conversationId: "mcnv_abcdefgh", question: "Continue this", sourceMode: "both", resumeMessageId: "mmsg_abcdefgh" })).toBe(committed);
    expect(memberCommittedRequestForRetry(committed, { conversationId: "mcnv_abcdefgh", question: "Edited question", sourceMode: "both", resumeMessageId: "mmsg_abcdefgh" })).toBeNull();
    expect(memberCommittedRequestForRetry(committed, { conversationId: null, question: "Continue this", sourceMode: "both", resumeMessageId: "mmsg_abcdefgh" })).toBeNull();
  });

  it("does not let a superseded pagination request finish the current loading state", () => {
    expect(shouldFinishMemberPaginationRequest({ requestGeneration: 4, currentGeneration: 4 })).toBe(true);
    expect(shouldFinishMemberPaginationRequest({ requestGeneration: 4, currentGeneration: 5 })).toBe(false);
  });

  it("keeps only safe persisted answer state for truthful member presentation", () => {
    const parsed = parseMemberConversationResponse({
      conversation: { id: "mcnv_abcdefgh", title: "Evidence", source_mode: "both", lifecycle_state: "active" },
      messages: [{
        id: "mmsg_abcdefgh",
        role: "assistant",
        content: "The catalogue cannot support that claim.",
        created_at: "2026-09-11T00:01:00.000Z",
        grounding_state: "ungrounded",
        source_metadata_json: JSON.stringify({
          sourceMode: "both",
          uncutUnavailable: true,
          sources: [{ n: 4, title: "Cited episode", source_mode: "published", t: 42, model: "hidden" }],
          moments: [{ videoId: "abcdefghijk", title: "Cited episode", url: "https://www.youtube.com/watch?v=abcdefghijk&t=42s", chunkStart: 4, chunkEnd: 4, startSec: 42, endSec: 72, durationSec: 30, score: 0.9, timestampConfidence: 1, citationNumbers: [4], withinBudget: true, topic: "evidence practice", summary: "The guest describes an evidence practice.", whyRelevant: "It supports the answer.", strength: 5 }],
          totalMomentDurationSec: 30,
          durationBudgetSec: null,
          citedIndices: [4],
          model: "hidden",
          requestId: "hidden",
        }),
        model: "hidden",
        request_id: "hidden",
        idempotency_key: "hidden",
      }],
    });

    expect(memberAnswerPresentation(parsed!.messages[0]!)).toEqual({
      abstained: true,
      uncutUnavailable: true,
      sources: [{ n: 4, title: "Cited episode", timeSec: 42, sourceMode: "published" }],
      moments: {
        moments: [expect.objectContaining({ videoId: "abcdefghijk", topic: "evidence practice", startSec: 42, endSec: 72 })],
        totalDurationSec: 30,
        budgetSec: null,
      },
      citedIndices: [4],
    });
    expect(parsed!.messages[0]).not.toHaveProperty("model");
    expect(parsed!.messages[0]).not.toHaveProperty("requestId");
    expect(parsed!.messages[0]).not.toHaveProperty("idempotencyKey");
  });

  it("only keeps a member thread pinned while the reader remains near its end", () => {
    expect(shouldKeepMemberScrollPinned({ scrollTop: 451, scrollHeight: 1000, clientHeight: 500 })).toBe(true);
    expect(shouldKeepMemberScrollPinned({ scrollTop: 300, scrollHeight: 1000, clientHeight: 500 })).toBe(false);
  });

  it("retries an unavailable selected conversation through its existing load path", () => {
    const unavailablePanel = memberWorkspace.split('state === "unavailable"')[1]?.split("{view ?")[0] ?? "";
    expect(unavailablePanel).toContain("onClick={() => void load()}");
    expect(unavailablePanel).toContain("retry loading conversation");
    expect(unavailablePanel).toContain("start a new question");
    expect(unavailablePanel).toContain("data-conversation-unavailable");
  });

  it("keeps archive and permanent deletion as distinct selected-session actions", () => {
    expect(memberWorkspace).toContain("archive conversation");
    expect(memberWorkspace).toContain("delete permanently");
    expect(betaChatAdapter).toContain('method: "DELETE"');
    expect(betaChatAdapter).toContain('confirmation: "DELETE"');
    expect(memberWorkspace).toContain("Saved preferences are separate and will not be deleted.");
    expect(memberWorkspace).toContain("data-selected-conversation-viewport");
  });

  it("renders persisted Alpha moment provenance through the shared source sheet", () => {
    expect(memberWorkspace).toContain("<SourcePanel");
    expect(memberWorkspace).toContain("citedIndices={presentation.citedIndices}");
    expect(memberWorkspace).toContain("moments={presentation.moments}");
    expect(memberWorkspace).toContain("question={sourceQuestion}");
    expect(sourcePanel).toContain("episode${citedEpisodeCount !== 1 ? \"s\" : \"\"} cited");
    expect(sourcePanel).toContain("download excel");
    expect(sourcePanel).toContain("w-full text-xs sm:w-auto");
  });

  it("keeps operator conversation requests on the existing edge route contract", () => {
    expect(betaChatAdapter).toContain("/ops/api/chat/conversations/${encodeURIComponent(conversationId)}");
    expect(betaChatAdapter).toContain("/ops/api/chat/conversations/${encodeURIComponent(conversationId)}/archive");
  });
});
