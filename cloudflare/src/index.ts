import {
  getOperatorByEmail,
  listOperators,
  createOperator,
  updateOperatorRole,
  deactivateOperator,
  reactivateOperator,
  logAuditEvent,
  queryAuditEvents,
  getSetting,
  setSetting,
  type Operator,
  type AuditAction,
  type DB,
} from "./db.ts";
import { handleOpsRequest, type OpsEnv } from "./ops-router.ts";
import { allowCalendarRequest, handleCalendarRequest } from "./calendar.ts";
import {
  parseEpisodeId,
  parseSourceMode,
  prioritizeMatchesForQuestionWithAnchor,
  resolveEpisodeScopedSources,
} from "./chat/source-mode.ts";
import { queryEvidenceSourcesForQuestion } from "./chat/evidence-coordinator.ts";
import {
  WTF_OS_CONVERSATION_SKILL,
  buildFollowUpGenerationInput,
  parseCitationMarkers,
  parseFollowUpCandidates,
  selectAnswerableFollowUps,
} from "./chat/skills/wtf-os-conversation.ts";
import {
  admitTranscriptJobs,
  type TranscriptJob,
} from "./catalogue/job-admission.ts";
import { ingestTranscriptJob } from "./catalogue/transcript-ingest.ts";

export interface Env extends OpsEnv {
  AI: any;
  VECTORIZE: any;
  WTFMEDIA_STATE: any;
  CATALOGUE: any;
  INGEST_QUEUE: any;
  DB: DB;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT_PER_MINUTE: string;
  INGEST_TOKEN: string;
  EDGE_SHARED_SECRET: string;
  CALENDAR_READ_RATE_LIMIT_PER_MINUTE?: string;
  CALENDAR_WRITE_RATE_LIMIT_PER_MINUTE?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_ANSWER_MODEL?: string;
}

const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
const DEFAULT_OPENROUTER_ANSWER_MODEL = "google/gemini-3.5-flash";
const ANSWER_MODELS = [
  "@cf/zai-org/glm-5.3-flash",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];
const FAST_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
// Models a visitor may force for a "retry with model" regeneration. All are
// served through OpenRouter; the allowlist keeps arbitrary (expensive) model
// strings out of a public, rate-limited endpoint.
const RETRYABLE_OPENROUTER_MODELS = new Set([
  "google/gemini-3.5-flash",
  "openai/gpt-5",
  "poolside/laguna-s-2.1",
  "thinkingmachines/inkling",
]);
const MAX_BODY_BYTES = 16_000;
const MAX_QUESTION_CHARS = 2_000;
const MAX_HISTORY_TURNS = 6;
const MIN_SCORE = 0.45;
type HistoryTurn = { role: "user" | "assistant"; content: string };

function cors(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  return origin === env.ALLOWED_ORIGIN
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : {};
}

function reply(request: Request, env: Env, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...cors(request, env), "Cache-Control": "no-store", "X-Request-ID": request.headers.get("X-Request-ID") || crypto.randomUUID() },
  });
}

async function vectorFor(env: Env, text: string): Promise<number[]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text });
  const vector = output?.data?.[0] ?? output?.data;
  if (!Array.isArray(vector) || vector.length !== 1024) {
    throw new Error("embedding response was not a 1024-dimensional vector");
  }
  return vector;
}

// glm-5.3-flash returns the OpenAI chat-completions shape (choices[0].message.content)
// while the llama models return { response } — accept both.
function extractAnswerText(result: any): string {
  if (typeof result === "string") return result;
  if (typeof result?.response === "string") return result.response;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part: any) => (typeof part?.text === "string" ? part.text : "")).join("");
  }
  return "";
}

async function answerWithWorkersAi(env: Env, model: string, messages: unknown[]) {
  const params: Record<string, unknown> = { messages, max_tokens: 900, temperature: 0.1 };
  // glm-5.3-flash is a reasoning model; low effort keeps hidden reasoning from
  // eating the completion budget and adding latency.
  if (model.includes("glm")) params.reasoning_effort = "low";
  const result = await env.AI.run(model, params);
  const answer = extractAnswerText(result);
  if (!answer.trim()) throw new Error("empty answer response");
  return { answer, model };
}

