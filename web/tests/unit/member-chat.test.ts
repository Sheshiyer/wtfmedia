import { describe, expect, it } from "vitest";
import {
  appendMemberHistoryPage,
  memberCommittedRequestForRetry,
  memberSessionIsAdmitted,
  memberConversationHref,
  memberGreeting,
  parseMemberConversationResponse,
  parseMemberHistoryResponse,
  retryIntentForMemberResponse,
  shouldFinishMemberPaginationRequest,
  sourceModeForMemberQuestion,
  shouldApplyMemberResponse,
} from "@/lib/member/chat";

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
});
