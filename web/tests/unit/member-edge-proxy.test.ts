import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  hasBinding: true,
  edgeFetch: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: state.hasBinding ? { WTFMEDIA_EDGE: { fetch: state.edgeFetch } } : {},
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ getToken: state.getToken }),
}));

import { GET } from "@/app/beta/api/[...path]/route";

describe("same-origin member API edge proxy", () => {
  beforeEach(() => {
    state.hasBinding = true;
    state.edgeFetch.mockReset();
    state.getToken.mockReset();
    state.getToken.mockResolvedValue("member-session-token");
    state.edgeFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  it("forwards a Clerk server-session token when a browser request has no bearer credential", async () => {
    const response = await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta/api/context"));
    const forwarded = state.edgeFetch.mock.calls[0]?.[0] as Request;

    expect(response.status).toBe(200);
    expect(state.getToken).toHaveBeenCalledOnce();
    expect(forwarded.headers.get("authorization")).toBe("Bearer member-session-token");
  });

  it("preserves a supplied bearer credential without replacing it", async () => {
    await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta/api/context", {
      headers: { authorization: "Bearer browser-token" },
    }));
    const forwarded = state.edgeFetch.mock.calls[0]?.[0] as Request;

    expect(state.getToken).not.toHaveBeenCalled();
    expect(forwarded.headers.get("authorization")).toBe("Bearer browser-token");
  });
});
