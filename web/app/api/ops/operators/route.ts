import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const unavailableHeaders = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

function unavailable() {
  return Response.json({ error: "ops_unavailable" }, { status: 503, headers: unavailableHeaders });
}

/**
 * Keep the canonical Beta admin roster same-origin while making the edge
 * Worker the only authority for Clerk identity, role, and D1 roster reads.
 * The browser may supply a bearer token, but it is never decoded or trusted
 * by this route; the bound edge verifies it and applies operator policy.
 */
async function proxy(request: Request): Promise<Response> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.WTFMEDIA_EDGE) return unavailable();
    if (request.headers.has("authorization")) return await env.WTFMEDIA_EDGE.fetch(request);

    const headers = new Headers(request.headers);
    try {
      const token = await (await auth()).getToken();
      if (token) headers.set("authorization", `Bearer ${token}`);
    } catch {
      // The edge remains the authority and fails closed without a token.
    }
    return await env.WTFMEDIA_EDGE.fetch(new Request(request, { headers }));
  } catch {
    return unavailable();
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