async function answerWithOpenRouter(env: Env, messages: unknown[], modelOverride?: string) {
  if (!env.OPENROUTER_API_KEY) throw new Error("openrouter api key not configured");
  const model = modelOverride || env.OPENROUTER_ANSWER_MODEL || DEFAULT_OPENROUTER_ANSWER_MODEL;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://wtfhq.in",
      "X-Title": "Ask WTF",
    },
    body: JSON.stringify({
      model,
      messages,
      // Reasoning models (gpt-5, inkling) burn hidden reasoning tokens against
      // this cap even with exclude:true — 900 starved them into empty answers.
      max_tokens: 3000,
      temperature: 0.1,
      reasoning: { exclude: true },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    throw new Error(`openrouter ${response.status}: ${detail}`);
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

async function answerWithFallback(env: Env, messages: unknown[], forcedOpenRouterModel?: string) {
  const failures: string[] = [];
  // Primary stays on Workers AI; OpenRouter (Gemini) is the mid-chain fallback,
  // with the small Workers AI model as the final resort. A user-picked retry
  // model jumps the queue when present.
  const providers: Array<() => Promise<{ answer: string; model: string }>> = [];
  if (forcedOpenRouterModel) {
    providers.push(() => answerWithOpenRouter(env, messages, forcedOpenRouterModel));
  }
  providers.push(() => answerWithWorkersAi(env, ANSWER_MODELS[0], messages));
  const defaultOpenRouterModel = env.OPENROUTER_ANSWER_MODEL || DEFAULT_OPENROUTER_ANSWER_MODEL;
  if (forcedOpenRouterModel !== defaultOpenRouterModel) {
    providers.push(() => answerWithOpenRouter(env, messages));
  }
  providers.push(() => answerWithWorkersAi(env, ANSWER_MODELS[1], messages));
  for (const provider of providers) {
    try {
      const { answer, model } = await provider();
      if (failures.length) console.warn("wtfmedia answer model fallback used", { model, failedAttempts: failures.length });
      return { answer, model, fallback: failures.length > 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      failures.push(message);
      console.warn("wtfmedia answer model failed", { message });
    }
  }
  throw new Error(`answer models unavailable: ${failures.length}`);
}

function citedEvidenceFallback(sources: Array<{ n: number; title: string; text?: string }>) {
  const lines = sources.slice(0, 3).map((source) => {
    const excerpt = String(source.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 260);
    return `[${source.n}] ${source.title}: ${excerpt}${excerpt.length === 260 ? "..." : ""}`;
  });
  return [
    "I found relevant evidence, but the synthesis model did not return valid citations. Here are the closest cited excerpts instead:",
    ...lines,
  ].join("\n\n");
}

async function rateLimit(request: Request, env: Env) {
  const ip = request.headers.get("X-Client-IP") || request.headers.get("CF-Connecting-IP") || "unknown";
  const window = Math.floor(Date.now() / 60_000);
  const key = `rate:${window}:${ip}`;
  const seen = Number((await env.WTFMEDIA_STATE.get(key)) || "0");
  if (seen >= Number(env.RATE_LIMIT_PER_MINUTE || 20)) return false;
  await env.WTFMEDIA_STATE.put(key, String(seen + 1), { expirationTtl: 120 });
  return true;
}

function parseHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is { role: string; content: string } =>
      t && typeof t.role === "string" && typeof t.content === "string"
      && (t.role === "user" || t.role === "assistant"),
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role as "user" | "assistant", content: t.content.slice(0, 400) }));
}

function historyContext(history: HistoryTurn[]): string {
  if (history.length === 0) return "";
  return history.map((t) => `${t.role}: ${t.content}`).join("\n");
}

const NEEDS_REFORMULATION = /\b(that|this|those|these|it|they|them|he|she|his|her|the same|more about|else|also|another|previous|earlier|above|you said|you mentioned|what about|how about|and what|tell me more|go deeper|expand|elaborate)\b/i;

