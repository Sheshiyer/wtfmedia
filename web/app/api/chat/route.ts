import { NextRequest } from "next/server";
import { embedQuery, chatStream, type ChatMessage } from "@/lib/nvidia";
import { search } from "@/lib/vectors";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are the wtfmedia research assistant. You answer questions about Nikhil Kamath's WTF podcast catalogue using ONLY the transcript excerpts provided as CONTEXT.

Rules:
- Ground every claim in the provided context. If the context does not contain the answer, say so plainly.
- Be concise and specific. Quote or paraphrase what guests actually said.
- When you use an excerpt, cite it inline like [1], [2] matching the numbered sources.
- Do not invent episodes, guests, or quotes.`;

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = body.messages || [];
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return new Response("no user message", { status: 400 });

  // 1) EMBEDDING model — retrieval inference
  let hits;
  try {
    const qvec = await embedQuery(last.content);
    hits = search(qvec, 6);
  } catch (e) {
    return new Response(`retrieval error: ${(e as Error).message}`, { status: 500 });
  }

  const fmtTime = (s?: number) => {
    if (s == null) return "";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const h = Math.floor(m / 60);
    return h > 0
      ? `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const context = hits
    .map(
      (h, i) =>
        `[${i + 1}] (${h.title}${h.start != null ? ` @ ${fmtTime(h.start)}` : ""})\n${h.text}`
    )
    .join("\n\n---\n\n");

  const sourcesHeader = JSON.stringify(
    hits.map((h, i) => ({
      n: i + 1,
      video_id: h.video_id,
      title: h.title,
      score: Number(h.score.toFixed(3)),
      t: h.start ?? null,
      time: fmtTime(h.start),
      url:
        h.start != null
          ? `https://www.youtube.com/watch?v=${h.video_id}&t=${h.start}s`
          : `https://www.youtube.com/watch?v=${h.video_id}`,
    }))
  );

  const chatMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    ...messages.filter((m) => m.role !== "system").slice(-6, -1),
    {
      role: "user",
      content: `CONTEXT:\n${context || "(no relevant excerpts found)"}\n\nQUESTION: ${last.content}`,
    },
  ];

  // 2) CHAT model — generation
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await chatStream(chatMessages, { temperature: 0.3, maxTokens: 900 });
  } catch (e) {
    return new Response(`chat error: ${(e as Error).message}`, { status: 500 });
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": encodeURIComponent(sourcesHeader),
      "Cache-Control": "no-store",
    },
  });
}
