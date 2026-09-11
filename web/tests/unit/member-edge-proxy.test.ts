import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  hasBinding: true,
  contextFailure: false,
  edgeFetch: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => {
    if (state.contextFailure) throw new Error("context unavailable");
    return { env: state.hasBinding ? { WTFMEDIA_EDGE: { fetch: state.edgeFetch } } : {} };
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ getToken: state.getToken }),
}));

import { GET, POST } from "@/app/beta/api/[...path]/route";

describe("same-origin member API edge proxy", () => {
  beforeEach(() => {
    state.hasBinding = true;
    state.contextFailure = false;
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

  it("forwards member chat POST body and request identity while preserving the edge private response", async () => {
    state.edgeFetch.mockResolvedValue(new Response(JSON.stringify({ conversation: { id: "mcnv_12345678" } }), {
      status: 201,
      headers: { "cache-control": "private, no-store", "x-request-id": "edge-request-1" },
    }));
    const payload = { question: "What did the guest say?", sourceMode: "both" };
    const response = await POST(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "member-turn-123",
        "x-request-id": "browser-request-1",
        cookie: "__session=opaque",
      },
      body: JSON.stringify(payload),
    }));
    const forwarded = state.edgeFetch.mock.calls[0]?.[0] as Request;

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("edge-request-1");
    expect(forwarded.method).toBe("POST");
    expect(await forwarded.json()).toEqual(payload);
    expect(forwarded.headers.get("authorization")).toBe("Bearer member-session-token");
    expect(forwarded.headers.get("idempotency-key")).toBe("member-turn-123");
    expect(forwarded.headers.get("x-request-id")).toBe("browser-request-1");
    expect(forwarded.headers.get("cookie")).toBe("__session=opaque");
  });

  it("fails closed with a private 503 when the edge binding is unavailable", async () => {
    state.hasBinding = false;
    const response = await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta/api/context"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "beta_unavailable" });
    expect(state.edgeFetch).not.toHaveBeenCalled();
  });

  it("fails closed with a private 503 when the Cloudflare context cannot load", async () => {
    state.contextFailure = true;
    const response = await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta/api/context"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "beta_unavailable" });
    expect(state.edgeFetch).not.toHaveBeenCalled();
  });

  it("leaves authorization absent for the edge to deny when Clerk token lookup fails", async () => {
    state.getToken.mockRejectedValueOnce(new Error("session unavailable"));
    state.edgeFetch.mockResolvedValue(new Response(JSON.stringify({ error: "ops_unavailable" }), {
      status: 404,
      headers: { "cache-control": "private, no-store" },
    }));
    const response = await GET(new Request("https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta/api/context"));
    const forwarded = state.edgeFetch.mock.calls[0]?.[0] as Request;

    expect(response.status).toBe(404);
    expect(forwarded.headers.has("authorization")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