// Users naturally address the show by its host ("What does Nikhil Kamath say about X?").
// His name sits in nearly every episode title, so these questions really ask what the
// show's episodes say about X — phrased as the host's own speech, the synthesis model
// abstains even when an episode answers the substance. Normalize to the show-level
// question; attribution rules in the conversation skill still name the actual speaker.
function normalizeHostAttribution(question: string): string {
  return question.replace(
    /\bwhat\s+(?:does|did|do)\s+(?:nikhil\s+kamath|nikhil|kamath|the\s+host)\s+(?:say|said|think|believe|claim)s?\s+(?:about\s+)?/i,
    "what was said on the podcast about ",
  );
}

async function reformulateQuery(env: Env, question: string, history: HistoryTurn[]): Promise<string> {
  if (history.length === 0 || !NEEDS_REFORMULATION.test(question)) return question;
  const ctx = history.slice(-4).map((t) => `${t.role}: ${t.content.slice(0, 200)}`).join("\n");
  try {
    const result = await env.AI.run(FAST_MODEL, {
      messages: [
        { role: "system", content: "Rewrite the follow-up question as a standalone search query. Resolve pronouns and references using the conversation. Output ONLY the rewritten query, nothing else. Keep it under 60 words." },
        { role: "user", content: `CONVERSATION:\n${ctx}\n\nFOLLOW-UP: ${question}` },
      ],
      max_tokens: 80,
      temperature: 0,
    });
    const text = typeof result === "string" ? result : result?.response;
    return (typeof text === "string" && text.trim().length > 5) ? text.trim() : question;
  } catch {
    return question;
  }
}

async function retrieveSourcesForQuery(
  env: Env,
  searchQuery: string,
  sourceMode: ReturnType<typeof parseSourceMode>,
  episodeId: string | null,
) {
  const vector = await vectorFor(env, searchQuery);
  const queried = await queryEvidenceSourcesForQuestion(
    env.DB,
    env.VECTORIZE,
    vector,
    searchQuery,
    sourceMode,
    episodeId,
  );
  const prioritized = prioritizeMatchesForQuestionWithAnchor(queried.matches, searchQuery);
  const dedupeByEpisode = queried.episodeId == null && !prioritized.anchored;
  const resolved = resolveEpisodeScopedSources(prioritized.matches, sourceMode, queried.episodeId, MIN_SCORE, 6, {
    dedupeByEpisode,
  });
  const sources = resolved.citations.map((source) => {
    const match = prioritized.matches.find((item: { id?: unknown }) => String(item.id ?? "") === source.segmentId)
      ?? prioritized.matches.find((item: { metadata?: { video_id?: unknown } }) => item.metadata?.video_id === source.videoId);
    return { ...source, text: match?.metadata?.text };
  });
  return { resolved, sources, episodeId: queried.episodeId };
}

async function generateFollowUps(
  env: Env,
  question: string,
  answer: string,
  sources: Array<{ n: number; title: string; text?: string }>,
  sourceMode: ReturnType<typeof parseSourceMode>,
  episodeId: string | null,
): Promise<string[]> {
  try {
    const result = await env.AI.run(FAST_MODEL, {
      messages: [
        { role: "system", content: WTF_OS_CONVERSATION_SKILL.followUpPrompt },
        { role: "user", content: buildFollowUpGenerationInput(question, answer, sources) },
      ],
      max_tokens: 220,
      temperature: 0.2,
    });
    const text = typeof result === "string" ? result : result?.response;
    if (typeof text !== "string") return [];
    const normalizedQuestion = question.toLocaleLowerCase("en-US");
    const candidates = parseFollowUpCandidates(text).filter(
      (candidate) => candidate.toLocaleLowerCase("en-US") !== normalizedQuestion,
    );
    return selectAnswerableFollowUps(candidates, async (candidate) => {
      if (requiresVerifiedMetadata(candidate)) return false;
      const validation = await retrieveSourcesForQuery(env, candidate, sourceMode, episodeId);
      return validation.sources.length >= 2;
    });
  } catch {
    return [];
  }
}

