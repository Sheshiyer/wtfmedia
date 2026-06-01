import { NextRequest } from "next/server";
import { DEFAULT_MODEL, isValidModel } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 120;

// Proxies to the local CrewAI + NeMo Agent Toolkit service (Python).
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8099/ask";

export async function POST(req: NextRequest) {
  let body: { messages?: { role: string; content: string }[]; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const messages = body.messages || [];
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return Response.json({ error: "no user message" }, { status: 400 });

  const model = body.model && isValidModel(body.model) ? body.model : DEFAULT_MODEL;

  try {
    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: last.content, model }),
      // crew runs can take a while
      signal: AbortSignal.timeout(115_000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `agent service ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      {
        error:
          "Crew service unavailable. Start it with `bash agent/run.sh` (local Python service on :8099).",
        detail: (e as Error).message,
      },
      { status: 503 }
    );
  }
}
