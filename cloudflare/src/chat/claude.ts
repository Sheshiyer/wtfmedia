/** Direct generation only; embeddings and evidence remain with their existing authorities. */
export type ClaudeEnv = { ANTHROPIC_API_KEY?: string };
export const CLAUDE_MODEL = "claude-sonnet-5-5";
type Message = { role: "system" | "user" | "assistant"; content: string };
type Options = { maxTokens?: number; signal?: AbortSignal; outputSchema?: Record<string, unknown>; timeoutMs?: number };

function failure(code: string, status?: number) {
  // Never expose provider bodies, credentials, prompts, or transport error details.
  return Object.assign(new Error(`claude_${code}`), status === undefined ? {} : { status });
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(failure("aborted")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function claudeChat(env: ClaudeEnv, messages: unknown[], options: Options = {}): Promise<{ answer: string; model: string }> {
  if (!env.ANTHROPIC_API_KEY?.trim()) throw failure("not_configured");
  const maxTokens = options.maxTokens ?? 3000;
  const timeoutMs = options.timeoutMs ?? 20000;
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || !Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 70000) throw failure("invalid_budget");
  if (!Array.isArray(messages) || !messages.length || !messages.every((item): item is Message => {
    if (!item || typeof item !== "object") return false;
    const m = item as Message;
    return ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string" && !!m.content.trim();
  })) throw failure("invalid_messages");
  const turns = messages.filter(m => m.role !== "system").map(({ role, content }) => ({ role, content }));
  if (turns[0]?.role !== "user" || turns.at(-1)?.role !== "user") throw failure("invalid_messages");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: messages.filter(m => m.role === "system").map(m => m.content).join("\n\n"),
    messages: turns,
    // Sonnet 5.5 rejects disabled thinking; no tools means only final text here.
    thinking: { type: "between_tools" },
    output_config: { effort: "low", ...(options.outputSchema ? { format: { type: "json_schema", schema: options.outputSchema } } : {}) },
  });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      signal.throwIfAborted();
      let response: Response;
      try {
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", signal,
          headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body,
        });
      } catch {
        if (signal.aborted) throw failure("aborted");
        if (attempt === 0) { await pause(250, signal); continue; }
        throw failure("transport_error");
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          const retryAfter = response.headers.get("retry-after");
          const delay = retryAfter === null ? 250 : /^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
          await pause(Number.isFinite(delay) ? Math.max(0, Math.min(delay, timeoutMs)) : 250, signal);
          continue;
        }
        throw failure(`http_${response.status}`, response.status);
      }
      let payload: { content?: Array<{ type?: string; text?: string }>; stop_reason?: string; model?: string };
      try { payload = await response.json(); } catch { throw failure("invalid_response"); }
      if (!payload || typeof payload !== "object") throw failure("invalid_response");
      if (payload.stop_reason !== "end_turn") {
        const known = ["refusal", "max_tokens", "model_context_window_exceeded", "tool_use", "pause_turn"];
        throw failure(known.includes(payload.stop_reason ?? "") ? payload.stop_reason! : "invalid_stop_reason");
      }
      if (payload.model !== CLAUDE_MODEL) throw failure("unexpected_model");
      const answer = Array.isArray(payload.content)
        ? payload.content.filter(block => block?.type === "text" && typeof block.text === "string").map(block => block.text).join("") : "";
      if (!answer.trim()) throw failure("empty_response");
      if (options.outputSchema) {
        try { JSON.parse(answer); } catch { throw failure("invalid_json"); }
        // Callers still validate types, enums, ranges and authority before executing plans.
      }
      return { answer, model: payload.model };
    }
    throw failure("unavailable");
  } catch (error) {
    if (signal.aborted) throw failure(options.signal?.aborted ? "aborted" : "timeout");
    throw error;
  } finally { clearTimeout(timer); }
}
