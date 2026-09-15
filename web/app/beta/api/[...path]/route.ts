import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

async function forward(edge: { fetch: (input: Request) => Promise<Response> } | null, localOrigin: string | undefined, request: Request, headers: Headers): Promise<Response> {
  if (!edge) {
    const init: RequestInit = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
    const url = new URL(request.url);
    const upstream = await fetch(new URL(url.pathname + url.search, localOrigin), init);
    // Strip hop-by-hop headers from the upstream response — browsers reject
    // responses that re-emit them (Firefox reports NS_ERROR_*).
    const sanitized = new Headers(upstream.headers);
    for (const hop of ["connection", "transfer-encoding", "keep-alive", "content-length"]) sanitized.delete(hop);
    if (url.pathname === "/beta/api/principal-context") console.log("[beta-api-proxy] principal-context upstream:", upstream.status, await upstream.clone().text().then((text) => text.slice(0, 300)));
    return new Response(upstream.body, { status: upstream.status, headers: sanitized });
  }
  // Deployed: forward the ORIGINAL request object with stripped headers.
  // Rebuilding from a URL string drops the internal routing context and the
  // subrequest leaves the service binding — Cloudflare answers 1003.
  return edge.fetch(new Request(request, { headers }));
}

async function proxy(request: Request): Promise<Response> {
  try {
    // The local HTTP forwarder is for `next dev` only. .env.local is baked
    // into deployed builds too, so gate on the REQUEST being local — a leaked
    // WTFMEDIA_EDGE_LOCAL_ORIGIN must never divert deployed traffic.
    const host = new URL(request.url).hostname;
    const localOrigin = host === "localhost" || host === "127.0.0.1" ? process.env.WTFMEDIA_EDGE_LOCAL_ORIGIN : undefined;
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
