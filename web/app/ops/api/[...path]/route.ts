import { getCloudflareContext } from "@opennextjs/cloudflare";

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
 * Worker the only authority for Access, release, role, and history checks.
 * The request URL and Access assertion are intentionally preserved so the
 * edge can enforce its configured hostname and verify the per-request JWT.
 */
async function proxy(request: Request): Promise<Response> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.WTFMEDIA_EDGE) return unavailable();
    return await env.WTFMEDIA_EDGE.fetch(request);
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
