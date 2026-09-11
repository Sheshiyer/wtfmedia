import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const state = vi.hoisted(() => ({
  edgeFetch: vi.fn(),
  getToken: vi.fn(),
  hasBinding: true,
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: state.hasBinding ? { WTFMEDIA_EDGE: { fetch: state.edgeFetch } } : {},
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ getToken: state.getToken }),
}));

import { GET } from "@/app/api/ops/operators/route";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Beta principal and admin roster runtime boundaries", () => {
  beforeEach(() => {
    state.edgeFetch.mockReset();
    state.getToken.mockReset();
    state.hasBinding = true;
    state.getToken.mockResolvedValue("server-session-token");
    state.edgeFetch.mockResolvedValue(new Response(JSON.stringify({ operators: [] }), { status: 200 }));
  });

  it("loads one principal per Clerk session and authorizes route changes synchronously", () => {
    const gate = source("components/domain/beta/BetaPrincipalGate.tsx");
    const landing = source("app/beta/page.tsx");

    expect(gate).toContain("principalRef");
    expect(gate).toContain("verifiedIdentityKeyRef");
    expect(gate).toContain("principalCanOpenPath");
    expect(gate).toContain("const admissionKey = identityKey");
    expect(gate).toContain("verifiedIdentityKeyRef.current === identityKey) return");
    expect(gate).toContain("admittedKey !== admissionKey");
    expect(gate).not.toContain('"revalidating"');
    expect(gate).not.toContain("RouteAdmissionState");
    expect(gate).toContain("/beta/api/principal-context");
    expect(gate).toContain('<GateState compact heading="checking access"');
    expect(gate).not.toContain("opening your workspace");
    expect(landing).not.toContain("opening your workspace");
    expect(landing).toContain("routing to your workspace");
  });

  it("does not put ingest in the Beta operator navigation", () => {
    const gate = source("components/domain/beta/BetaPrincipalGate.tsx");
    expect(gate).not.toContain('href: "/beta/workspace/ingest"');
  });

  it("forwards the admin roster request to the D1-backed edge route", async () => {
    const roster = {
      operators: [
        { name: "Owner", email: "owner@example.test", role: "super_admin", active: true, changedAt: null },
      ],
    };
    state.edgeFetch.mockResolvedValue(new Response(JSON.stringify(roster), {
      status: 200,
      headers: { "cache-control": "private, no-store" },
    }));

    const response = await GET(new Request("https://beta-staging.wtfhq.in/api/ops/operators"));
    const forwarded = state.edgeFetch.mock.calls[0]?.[0] as Request;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(roster);
    expect(new URL(forwarded.url).pathname).toBe("/api/ops/operators");
    expect(forwarded.headers.get("authorization")).toBe("Bearer server-session-token");
    expect(state.getToken).toHaveBeenCalledOnce();
  });

  it("preserves browser credentials and fails closed without the edge binding", async () => {
    await GET(new Request("https://beta-staging.wtfhq.in/api/ops/operators", {
      headers: { authorization: "Bearer browser-session-token" },
    }));
    expect(state.getToken).not.toHaveBeenCalled();
    expect((state.edgeFetch.mock.calls[0]?.[0] as Request).headers.get("authorization")).toBe("Bearer browser-session-token");

    state.hasBinding = false;
    const response = await GET(new Request("https://beta-staging.wtfhq.in/api/ops/operators"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "ops_unavailable" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
