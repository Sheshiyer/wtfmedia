import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canConfirmMemberConversationDeletion,
  linkedSavedPreferenceDeletionNotice,
  parseMemberConversationResponse,
} from "@/lib/member/chat";

const workspace = readFileSync(new URL("../../components/domain/member/MemberChatWorkspace.tsx", import.meta.url), "utf8");
const navigator = readFileSync(new URL("../../components/domain/member/MemberSessionNavigator.tsx", import.meta.url), "utf8");

describe("member conversation lifecycle", () => {
  it("keeps an optional safe linked-preference count from a conversation payload", () => {
    const parsed = parseMemberConversationResponse({
      conversation: {
        id: "mcnv_abcdefgh",
        title: "Evidence question",
        source_mode: "published",
        linked_saved_preference_count: 2,
      },
    });

    expect(parsed?.conversation.linkedSavedPreferenceCount).toBe(2);
    expect(parseMemberConversationResponse({ conversation: { id: "mcnv_abcdefgh", title: "Evidence question", source_mode: "published", linked_saved_preference_count: -1 } })?.conversation.linkedSavedPreferenceCount).toBeUndefined();
    expect(linkedSavedPreferenceDeletionNotice(2)).toBe("2 saved preferences stay separate and will not be deleted.");
  });

  it("requires an exact typed deletion acknowledgement before enabling permanent deletion", () => {
    expect(canConfirmMemberConversationDeletion("DELETE")).toBe(true);
    expect(canConfirmMemberConversationDeletion("delete")).toBe(false);
    expect(canConfirmMemberConversationDeletion("DELETE ")).toBe(false);
    expect(workspace).toContain('Type DELETE to confirm');
    expect(workspace).toContain("deleteConfirmation");
  });

  it("allows the active heading to wrap while preserving two-line rail titles", () => {
    expect(workspace).not.toContain("line-clamp-2 font-display");
    expect(navigator).toContain("line-clamp-2");
  });
});
