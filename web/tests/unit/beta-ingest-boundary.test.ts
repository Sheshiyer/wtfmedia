import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const redirectMock = vi.hoisted(() => vi.fn((pathname: string): never => { throw new Error(`redirect:${pathname}`); }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("Beta ingest boundary", () => {
  it("redirects the legacy Beta ingest alias to the canonical workspace root", async () => {
    const response = await middleware(new NextRequest("https://beta-staging.wtfhq.in/beta/ops/ingest"), {} as never);
    if (!response) throw new Error("middleware_response_missing");
    expect(response.headers.get("location")).toBe("https://beta-staging.wtfhq.in/beta/workspace");
  });

  it("redirects the direct Beta ingest page without importing an ingest workspace", async () => {
    const { default: page } = await import("@/app/beta/workspace/ingest/page");
    expect(() => page()).toThrow("redirect:/beta/workspace");
    expect(redirectMock).toHaveBeenCalledWith("/beta/workspace");
  });
});
