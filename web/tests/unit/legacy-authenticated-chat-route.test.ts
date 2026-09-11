import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { legacyAuthenticatedChatConversationId } from "@/lib/ops/chat-route";

const redirectMock = vi.hoisted(() => vi.fn((pathname: string): never => { throw new Error(`redirect:${pathname}`); }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("legacy authenticated chat deep links", () => {
  it("extracts the opaque operator conversation id and ignores the slug", () => {
    expect(legacyAuthenticatedChatConversationId("/chat/cnv_12345678-operator")).toBe("cnv_12345678");
    expect(legacyAuthenticatedChatConversationId("/chat/cnv_abcd-efgh-operator_notes")).toBe("cnv_abcd-efgh");
  });

  it("fails closed for member ids, malformed ids, ordinary slugs, and the public root", () => {
    for (const pathname of [
      "/chat/mcnv_12345678-member-notes",
      "/chat/cnv_ab-operator",
      "/chat/cnv_12345678-",
      "/chat/cnv_12345678-Operator",
      "/chat/ordinary-slug",
      "/chat",
    ]) {
      expect(legacyAuthenticatedChatConversationId(pathname), pathname).toBeNull();
    }
  });

  it("redirects valid legacy operator links before the public route can render", async () => {
    const response = await middleware(new NextRequest("https://wtfhq.in/chat/cnv_12345678-operator"), {} as never);
    if (!response) throw new Error("middleware_response_missing");
    expect(response.headers.get("location")).toBe("https://wtfhq.in/beta/chat/cnv_12345678");
  });

  it("keeps the dynamic page fail-closed when middleware is bypassed", async () => {
    const { default: page } = await import("@/app/chat/[conversationSlug]/page");
    await expect(page({ params: Promise.resolve({ conversationSlug: "cnv_12345678-operator" }) })).rejects.toThrow("redirect:/beta/chat/cnv_12345678");
    await expect(page({ params: Promise.resolve({ conversationSlug: "ordinary-slug" }) })).rejects.toThrow("redirect:/chat");
    expect(redirectMock).toHaveBeenCalledTimes(2);
  });
});
