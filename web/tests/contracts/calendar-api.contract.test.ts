import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCloudflareContext } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

const sharedSecret = "calendar-contract-shared-secret";
const eventId = `cal_${"a".repeat(32)}`;
const event = {
  id: eventId,
  title: "source receipt check",
  startsAt: "2026-08-29T18:30:00.000Z",
  timezone: "Asia/Kolkata",
  eventType: "review",
  ipLabel: "WTF",
  showLabel: "Main feed",
  owner: null,
  column: "on-calendar",
  tone: "knowledge",
  conflictState: "clear",
  notes: null,
  revision: 1,
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  getCloudflareContext.mockReset();
});

async function importRoutes(fetch = vi.fn().mockResolvedValue(Response.json({ event })), secret = sharedSecret) {
  vi.resetModules();
  vi.stubEnv("EDGE_SHARED_SECRET", secret);
  vi.stubEnv("CLOUDFLARE_EDGE_SHARED_SECRET", "");
  getCloudflareContext.mockResolvedValue({ env: { WTFMEDIA_EDGE: { fetch } } });
  const collection = await import("@/app/api/calendar/route");
  const member = await import("@/app/api/calendar/[id]/route");
  return { collection, member, fetch };
}

function mutationRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: path.includes(eventId) ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("public calendar same-origin boundary", () => {
  it("rejects a cross-origin mutation before calling the edge Worker", async () => {
    const { collection, fetch } = await importRoutes();
    const request = mutationRequest("/api/calendar", event, {
      Origin: "https://untrusted.example",
      "Sec-Fetch-Site": "cross-site",
    });
    const response = await collection.POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "same_origin_required" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the server-only edge secret is absent", async () => {
    const { collection, fetch } = await importRoutes(undefined, "");
    const response = await collection.POST(mutationRequest("/api/calendar", event));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "calendar_unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards create authority only through server-side headers", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ event }, {
      status: 201,
      headers: { "X-Request-ID": "calendar-upstream-receipt" },
    }));
    const { collection } = await importRoutes(upstream);
    const response = await collection.POST(mutationRequest("/api/calendar", event, {
      "Idempotency-Key": "calendar-contract-key-0001",
      "cf-connecting-ip": "198.51.100.20",
    }));
    expect(response.status).toBe(201);
    expect(upstream).toHaveBeenCalledTimes(1);
    const forwarded = upstream.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe("https://wtfmedia-edge.internal/v1/calendar");
    expect(forwarded.headers.get("X-Edge-Secret")).toBe(sharedSecret);
    expect(forwarded.headers.get("X-Client-IP")).toBe("198.51.100.20");
    expect(forwarded.headers.get("Idempotency-Key")).toBe("calendar-contract-key-0001");
    expect(await forwarded.json()).toEqual(event);
    expect(response.headers.get("X-Edge-Secret")).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain(sharedSecret);
  });

  it("forwards only the bounded list query and permits no-store reads", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ events: [event] }));
    const { collection } = await importRoutes(upstream);
    const request = new NextRequest(
      "http://localhost:3000/api/calendar?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z",
      { headers: { "Sec-Fetch-Site": "same-origin" } },
    );
    const response = await collection.GET(request);
    expect(response.status).toBe(200);
    const forwarded = upstream.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe("https://wtfmedia-edge.internal/v1/calendar?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("forwards revision updates and exposes no delete handler", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ event: { ...event, revision: 2 } }));
    const { member } = await importRoutes(upstream);
    const response = await member.PATCH(
      mutationRequest(`/api/calendar/${eventId}`, { revision: 1, column: "blocked" }),
      { params: Promise.resolve({ id: eventId }) },
    );
    expect(response.status).toBe(200);
    const forwarded = upstream.mock.calls[0][0] as Request;
    expect(forwarded.method).toBe("PATCH");
    expect(forwarded.url).toBe(`https://wtfmedia-edge.internal/v1/calendar/${eventId}`);
    expect("DELETE" in member).toBe(false);
  });
});
