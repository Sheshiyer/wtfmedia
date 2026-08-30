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
  const json = await res.json() as { data: Array<{ embedding: number[] }> };
  return Float32Array.from(json.data[0].embedding as number[]);
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class NvidiaChatError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "NvidiaChatError";
  }
}

const FIRST_TOKEN_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new NvidiaChatError(message, 504)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// Returns a streaming Response body (SSE) from NVIDIA — we re-stream plain text.
export async function chatStream(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<ReadableStream<Uint8Array>> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), FIRST_TOKEN_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
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
      signal: abort.signal,
    });
  } catch (error) {
    const detail = error instanceof Error && error.name === "AbortError"
      ? `no response within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s`
      : error instanceof Error ? error.message : "network error";
    throw new NvidiaChatError(`chat request failed: ${detail}`, 504);
  }
  if (!res.ok || !res.body) {
    clearTimeout(timeout);
    throw new NvidiaChatError(`chat ${res.status}: ${await res.text()}`, res.status);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const reader = res.body.getReader();

  // Do not return a response to Vercel until the provider has proved it can
  // emit content. Once a response is returned, HTTP makes a transparent
  // model retry impossible. This gate is what enables route-level fallback.
  const initialChunks: Uint8Array[] = [];
  try {
    while (initialChunks.length === 0) {
      const { done, value } = await withTimeout(
        reader.read(),
        FIRST_TOKEN_TIMEOUT_MS,
        `no first token within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s`
      );
      if (done) throw new NvidiaChatError("chat stream ended before producing content", 502);
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const payload = line.trim().replace(/^data:\s*/, "");
        if (!payload || payload === "[DONE]") continue;
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
          if (delta) initialChunks.push(encoder.encode(delta));
        } catch {
          // Ignore provider keep-alives and malformed partial frames.
        }
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of initialChunks) controller.enqueue(chunk);
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
              // Ignore provider keep-alives and malformed partial frames.
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
