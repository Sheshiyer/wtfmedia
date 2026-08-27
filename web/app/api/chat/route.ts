import { NextRequest } from "next/server";
import type { ChatMessage } from "@/lib/nvidia";

export const runtime = "nodejs";
export const maxDuration = 30;

const EDGE_RAG_URL = process.env.CLOUDFLARE_RAG_URL || "https://wtfmedia-edge.sheshnarayan-iyer.workers.dev";
const EDGE_SHARED_SECRET = process.env.CLOUDFLARE_EDGE_SHARED_SECRET;
const MAX_MESSAGES = 8;
const MAX_QUESTION_CHARS = 2_000;

type EdgeSource = {
  n: number;
  score: number;
  videoId: string;
  title: string;
  url: string;
  start: number | null;
  timestamped: boolean;
};

type EdgeAnswer = {
  answer?: string;
  sources?: EdgeSource[];
  grounded?: boolean;
  error?: string;
};

function sourceHeader(sources: EdgeSource[]) {
  return JSON.stringify(sources.map((source) => ({
    n: source.n,
    video_id: source.videoId,
    title: source.title,
    score: source.score,
    t: source.start,
    time: source.start == null ? "" : new Date(source.start * 1_000).toISOString().slice(11, 19).replace(/^00:/, ""),
    url: source.url,
  })));
}

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const last = [...messages].reverse().find((message) => message.role === "user");
  if (!last?.content?.trim()) return new Response("no user message", { status: 400 });
  if (last.content.length > MAX_QUESTION_CHARS) return new Response("question too long", { status: 400 });
  if (!EDGE_SHARED_SECRET) return Response.json({ error: "The answer service is not configured." }, { status: 503 });

  let edge: Response;
  try {
    edge = await fetch(`${EDGE_RAG_URL}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Edge-Secret": EDGE_SHARED_SECRET,
        "X-Client-IP": req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        "X-Request-ID": crypto.randomUUID(),
      },
      body: JSON.stringify({ question: last.content }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return Response.json({ error: "The answer service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }

  const result = await edge.json().catch(() => undefined) as EdgeAnswer | undefined;
  if (!edge.ok || !result || typeof result.answer !== "string") {
    return Response.json({ error: "The answer service is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }
  const sources = Array.isArray(result.sources) ? result.sources : [];
  return new Response(result.answer, {
    status: edge.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": encodeURIComponent(sourceHeader(sources)),
      "X-Model": "cloudflare/llama-3.3-70b-instruct",
      "X-Fallback": result.grounded ? "false" : "true",
      "Cache-Control": "no-store",
    },
  });
}