function requiresVerifiedMetadata(question: string) {
  return /\b(?:own|owner|owns|ownership|co-?founder|founder|host|producer|created|runs)\b[\s\S]{0,100}\b(?:wtf|podcast|show|channel)\b/i.test(question)
    || /\b(?:recur(?:ring|s)?|repeat(?:s|ed|ing)?|appear(?:s|ances?|ing)?|mentioned|occur(?:s|rence)?|most)\b[\s\S]{0,100}\b(?:\d+\s*\+?\s*(?:episodes?|conversations?)|across|throughout)\b/i.test(question);
}

async function chat(request: Request, env: Env) {
  if (request.headers.get("Content-Type")?.split(";", 1)[0] !== "application/json") return reply(request, env, { error: "content_type_required" }, 415);
  if (!(await rateLimit(request, env))) {
    return reply(request, env, { error: "rate_limited" }, 429);
  }
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > MAX_BODY_BYTES) return reply(request, env, { error: "body_too_large" }, 413);
  let payload: { question?: unknown; sourceMode?: unknown; episodeId?: unknown; history?: unknown; answerModel?: unknown };
  try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
  if (typeof payload.question !== "string" || !payload.question.trim()) {
    return reply(request, env, { error: "question_required" }, 400);
  }
  let forcedAnswerModel: string | undefined;
  if (payload.answerModel !== undefined) {
    if (typeof payload.answerModel !== "string" || !RETRYABLE_OPENROUTER_MODELS.has(payload.answerModel)) {
      return reply(request, env, { error: "invalid_answer_model" }, 400);
    }
    forcedAnswerModel = payload.answerModel;
  }
  const question = normalizeHostAttribution(payload.question.trim());
  const sourceMode = parseSourceMode(payload.sourceMode);
  const episodeId = parseEpisodeId(payload.episodeId);
  const history = parseHistory(payload.history);
  if (payload.episodeId !== undefined && episodeId === null) {
    return reply(request, env, { error: "invalid_episode_id" }, 400);
  }
  if (question.length > MAX_QUESTION_CHARS) return reply(request, env, { error: "question_too_long" }, 400);
  if (requiresVerifiedMetadata(question)) {
    return reply(request, env, {
      answer: "I can’t verify catalogue-wide counts or ownership/role claims from transcript search. Try asking what a named guest said about a topic, or ask about a specific episode instead.",
      sources: [],
      grounded: false,
      sourceMode,
      requestedSourceMode: sourceMode,
      evidenceSourceMode: null,
      uncutUnavailable: false,
      responseState: "abstained",
      citedIndices: [],
      followUps: [],
    });
  }
  try {
    const searchQuery = await reformulateQuery(env, question, history);
    const { resolved, sources, episodeId: resolvedEpisodeId } = await retrieveSourcesForQuery(env, searchQuery, sourceMode, episodeId);
    if (sources.length < 2) {
      return reply(request, env, {
        answer: resolved.uncutUnavailable
          ? resolvedEpisodeId
            ? "No sufficiently relevant approved uncut excerpt was returned for this episode, and there is not enough published evidence to answer reliably. no timestamp was inferred."
            : "No sufficiently relevant approved uncut excerpt was returned for this question, and there is not enough published YouTube evidence to answer reliably. no timestamp was inferred."
          : resolvedEpisodeId
            ? "I don’t have enough relevant evidence in this episode to answer that reliably."
            : "I don’t have enough relevant evidence in the catalogue to answer that reliably.",
        sources: sources.map(({ text: _text, ...source }) => source),
        grounded: false,
        sourceMode: resolved.sourceMode,
        requestedSourceMode: resolved.requestedSourceMode,
        evidenceSourceMode: resolved.evidenceSourceMode,
        fallbackReason: resolved.fallbackReason,
        uncutUnavailable: resolved.uncutUnavailable,
        responseState: "retrieval_weak",
        citedIndices: [],
        followUps: [],
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const evidenceContext = sources.map((source: any) => `[${source.n}] ${source.title}\n${source.text}`).join("\n\n---\n\n");
    const priorContext = historyContext(history);
    const userContent = priorContext
      ? `PRIOR CONVERSATION:\n${priorContext}\n\nCONTEXT:\n${evidenceContext}\n\nQUESTION: ${question}`
      : `CONTEXT:\n${evidenceContext}\n\nQUESTION: ${question}`;
    const answered = await answerWithFallback(env, [
        { role: "system", content: WTF_OS_CONVERSATION_SKILL.systemPrompt },
        { role: "user", content: userContent },
      ], forcedAnswerModel);
    // A model-driven "the evidence does not support this" reply carries no
    // citations by design — return it as an abstention instead of routing it
    // into the citation-repair/excerpt-dump path.
    const isModelAbstention = (text: string) =>
      !/\[[^\]]*\d/.test(text)
      && /(?:do(?:es)? not establish|not enough relevant evidence|not supported|cannot be answered from|no excerpt)/i.test(text);
    const projectSources = () => sources.map(({ text: _text, ...source }: any) => source);
    if (isModelAbstention(answered.answer)) {
      return reply(request, env, {
        answer: answered.answer,
        sources: [],
        grounded: false,
        sourceMode: resolved.sourceMode,
        requestedSourceMode: resolved.requestedSourceMode,
        evidenceSourceMode: resolved.evidenceSourceMode,
        fallbackReason: resolved.fallbackReason,
        uncutUnavailable: resolved.uncutUnavailable,
        model: answered.model,
        modelFallback: answered.fallback,
        responseState: "abstained",
        citedIndices: [],
        followUps: [],
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const citationValidation = parseCitationMarkers(answered.answer, sources.length);
    if (!citationValidation.valid) {
      // One repair pass: the model answered but dropped/mangled citations. Ask
      // it to rewrite the same answer with valid [n] citations before giving up.
      console.warn("wtfmedia answer missing valid citations; attempting repair", { sourceCount: sources.length, citations: citationValidation.indices });
      const repaired = await answerWithFallback(env, [
        { role: "system", content: WTF_OS_CONVERSATION_SKILL.systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: answered.answer },
        { role: "user", content: `Your answer has no valid citations. Rewrite it: cite every factual sentence with [n], using only numbers 1 to ${sources.length}. If the excerpts do not answer the question, say plainly what is not supported instead.` },
      ], forcedAnswerModel);
      if (isModelAbstention(repaired.answer)) {
        return reply(request, env, {
          answer: repaired.answer,
          sources: [],
          grounded: false,
          sourceMode: resolved.sourceMode,
          requestedSourceMode: resolved.requestedSourceMode,
          evidenceSourceMode: resolved.evidenceSourceMode,
          fallbackReason: resolved.fallbackReason,
          uncutUnavailable: resolved.uncutUnavailable,
          model: repaired.model,
          modelFallback: true,
          responseState: "abstained",
          citedIndices: [],
          followUps: [],
          ...(searchQuery !== question ? { searchQuery } : {}),
        });
      }
      const repairedValidation = parseCitationMarkers(repaired.answer, sources.length);
      if (repairedValidation.valid) {
        return reply(request, env, {
          answer: repaired.answer,
          sources: projectSources(),
          grounded: true,
          sourceMode: resolved.sourceMode,
          requestedSourceMode: resolved.requestedSourceMode,
          evidenceSourceMode: resolved.evidenceSourceMode,
          fallbackReason: resolved.fallbackReason,
          uncutUnavailable: resolved.uncutUnavailable,
          model: repaired.model,
          modelFallback: true,
          responseState: "answered_grounded",
          citedIndices: repairedValidation.indices,
          followUps: [],
          ...(searchQuery !== question ? { searchQuery } : {}),
        });
      }
      console.warn("wtfmedia answer rejected: invalid citations after repair", { sourceCount: sources.length, citations: repairedValidation.indices });
      const fallbackCited = sources.slice(0, 3).map((s) => s.n);
      return reply(request, env, {
        answer: citedEvidenceFallback(sources),
        sources: projectSources(),
        grounded: true,
        sourceMode: resolved.sourceMode,
        requestedSourceMode: resolved.requestedSourceMode,
        evidenceSourceMode: resolved.evidenceSourceMode,
        fallbackReason: resolved.fallbackReason,
        uncutUnavailable: resolved.uncutUnavailable,
        model: answered.model,
        modelFallback: true,
        responseState: "synthesis_invalid",
        citedIndices: fallbackCited,
        followUps: [],
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const citedIndices = citationValidation.indices;
    const followUps = await generateFollowUps(env, question, answered.answer, sources, sourceMode, resolvedEpisodeId);
    return reply(request, env, {
      answer: answered.answer,
      sources: projectSources(),
      grounded: true,
      sourceMode: resolved.sourceMode,
      requestedSourceMode: resolved.requestedSourceMode,
      evidenceSourceMode: resolved.evidenceSourceMode,
      fallbackReason: resolved.fallbackReason,
      uncutUnavailable: resolved.uncutUnavailable,
      model: answered.model,
      modelFallback: answered.fallback,
      responseState: "answered_grounded",
      citedIndices,
      followUps,
      ...(searchQuery !== question ? { searchQuery } : {}),
    });
  } catch (error) {
    console.error("wtfmedia chat failed", {
      message: error instanceof Error ? error.message : "unknown",
      sourceMode,
    });
    return reply(request, env, { error: "retrieval_unavailable" }, 503);
  }
}

async function requireAuth(request: Request, env: Env): Promise<Operator | null> {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) return null;
  return getOperatorByEmail(env.DB, email);
}

async function requireAdmin(request: Request, env: Env): Promise<Operator | null> {
  const operator = await requireAuth(request, env);
  if (!operator || operator.role !== "admin") return null;
  return operator;
}

async function handleOperators(request: Request, env: Env) {
  const url = new URL(request.url);
  const idMatch = url.pathname.match(/^\/v1\/operators\/(\d+)$/);

  if (request.method === "GET" && url.pathname === "/v1/operators") {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    const operators = await listOperators(env.DB);
    return reply(request, env, { operators });
  }

  if (request.method === "GET" && url.pathname === "/v1/operators/me") {
    const operator = await requireAuth(request, env);
    if (!operator) return reply(request, env, { error: "unauthorized" }, 401);
    return reply(request, env, { operator });
  }

  if (request.method === "POST" && url.pathname === "/v1/operators") {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    let payload: { email?: string; name?: string; role?: "admin" | "editor" };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (!payload.email || !payload.name) return reply(request, env, { error: "email_and_name_required" }, 400);
    const role = payload.role ?? "editor";
    const operator = await createOperator(env.DB, payload.email, payload.name, role);
    await logAuditEvent(env.DB, admin.id, "invite", "operator", String(operator.id), { email: operator.email, role });
    return reply(request, env, { operator }, 201);
  }

  if (request.method === "PATCH" && idMatch) {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    const id = Number(idMatch[1]);
    let payload: { role?: "admin" | "editor"; active?: boolean };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (payload.role) {
      const updated = await updateOperatorRole(env.DB, id, payload.role);
      await logAuditEvent(env.DB, admin.id, "role_change", "operator", String(id), { role: payload.role });
      return reply(request, env, { operator: updated });
    }
    if (payload.active === false) {
      await deactivateOperator(env.DB, id);
      await logAuditEvent(env.DB, admin.id, "deactivate", "operator", String(id));
      return reply(request, env, { deactivated: true });
    }
    if (payload.active === true) {
      await reactivateOperator(env.DB, id);
      await logAuditEvent(env.DB, admin.id, "reactivate", "operator", String(id));
      return reply(request, env, { reactivated: true });
    }
    return reply(request, env, { error: "no_valid_fields" }, 400);
  }

  return reply(request, env, { error: "not_found" }, 404);
}

async function handleAudit(request: Request, env: Env) {
  if (request.method === "POST" && new URL(request.url).pathname === "/v1/audit") {
    const operator = await requireAuth(request, env);
    if (!operator) return reply(request, env, { error: "unauthorized" }, 401);
    let payload: { action?: AuditAction; resource?: string; resource_id?: string; metadata?: Record<string, unknown> };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (!payload.action) return reply(request, env, { error: "action_required" }, 400);
    await logAuditEvent(env.DB, operator.id, payload.action, payload.resource ?? "", payload.resource_id ?? "", payload.metadata);
    return reply(request, env, { logged: true }, 201);
  }

  if (request.method === "GET" && new URL(request.url).pathname === "/v1/audit") {
    const admin = await requireAdmin(request, env);
    if (!admin) return reply(request, env, { error: "forbidden" }, 403);
    const url = new URL(request.url);
    const action = url.searchParams.get("action") as AuditAction | null;
    const since = url.searchParams.get("since") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const result = await queryAuditEvents(env.DB, { action: action ?? undefined, since, limit, offset });
    return reply(request, env, result);
  }

  return reply(request, env, { error: "not_found" }, 404);
}

async function handleSettings(request: Request, env: Env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return reply(request, env, { error: "forbidden" }, 403);

  if (request.method === "GET") {
    const defaultRole = await getSetting(env.DB, "default_role");
    const retentionDays = await getSetting(env.DB, "audit_retention_days");
    return reply(request, env, { settings: { default_role: defaultRole, audit_retention_days: retentionDays } });
  }

  if (request.method === "PUT") {
    let payload: { key?: string; value?: string };
    try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
    if (!payload.key || !payload.value) return reply(request, env, { error: "key_and_value_required" }, 400);
    await setSetting(env.DB, payload.key, payload.value);
    await logAuditEvent(env.DB, admin.id, "settings_change", "setting", payload.key, { value: payload.value });
    return reply(request, env, { updated: true });
  }

  return reply(request, env, { error: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors(request, env), "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Cf-Access-Authenticated-User-Email, Cf-Access-Jwt-Assertion" } });
    }
    if (request.method === "GET" && url.pathname === "/v1/health") {
      return reply(request, env, { status: "ok", service: "wtfmedia-edge", index: "wtfmedia-catalogue-v1" });
    }
    if (url.pathname === "/ops" || url.pathname.startsWith("/ops/")) {
      return handleOpsRequest(request, env);
    }
    if (url.pathname === "/v1/calendar" || url.pathname.startsWith("/v1/calendar/")) {
      if (!env.EDGE_SHARED_SECRET || request.headers.get("X-Edge-Secret") !== env.EDGE_SHARED_SECRET) {
        return reply(request, env, { error: "unauthorized" }, 401);
      }
      try {
        if (!(await allowCalendarRequest(request, env))) {
          return reply(request, env, { error: "rate_limited" }, 429);
        }
      } catch {
        return reply(request, env, { error: "calendar_unavailable" }, 503);
      }
      return handleCalendarRequest(request, env);
    }
    if (request.method === "POST" && url.pathname === "/v1/chat") {
      if (!env.EDGE_SHARED_SECRET || request.headers.get("X-Edge-Secret") !== env.EDGE_SHARED_SECRET) return reply(request, env, { error: "unauthorized" }, 401);
      return chat(request, env);
    }
    if (request.method === "POST" && url.pathname === "/v1/admin/enqueue") {
      if (request.headers.get("X-Ingest-Token") !== env.INGEST_TOKEN) return reply(request, env, { error: "unauthorized" }, 401);
      let payload: { jobs?: TranscriptJob[] };
      try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
      const admission = await admitTranscriptJobs(payload.jobs, env.INGEST_QUEUE, env.DB);
      return admission.ok
        ? reply(request, env, { queued: admission.queued }, 202)
        : reply(request, env, { error: admission.error }, 400);
    }
    return reply(request, env, { error: "not_found" }, 404);
  },
  async queue(batch: any, env: Env) {
    for (const message of batch.messages) {
      try { await ingestTranscriptJob(message.body as TranscriptJob, env); message.ack(); }
      catch (error) { console.error("wtfmedia ingest failed", { message: error instanceof Error ? error.message : "unknown" }); message.retry(); }
    }
  },
};
