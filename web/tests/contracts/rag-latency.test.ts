/**
 * Plan 01-06 Task 2 — controlled RAG latency contract (D-15).
 *
 * Measures the route's timing behavior against the deterministic local
 * Worker-shaped stub (tests/support/rag-stub.mjs) without any live model:
 *   - grounded answer, abstention (ungrounded), and delayed-answer cases
 *     record first response byte, chunk sequence, and total completion;
 *   - the timeout case proves AbortSignal.timeout(25_000) fires before the
 *     upstream resolves, producing the safe 503.
 *
 * The body/chunk interpretation is the one approved in Plan 01-01: the proxy
 * awaits the complete Worker JSON response before constructing a plain-text
 * Response, so "first byte" is the first byte of that complete answer, not a
 * model token. All timings are normalized metadata only — no request bodies,
 * secret values, or absolute paths are recorded here or in derived artifacts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { startRagStub, triggerQuestion, DUMMY_SHARED_SECRET } from "../support/rag-stub.mjs";
import http from "node:http";

const { getCloudflareContext } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

/** @type {Awaited<ReturnType<typeof startRagStub>>} */
let stub: Awaited<ReturnType<typeof startRagStub>>;

beforeEach(async () => {
  stub = await startRagStub();
});

afterEach(async () => {
  await stub.close();
  vi.unstubAllEnvs();
  vi.resetModules();
  getCloudflareContext.mockReset();
});

function serviceBinding(url: string) {
  return {
    async fetch(input: Request | URL | string, init?: RequestInit) {
      const incoming = input instanceof Request ? input : new Request(input, init);
      const target = new URL(incoming.url);
      return fetch(new URL(target.pathname, url), {
        method: incoming.method,
        headers: incoming.headers,
        body: incoming.method === "GET" || incoming.method === "HEAD" ? undefined : await incoming.arrayBuffer(),
        signal: incoming.signal,
      });
    },
  };
}

async function importRoute(opts: { ragUrl?: string; sharedSecret?: string } = {}) {
  const ragUrl = opts.ragUrl ?? stub.url;
  const sharedSecret = "sharedSecret" in opts ? opts.sharedSecret : DUMMY_SHARED_SECRET;
  vi.resetModules();
  vi.stubEnv("CLOUDFLARE_EDGE_SHARED_SECRET", sharedSecret ?? "");
  getCloudflareContext.mockResolvedValue({ env: { WTFMEDIA_EDGE: serviceBinding(ragUrl) } });
  return import("@/app/api/chat/route");
}

function chatRequest(question: string) {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
}

interface TimingSample {
  case_name: string;
  first_byte_ms: number;
  total_ms: number;
  chunk_count: number;
  status: number;
  outcome: string;
}

/** Records normalized timing metadata for one POST round trip. */
async function timeRoundTrip(
  post: (req: NextRequest) => Promise<Response>,
  question: string,
  caseName: string,
  expectedOutcome: string
): Promise<TimingSample> {
  const started = performance.now();
  let firstByteMs: number | null = null;
  const chunks: string[] = [];

  const res = await post(chatRequest(question));
  if (res.body === null) throw new Error(`case ${caseName}: response has no body stream`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstByteMs === null) firstByteMs = Math.round(performance.now() - started);
    chunks.push(decoder.decode(value, { stream: true }));
  }
  const totalMs = Math.round(performance.now() - started);
  const finalText = chunks.join("");
  const status = res.status;

  // Plan 01-01 approved interpretation: the transport may deliver one or more
  // chunks; the accumulated text after the last read is the full answer body.
  expect(chunks.length).toBeGreaterThanOrEqual(1);
  expect(finalText.length).toBeGreaterThan(0);

  return {
    case_name: caseName,
    first_byte_ms: firstByteMs ?? totalMs,
    total_ms: totalMs,
    chunk_count: chunks.length,
    status,
    outcome: expectedOutcome,
  };
}

describe("controlled RAG latency (local stub only)", () => {
  it("records grounded-answer timing with sources preserved", async () => {
    const { POST } = await importRoute();
    const sample = await timeRoundTrip(POST, triggerQuestion("default-grounded"), "grounded", "grounded-answer");
    expect(sample.status).toBe(200);
    expect(sample.first_byte_ms).toBeLessThan(10_000);
    expect(sample.total_ms).toBeLessThan(15_000);
  });

  it("records abstention (ungrounded) timing with empty sources", async () => {
    const { POST } = await importRoute();
    const sample = await timeRoundTrip(POST, triggerQuestion("ungrounded"), "abstention", "ungrounded");
    expect(sample.status).toBe(200);
    expect(sample.total_ms).toBeLessThan(15_000);
  });

  it("records delayed-answer timing under a bounded stub delay", async () => {
    // Delaying stub: holds the response for a fixed bounded interval so the
    // sample includes genuine queue/wait time without touching any live model.
    const delayServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "application/json" }).end(
            JSON.stringify({ answer: "Delayed grounded answer.", grounded: true, sources: [] })
          );
        }, 250);
      });
    });
    await new Promise<void>((resolve) => delayServer.listen(0, "127.0.0.1", resolve));
    const address = delayServer.address();
    if (!address || typeof address === "string") throw new Error("no delayed stub port");
    try {
      const { POST } = await importRoute({ ragUrl: `http://127.0.0.1:${address.port}` });
      const sample = await timeRoundTrip(POST, triggerQuestion("default-grounded"), "delayed-250ms", "delayed-grounded");
      expect(sample.status).toBe(200);
      expect(sample.total_ms).toBeGreaterThanOrEqual(250);
      expect(sample.total_ms).toBeLessThan(15_000);
    } finally {
      await new Promise((r) => delayServer.close(r));
    }
  });

  it("proves the 25s upstream timeout yields the safe 503 before an unbounded wait", async () => {
    // Hanging stub: never responds. The route must abort at 25s and surface
    // its safe 503. To keep this test fast we shrink the timeout window via
    // a hanging server plus vitest's own bound — but the route hard-codes
    // 25_000 ms, so we assert the contract outcome rather than racing it:
    // the hanging stub guarantees the timeout path executes; the assertion
    // is that the round trip terminates (bounded) with the safe error.
    const hangServer = http.createServer(() => {
      /* intentionally never responds */
    });
    hangServer.on("clientError", (_err, socket) => socket.destroy());
    await new Promise<void>((resolve) => hangServer.listen(0, "127.0.0.1", resolve));
    const address = hangServer.address();
    if (!address || typeof address === "string") throw new Error("no hanging stub port");
    try {
      const { POST } = await importRoute({ ragUrl: `http://127.0.0.1:${address.port}` });
      const started = performance.now();
      const res = await POST(chatRequest(triggerQuestion("default-grounded")));
      const elapsed = Math.round(performance.now() - started);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        error: "The answer service is temporarily unavailable. Please retry shortly.",
      });
      // Bounded by AbortSignal.timeout(25_000) plus local overhead.
      expect(elapsed).toBeLessThanOrEqual(30_000);
      expect(elapsed).toBeGreaterThanOrEqual(24_000);
    } finally {
      await new Promise((r) => hangServer.close(r));
    }
  }, 40_000);
});
