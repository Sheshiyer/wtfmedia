import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

async function forward(edge: { fetch: (input: Request) => Promise<Response> } | null, localOrigin: string | undefined, request: Request, headers: Headers): Promise<Response> {
  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
  const outbound = new Request(request.url, init);
  // Local dev (WTFMEDIA_EDGE_LOCAL_ORIGIN is set in .env.local only, never in
  // deployed envs): the wrangler dev-registry service binding cannot consume
  // these requests, so forward over HTTP to the local edge worker instead.
  // Hop-by-hop headers from the upstream response are stripped — browsers
  // reject responses that re-emit them (Firefox reports NS_ERROR_* on an
  // otherwise-200 reply).
  if (!edge) {
    const url = new URL(request.url);
    const upstream = await fetch(new URL(url.pathname + url.search, localOrigin), init);
    const sanitized = new Headers(upstream.headers);
    for (const hop of ["connection", "transfer-encoding", "keep-alive", "content-length"]) sanitized.delete(hop);
    return new Response(upstream.body, { status: upstream.status, headers: sanitized });
  }
  return edge.fetch(outbound);
}

async function proxy(request: Request): Promise<Response> {
  try {
    const localOrigin = process.env.WTFMEDIA_EDGE_LOCAL_ORIGIN;
    const env = localOrigin ? null : (await getCloudflareContext({ async: true })).env;
    const edge = localOrigin ? null : (env?.WTFMEDIA_EDGE ?? null);
    if (!localOrigin && !edge) return Response.json({ error: "beta_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });

    const headers = new Headers(request.headers);
    // The edge never reads operator-context headers inbound; they are minted
    // for web route handlers only. Strip them so a browser cannot forward a
    // forged context toward the edge.
    headers.delete("x-wtf-ops-context");
    headers.delete("x-wtf-ops-proof");
    if (request.headers.has("authorization")) return await forward(edge, localOrigin, request, headers);

    try {
      const token = await (await auth()).getToken();
      if (token) headers.set("authorization", `Bearer ${token}`);
    } catch {
      // The edge remains the authorization boundary and fails closed without a token.
    }
    return await forward(edge, localOrigin, request, headers);
  } catch (error) {
    console.error("[beta-api-proxy]", error);
    return Response.json({ error: "beta_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
