import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canConfirmMemberConversationDeletion,
  linkedSavedPreferenceDeletionNotice,
  parseMemberConversationResponse,
  prependMemberConversationMessages,
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
    expect(workspace).toContain('title={view.conversation.title}');
    expect(workspace).toContain("line-clamp-2 max-h-[4.5rem]");
    expect(navigator).toContain("line-clamp-2");
  });

  it("uses the shared Alpha conversation frame instead of a private thread fork", () => {
    expect(workspace).toContain("ConversationThreadFrame");
    expect(workspace).toContain("renderFooter={() =>");
    expect(workspace).toContain('composerPlacement="fixed"');
    expect(workspace).toContain('placement="inline"');
  });

  it("keeps the selected conversation inside the viewport frame", () => {
    expect(workspace).toContain('flex h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] min-h-0 flex-col');
    expect(workspace).toContain('grid min-h-0 min-w-0 w-full flex-1');
    expect(workspace).toContain('section className="min-h-0 min-w-0"');
    expect(workspace).toContain('flex h-full min-h-0 flex-col');
    expect(workspace).not.toContain('section className="min-w-0 pb-60"');
  });

  it("keeps reverse-keyset pages chronological while retaining the next older cursor", () => {
    const current = parseMemberConversationResponse({
      conversation: { id: "mcnv_abcdefgh", title: "Evidence question", source_mode: "published" },
      messages: [
        { id: "mmsg_current1", role: "user", content: "newer question" },
        { id: "mmsg_current2", role: "assistant", content: "newer answer" },
      ],
      previousMessageCursor: "older_page_cursor",
    });
    const older = parseMemberConversationResponse({
      conversation: { id: "mcnv_abcdefgh", title: "Evidence question", source_mode: "published" },
      messages: [
        { id: "mmsg_older1", role: "user", content: "older question" },
        { id: "mmsg_older2", role: "assistant", content: "older answer" },
      ],
      previousMessageCursor: null,
    });

    expect(current?.previousMessageCursor).toBe("older_page_cursor");
    expect(current && older ? prependMemberConversationMessages(current, older).messages.map((message) => message.id) : []).toEqual(["mmsg_older1", "mmsg_older2", "mmsg_current1", "mmsg_current2"]);
    expect(current && older ? prependMemberConversationMessages(current, older).previousMessageCursor : "unexpected").toBeNull();
  });
});
