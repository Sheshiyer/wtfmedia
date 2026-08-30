import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

const EDGE_SHARED_SECRET = process.env.EDGE_SHARED_SECRET ?? process.env.CLOUDFLARE_EDGE_SHARED_SECRET;
const MAX_BODY_BYTES = 16_000;

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSameOrigin(request: NextRequest, mutation: boolean) {
  const requestOrigin = request.nextUrl.origin;
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (origin && origin !== requestOrigin) return false;
  if (fetchSite && fetchSite !== "same-origin") return false;
  return mutation ? origin === requestOrigin && fetchSite === "same-origin" : true;
}

async function edgeBinding() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.WTFMEDIA_EDGE) throw new Error("wtfmedia_edge_binding_missing");
  return env.WTFMEDIA_EDGE;
}

export async function proxyCalendarRequest(
  request: NextRequest,
  targetPath: string,
  options: { mutation: boolean },
) {
  if (!isSameOrigin(request, options.mutation)) return jsonError("same_origin_required", 403);
  if (!EDGE_SHARED_SECRET) return jsonError("calendar_unavailable", 503);

  let body: string | undefined;
  if (options.mutation) {
    const contentType = request.headers.get("Content-Type")?.split(";", 1)[0];
    if (contentType !== "application/json") return jsonError("content_type_required", 415);
    const declared = Number(request.headers.get("Content-Length") || "0");
    if (declared > MAX_BODY_BYTES) return jsonError("body_too_large", 413);
    body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return jsonError("body_too_large", 413);
  }

  const headers = new Headers({
    "X-Edge-Secret": EDGE_SHARED_SECRET,
    "X-Client-IP": request.headers.get("cf-connecting-ip")?.trim() || "unknown",
    "X-Request-ID": crypto.randomUUID(),
  });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  try {
    const binding = await edgeBinding();
    const edge = await binding.fetch(new Request(`https://wtfmedia-edge.internal${targetPath}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }));
    const responseHeaders = new Headers({
      "Content-Type": edge.headers.get("Content-Type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    const requestId = edge.headers.get("X-Request-ID");
    if (requestId) responseHeaders.set("X-Request-ID", requestId);
    return new Response(await edge.text(), { status: edge.status, headers: responseHeaders });
  } catch {
    return jsonError("calendar_unavailable", 503);
  }
}
