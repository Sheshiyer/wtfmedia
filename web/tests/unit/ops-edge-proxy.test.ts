import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  hasBinding: true,
  edgeFetch: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: state.hasBinding ? { WTFMEDIA_EDGE: { fetch: state.edgeFetch } } : {},
  }),
}));

import { GET, POST } from "@/app/ops/api/[...path]/route";

describe("same-origin operator API edge proxy", () => {
  beforeEach(() => {
    state.hasBinding = true;
    state.edgeFetch.mockReset();
    state.edgeFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "cache-control": "private, no-store" },
    }));
  });

  it("forwards the original URL, method, body, and Access assertion", async () => {
    const request = new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/ops/api/chat/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-access-jwt-assertion": "verified-by-access",
      },
      body: JSON.stringify({ question: "hello" }),
    });

    const response = await POST(request);
    const forwarded = state.edgeFetch.mock.calls[0]?.[0] as Request;

    expect(response.status).toBe(200);
    expect(new URL(forwarded.url).hostname).toBe("wtfmedia-web-staging.connect2nikhai.workers.dev");
    expect(forwarded.method).toBe("POST");
    expect(forwarded.headers.get("cf-access-jwt-assertion")).toBe("verified-by-access");
    expect(await forwarded.json()).toEqual({ question: "hello" });
  });

  it("fails closed when the edge binding is unavailable", async () => {
    state.hasBinding = false;
    const response = await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/ops/api/release/authenticated-chat"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "ops_unavailable" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not expose binding failures to the browser", async () => {
    state.edgeFetch.mockRejectedValue(new Error("provider detail must stay server-side"));
    const response = await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/ops/api/chat"));
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).toBe(JSON.stringify({ error: "ops_unavailable" }));
    expect(body).not.toContain("provider detail");
  });
});
