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
  // Next's local dev server has no Cloudflare service binding. Keep the
  // production calendar interactive against the loopback-only local SQLite/D1
  // schema while leaving deployed requests on the Clerk-verified edge path.
  if (process.env.NODE_ENV === "development" && process.env.WTF_PRODUCTION_LOCAL_PREVIEW === "1" && new URL(request.url).pathname === "/ops/api/production") {
    try {
      const target = new URL(request.url);
      target.protocol = "http:";
      target.hostname = "127.0.0.1";
      target.port = "8788";
      const response = await fetch(target, {
        method: request.method,
        headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
        ...(request.method === "POST" ? { body: await request.text() } : {}),
        cache: "no-store",
      });
      return new Response(response.body, response);
    } catch {
      return Response.json({ error: "local_production_api_unavailable" }, { status: 503, headers: unavailableHeaders });
    }
  }
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
