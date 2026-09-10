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
 * Keep the browser-facing operator API same-origin while making the edge
 * Worker the only authority for Clerk, release, role, and history checks.
 * The request URL and Clerk session credential are intentionally preserved so the
 * edge can enforce its configured hostname and verify the per-request JWT.
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
      // Edge verification remains authoritative and denies requests without a token.
    }
    return await env.WTFMEDIA_EDGE.fetch(new Request(request, { headers }));
  } catch {
    return unavailable();
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
