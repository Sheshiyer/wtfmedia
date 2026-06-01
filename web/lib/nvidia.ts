// NVIDIA NIM (OpenAI-compatible) client helpers — server-side only.
// Two models: an EMBEDDING model for retrieval inference, a CHAT model for generation.

const BASE = "https://integrate.api.nvidia.com/v1";

export const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";
export const CHAT_MODEL =
  process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.3-70b-instruct";

function key(): string {
  const k = process.env.NVIDIA_API_KEY;
  if (!k) throw new Error("NVIDIA_API_KEY is not set");
  return k;
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text],
      model: EMBED_MODEL,
      input_type: "query",
      encoding_format: "float",
      truncate: "END",
    }),
  });
  if (!res.ok) {
    throw new Error(`embed ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return Float32Array.from(json.data[0].embedding as number[]);
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Returns a streaming Response body (SSE) from NVIDIA — we re-stream plain text.
export async function chatStream(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || CHAT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`chat ${res.status}: ${await res.text()}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore keep-alive / partial frames
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
