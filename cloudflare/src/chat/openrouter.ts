/**
 * Shared OpenRouter chat completion lane. All generation (answers, moment
 * enrichment, reformulation, follow-ups) runs here on glm-5.3-flash so the
 * Workers AI per-minute inference cap no longer throttles the pipeline.
 * Embeddings stay on Workers AI — the vector index is bge-large and cannot
 * move without re-embedding the corpus.
 */

export type OpenRouterEnv = {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_API_KEY_2?: string;
  OPENROUTER_ANSWER_MODEL?: string;
};

export const OPENROUTER_GLM_MODEL = "z-ai/glm-5.3-flash";

// Key rotation: the primary key is tried first; only an auth/credit failure
// (401/402/403 — the key itself failing) falls through to the backup key.
// Transient upstream errors do not, so a model outage never masquerades as a
// key failure.
const KEY_FALLBACK_STATUSES = new Set([401, 402, 403]);

async function completion(apiKey: string, model: string, messages: unknown[], options: { maxTokens: number; temperature: number }) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://wtfhq.in",
      "X-Title": "Ask WTF",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      // glm-5.3 is a reasoning model; low effort keeps hidden reasoning from
      // eating the completion budget and adding latency.
      reasoning: { effort: "low" },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    const error = new Error(`openrouter ${response.status}: ${detail}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }
  const payload: any = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const answer = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => (typeof part?.text === "string" ? part.text : "")).join("")
      : "";
  if (!answer.trim()) throw new Error("empty openrouter answer response");
  return { answer, model };
}

/** One OpenRouter call with backup-key rotation. */
export async function openRouterChat(
  env: OpenRouterEnv,
  messages: unknown[],
  options: { maxTokens?: number; temperature?: number; model?: string } = {},
): Promise<{ answer: string; model: string }> {
  const keys = [env.OPENROUTER_API_KEY, env.OPENROUTER_API_KEY_2].filter(
    (key): key is string => typeof key === "string" && key.length > 0,
  );
  if (keys.length === 0) throw new Error("openrouter api key not configured");
  const model = options.model || env.OPENROUTER_ANSWER_MODEL || OPENROUTER_GLM_MODEL;
  const maxTokens = options.maxTokens ?? 3000;
  const temperature = options.temperature ?? 0.1;
  let lastError: Error | null = null;
  for (const [index, key] of keys.entries()) {
    try {
      return await completion(key, model, messages, { maxTokens, temperature });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("openrouter request failed");
      const status = (lastError as { status?: number }).status;
      const hasBackupKey = index < keys.length - 1;
      if (!hasBackupKey || status == null || !KEY_FALLBACK_STATUSES.has(status)) {
        throw lastError;
      }
      console.warn("wtfmedia openrouter primary key rejected, trying backup key", { status });
    }
  }
  throw lastError ?? new Error("openrouter request failed");
}

/** Compatibility wrapper for the existing export surface. */
export async function answerWithOpenRouter(env: OpenRouterEnv, messages: unknown[], modelOverride?: string) {
  return openRouterChat(env, messages, { maxTokens: 3000, temperature: 0.1, ...(modelOverride ? { model: modelOverride } : {}) });
}
