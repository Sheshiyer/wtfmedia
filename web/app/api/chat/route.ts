import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ChatMessage } from "@/lib/nvidia";
import { parseSourceMode, type SourceMode } from "@/lib/provenance/source-mode";

export const runtime = "nodejs";
export const maxDuration = 30;

const EDGE_SHARED_SECRET = process.env.EDGE_SHARED_SECRET ?? process.env.CLOUDFLARE_EDGE_SHARED_SECRET;
const MAX_MESSAGES = 8;
const MAX_QUESTION_CHARS = 2_000;

async function callAnswerService(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.WTFMEDIA_EDGE) throw new Error("wtfmedia_edge_binding_missing");
  return env.WTFMEDIA_EDGE.fetch(request);
}

type EdgeSource = {
  n: number;
  score: number;
  videoId: string;
  title: string;
  url: string;
  start: number | null;
  timestamped: boolean;
  sourceMode?: SourceMode;
  mappingStatus?: "mapped" | "unmapped" | "unavailable" | "conflicted";
  segmentId?: string;
};

type EdgeAnswer = {
  answer?: string;
  sources?: EdgeSource[];
  grounded?: boolean;
  sourceMode?: SourceMode;
  error?: string;
};

function sourceHeader(sources: EdgeSource[], sourceMode: SourceMode) {
  return JSON.stringify(sources.map((source) => {
    const mode = source.sourceMode ?? sourceMode;
    const start = mode === sourceMode ? source.start : null;
    return {
      n: source.n,
      video_id: source.videoId,
      title: source.title,
      score: source.score,
      t: start,
      time: start == null ? "" : new Date(start * 1_000).toISOString().slice(11, 19).replace(/^00:/, ""),
      url: source.url,
      source_mode: mode,
      mapping_status: source.mappingStatus ?? (start == null ? "unmapped" : "mapped"),
      segment_id: source.segmentId ?? null,
    };
  }));
}

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[]; sourceMode?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const last = [...messages].reverse().find((message) => message.role === "user");
  if (!last?.content?.trim()) return new Response("no user message", { status: 400 });
  if (last.content.length > MAX_QUESTION_CHARS) return new Response("question too long", { status: 400 });
  const sourceMode = parseSourceMode(body.sourceMode);
  if (!EDGE_SHARED_SECRET) return Response.json({ error: "The answer service is not configured." }, { status: 503 });

  let edge: Response;
  try {
    edge = await callAnswerService(new Request("https://wtfmedia-edge.internal/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Edge-Secret": EDGE_SHARED_SECRET,
        "X-Client-IP": req.headers.get("cf-connecting-ip")?.trim() || "unknown",
        "X-Request-ID": crypto.randomUUID(),
      },
      body: JSON.stringify({ question: last.content, sourceMode }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    }));
  } catch {
    return Response.json({ error: "The answer service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }

  const result = await edge.json().catch(() => undefined) as EdgeAnswer | undefined;
  if (!edge.ok || !result || typeof result.answer !== "string") {
    return Response.json({ error: "The answer service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const responseMode = parseSourceMode(result.sourceMode ?? sourceMode);
  return new Response(result.answer, {
    status: edge.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": encodeURIComponent(sourceHeader(sources, responseMode)),
      "X-Source-Mode": responseMode,
      "X-Model": "cloudflare/llama-3.3-70b-instruct",
      "X-Fallback": result.grounded ? "false" : "true",
      "Cache-Control": "no-store",
    },
  });
}
