/**
 * Compatibility proof for web/app/api/chat/route.ts.
 *
 * Route source is frozen for Phase 1 (see phase1-baseline-approval.json).
 * These tests assert existing behavior; they never modify route.ts and
 * never call a live service — the upstream Worker is replaced by the
 * deterministic local stub in web/tests/support/rag-stub.mjs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startRagStub, triggerQuestion, DUMMY_SHARED_SECRET } from "../support/rag-stub.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(here, "../..");

/** @type {Awaited<ReturnType<typeof startRagStub>>} */
let stub: Awaited<ReturnType<typeof startRagStub>>;

beforeEach(async () => {
  stub = await startRagStub();
});

afterEach(async () => {
  await stub.close();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function importRoute(opts: { ragUrl?: string; sharedSecret?: string } = {}) {
  const ragUrl = opts.ragUrl ?? stub.url;
  const sharedSecret = "sharedSecret" in opts ? opts.sharedSecret : DUMMY_SHARED_SECRET;
  vi.resetModules();
  vi.stubEnv("CLOUDFLARE_RAG_URL", ragUrl);
  vi.stubEnv("CLOUDFLARE_EDGE_SHARED_SECRET", sharedSecret ?? "");
  return import("@/app/api/chat/route");
}

function chatRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function userMessage(content: string) {
  return { role: "user", content };
}

describe("POST /api/chat — malformed request", () => {
  it("returns 400 plain-text 'bad json' on invalid JSON", async () => {
    const { POST } = await importRoute();
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("bad json");
  });

  it.each([
    ["missing messages field", {}],
    ["empty messages array", { messages: [] }],
    ["non-array messages", { messages: "not-an-array" }],
    ["no user-role message", { messages: [{ role: "system", content: "setup" }] }],
    ["whitespace-only user content", { messages: [userMessage("   ")] }],
  ])("returns 400 plain-text 'no user message' for %s", async (_label, body) => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest(body));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("no user message");
    expect(stub.requestLog).toEqual([]);
  });

  it("returns 400 plain-text 'question too long' beyond 2000 characters", async () => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest({ messages: [userMessage("a".repeat(2001))] }));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("question too long");
    expect(stub.requestLog).toEqual([]);
  });
});

describe("POST /api/chat — history window", () => {
  it("keeps only the last 8 messages and selects the last user message within that window", async () => {
    const { POST } = await importRoute();
    const messages = [
      userMessage(triggerQuestion("status-500")),
      { role: "assistant", content: "irrelevant" },
      ...Array.from({ length: 6 }, (_, i) => ({ role: "assistant", content: `filler-${i}` })),
      userMessage("the real question"),
      { role: "assistant", content: "trailing assistant reply" },
    ];
    expect(messages).toHaveLength(10);
    const res = await POST(chatRequest({ messages }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Grounded answer text.");
    expect(stub.requestLog).toHaveLength(1);
    expect(stub.requestLog[0].trigger).toBe("(none)");
  });
});

describe("POST /api/chat — server-only edge authentication", () => {
  it("returns 503 JSON 'not configured' when the shared secret is unset", async () => {
    const { POST } = await importRoute({ sharedSecret: "" });
    const res = await POST(chatRequest({ messages: [userMessage("hello")] }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "The answer service is not configured." });
    expect(stub.requestLog).toEqual([]);
  });

  it("sends the shared secret only as the X-Edge-Secret header, never in the body", async () => {
    const { POST } = await importRoute();
    await POST(chatRequest({ messages: [userMessage("hello")] }));
    expect(stub.requestLog[0].hasSecretHeader).toBe(true);
    expect(stub.requestLog[0].hasClientIpHeader).toBe(true);
    expect(stub.requestLog[0].hasRequestIdHeader).toBe(true);
  });
});

describe("POST /api/chat — upstream failure branches", () => {
  it.each([
    ["network/timeout failure", "abort-connection"],
    ["upstream non-OK status", "status-500"],
    ["upstream malformed JSON", "malformed-json"],
    ["upstream missing string answer", "missing-answer"],
  ])("returns 503 JSON retry message on %s", async (_label, trigger) => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest({ messages: [userMessage(triggerQuestion(trigger))] }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "The answer service is temporarily unavailable. Please retry shortly." });
  });
});

describe("POST /api/chat — successful upstream answer", () => {
  it("returns a grounded plain-text answer with X-Fallback: false and mapped sources", async () => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest({ messages: [userMessage("what happened")] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Model")).toBe("cloudflare/llama-3.3-70b-instruct");
    expect(res.headers.get("X-Fallback")).toBe("false");
    expect(await res.text()).toBe("Grounded answer text.");

    const sources = JSON.parse(decodeURIComponent(res.headers.get("X-Sources")!));
    expect(sources).toEqual([
      { n: 1, video_id: "RSB58m7Xwhg", title: "Public Episode One", score: 0.91, t: 125, time: "02:05", url: "https://www.youtube.com/watch?v=RSB58m7Xwhg" },
      { n: 2, video_id: "QdWHGjReLUo", title: "Public Episode Two", score: 0.77, t: null, time: "", url: "https://www.youtube.com/watch?v=QdWHGjReLUo" },
    ]);
    for (const source of sources) {
      expect(Object.keys(source).sort()).toEqual(["n", "score", "t", "time", "title", "url", "video_id"]);
    }
  });

  it("returns an ungrounded/abstention answer with X-Fallback: true and empty sources", async () => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest({ messages: [userMessage(triggerQuestion("ungrounded"))] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Fallback")).toBe("true");
    expect(decodeURIComponent(res.headers.get("X-Sources")!)).toBe("[]");
  });

  it("falls back to an empty source array when upstream sources is not an array", async () => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest({ messages: [userMessage(triggerQuestion("sources-not-array"))] }));
    expect(res.status).toBe(200);
    expect(decodeURIComponent(res.headers.get("X-Sources")!)).toBe("[]");
  });
});

describe("POST /api/chat — security boundary", () => {
  it("never returns the shared secret, client IP, or request ID to the browser", async () => {
    const { POST } = await importRoute();
    const res = await POST(chatRequest({ messages: [userMessage("hello")] }, { "x-forwarded-for": "203.0.113.4, 10.0.0.1" }));
    const bodyText = await res.text();
    const headerText = [...res.headers.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");

    expect(bodyText).not.toContain(DUMMY_SHARED_SECRET);
    expect(headerText).not.toContain(DUMMY_SHARED_SECRET);
    expect(res.headers.get("X-Edge-Secret")).toBeNull();
    expect(res.headers.get("X-Client-IP")).toBeNull();
    expect(res.headers.get("X-Request-ID")).toBeNull();
  });
});

describe("route.ts compatibility freeze", () => {
  it("matches the owner-approved baseline hash — no diff permitted without a reviewed manifest change", () => {
    const approval = JSON.parse(fs.readFileSync(path.join(WEB_ROOT, "tests/contracts/phase1-baseline-approval.json"), "utf8"));
    const expected = approval.approved_protected_hashes.find((entry: { path: string }) => entry.path === "web/app/api/chat/route.ts");
    expect(expected).toBeDefined();
    const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(WEB_ROOT, "app/api/chat/route.ts"))).digest("hex");
    expect(actual).toBe(expected.sha256);
  });
});
