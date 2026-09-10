import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

async function proxy(request: Request): Promise<Response> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.WTFMEDIA_EDGE) return Response.json({ error: "beta_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
    if (request.headers.has("authorization")) return await env.WTFMEDIA_EDGE.fetch(request);

    const headers = new Headers(request.headers);
    try {
      const token = await (await auth()).getToken();
      if (token) headers.set("authorization", `Bearer ${token}`);
    } catch {
      // The edge remains the authorization boundary and fails closed without a token.
    }
    return await env.WTFMEDIA_EDGE.fetch(new Request(request, { headers }));
  } catch {
    return Response.json({ error: "beta_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}

export const GET = proxy;
export const POST = proxy;
