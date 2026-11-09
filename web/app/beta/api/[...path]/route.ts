import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

async function proxy(request: Request): Promise<Response> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.WTFMEDIA_EDGE) return Response.json({ error: "beta_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
    return await env.WTFMEDIA_EDGE.fetch(request);
  } catch {
    return Response.json({ error: "beta_unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}

export const GET = proxy;
export const POST = proxy;
