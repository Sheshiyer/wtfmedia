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
} from "./db";
import { handleOpsRequest, type OpsEnv } from "./ops-router";
import { allowCalendarRequest, handleCalendarRequest } from "./calendar";
import {
  buildVectorQueryOptions,
  extractNamedEntityPhrases,
  parseEpisodeId,
  parseSourceMode,
  prioritizeMatchesForQuestion,
  resolveEpisodeScopedSources,
} from "./chat/source-mode";
import {
  ingestStateKey,
  parseJobSourceMode,
  resolveCatalogueJobIdentity,
  vectorRecordId,
  vectorSourceRef,
} from "./catalogue/asset-map";
import {
  admitTranscriptJobs,
  assertCatalogueJobSourceAsset,
  type TranscriptJob,
} from "./catalogue/job-admission";
import { extractTimestampLines } from "./catalogue/timestamps";

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
}

const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";
const ANSWER_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];
const FAST_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_BODY_BYTES = 16_000;
const MAX_QUESTION_CHARS = 2_000;
const MAX_CHUNK_CHARS = 1_100;
const MAX_HISTORY_TURNS = 6;
const MIN_SCORE = 0.45;
const UPSERT_BATCH_SIZE = 8;
const UPSERT_ATTEMPTS = 5;
type Passage = { text: string; start?: number };
type TimestampLine = { t: number; x: string };
type HistoryTurn = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are the WTF Media research assistant. You answer from the supplied excerpts and maintain a natural conversation flow.

GROUNDING RULES:
- Every factual claim needs a matching [N] citation from the supplied excerpts.
- A mention of a person or company does not prove ownership, employment, authorship, guest status, or any other relationship.
- Do not infer catalogue-wide counts from excerpts.
- If the excerpts do not establish the answer, say so plainly.
- When the question names a person, use only excerpts whose title or text contains that named person.
- Do not answer from semantically similar excerpts about another guest or episode.

CONVERSATION RULES:
- When prior conversation is provided, build on it naturally. Reference what was discussed.
- Don't repeat information already covered unless asked to elaborate.
- Be conversational but precise. Explain context when it adds value.
- When connecting ideas across excerpts, make the connections explicit with citations.`;

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

function chunks(text: string): Passage[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const result: Passage[] = [];
  let current = "";
  for (const word of words) {
    if (current.length && current.length + word.length + 1 > MAX_CHUNK_CHARS) {
      result.push({ text: current });
      current = word;
    } else {
      current += `${current ? " " : ""}${word}`;
    }
  }
  if (current) result.push({ text: current });
  return result;
}

function timestampedChunks(lines: TimestampLine[]): Passage[] {
  const result: Passage[] = [];
  let text = "";
  let start: number | undefined;
  for (const line of lines) {
    const words = typeof line.x === "string" ? line.x.replace(/\s+/g, " ").trim() : "";
    if (!words || !Number.isFinite(line.t)) continue;
    if (text && text.length + words.length + 1 > MAX_CHUNK_CHARS) {
      result.push({ text, start });
      text = "";
      start = undefined;
    }
    if (start == null) start = line.t;
    text += `${text ? " " : ""}${words}`;
  }
  if (text) result.push({ text, start });
  return result;
}

async function vectorFor(env: Env, text: string): Promise<number[]> {
  const output = await env.AI.run(EMBEDDING_MODEL, { text });
  const vector = output?.data?.[0] ?? output?.data;
  if (!Array.isArray(vector) || vector.length !== 1024) {
    throw new Error("embedding response was not a 1024-dimensional vector");
  }
  return vector;
}

async function upsertWithRetry(env: Env, vectors: unknown[]) {
  let lastError: unknown;
  for (let attempt = 0; attempt < UPSERT_ATTEMPTS; attempt++) {
    try {
      await env.VECTORIZE.upsert(vectors);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt + Math.floor(Math.random() * 150)));
    }
  }
  throw lastError;
}

async function answerWithFallback(env: Env, messages: unknown[]) {
  const failures: string[] = [];
  for (const model of ANSWER_MODELS) {
    try {
      const result = await env.AI.run(model, {
        messages,
        max_tokens: 600,
        temperature: 0.1,
      });
      const answer = typeof result === "string" ? result : result?.response;
      if (typeof answer !== "string" || !answer.trim()) throw new Error("empty answer response");
      if (failures.length) console.warn("wtfmedia answer model fallback used", { model, failedAttempts: failures.length });
      return { answer, model, fallback: failures.length > 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      failures.push(`${model}:${message}`);
      console.warn("wtfmedia answer model failed", { model, message });
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

async function generateFollowUps(env: Env, question: string, answer: string, sources: Array<{ title: string }>): Promise<string[]> {
  const topics = sources.slice(0, 3).map((s) => s.title).join("; ");
  try {
    const result = await env.AI.run(FAST_MODEL, {
      messages: [
        { role: "system", content: "Based on the Q&A and source topics, suggest exactly 3 natural follow-up questions the user might ask next. Each should explore a different angle from the retrieved content. Output one question per line, nothing else. No numbering." },
        { role: "user", content: `Q: ${question}\nA: ${answer.slice(0, 300)}\nTopics: ${topics}` },
      ],
      max_tokens: 150,
      temperature: 0.4,
    });
    const text = typeof result === "string" ? result : result?.response;
    if (typeof text !== "string") return [];
    return text.split("\n").map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter((l) => l.length > 10 && l.length < 200 && l.endsWith("?")).slice(0, 3);
  } catch {
    return [];
  }
}

function requiresVerifiedMetadata(question: string) {
  return /\b(?:own|owner|owns|ownership|co-?founder|founder|host|producer|created|runs)\b[\s\S]{0,100}\b(?:wtf|podcast|show|channel)\b/i.test(question)
    || /\b(?:recur(?:ring|s)?|repeat(?:s|ed|ing)?|appear(?:s|ances?|ing)?|mentioned|occur(?:s|rence)?|most)\b[\s\S]{0,100}\b(?:\d+\s*\+?\s*(?:episodes?|conversations?)|across|throughout)\b/i.test(question);
}

async function ingest(job: TranscriptJob, env: Env) {
  const sourceMode = parseJobSourceMode(job.sourceMode);
  const identity = resolveCatalogueJobIdentity(
    job.videoId,
    job.transcriptKey,
    sourceMode,
    job.sourceAssetId,
  );
  if (!identity) throw new Error(`${sourceMode}_identity_invalid`);
  await assertCatalogueJobSourceAsset(job, env.DB);
  const stateKey = ingestStateKey(identity.sourceAssetId, sourceMode);
  const previousHash = await env.WTFMEDIA_STATE.get(stateKey);
  if (previousHash === job.contentHash) return;
  const object = await env.CATALOGUE.get(job.transcriptKey);
  if (!object) throw new Error(`missing transcript object: ${job.transcriptKey}`);
  const text = await object.text();
  let parts = chunks(text);
  if (job.timestampsKey) {
    const timestamps = await env.CATALOGUE.get(job.timestampsKey);
    if (timestamps) {
      try {
        const parsed = await timestamps.json<TimestampLine[]>();
        if (Array.isArray(parsed)) parts = timestampedChunks(parsed);
      } catch {
        console.warn("wtfmedia timestamp sidecar unreadable", { videoId: job.videoId });
      }
    }
  } else if (sourceMode === "uncut") {
    const inline = extractTimestampLines(text);
    if (inline.length >= 3) parts = timestampedChunks(inline);
  }
  const source = vectorSourceRef(identity.sourceAssetId, sourceMode);
  const frameIoUrl = sourceMode === "uncut"
    ? normalizeFrameIoUrl(job.metadata?.frameIoFinalEpUrl ?? job.metadata?.frame_io_final_ep_url)
    : null;
  for (let offset = 0; offset < parts.length; offset += UPSERT_BATCH_SIZE) {
    const batch = parts.slice(offset, offset + UPSERT_BATCH_SIZE);
    const vectors = await Promise.all(batch.map(async (part, index) => ({
      id: vectorRecordId(identity.sourceAssetId, offset + index, sourceMode),
      values: await vectorFor(env, part.text),
      metadata: {
        video_id: identity.publicVideoId,
        source_asset_id: identity.sourceAssetId,
        title: job.title.slice(0, 500),
        chunk: offset + index,
        text: part.text,
        source,
        start: part.start ?? null,
        timestamped: part.start != null,
        source_mode: sourceMode,
        ...(frameIoUrl ? { frame_io_url: frameIoUrl } : {}),
      },
    })));
    await upsertWithRetry(env, vectors);
  }
  await env.WTFMEDIA_STATE.put(stateKey, job.contentHash);
}

function normalizeFrameIoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const allowedHost = hostname === "f.io" || hostname === "frame.io" || hostname.endsWith(".frame.io");
    return parsed.protocol === "https:" && allowedHost ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function chat(request: Request, env: Env) {
  if (request.headers.get("Content-Type")?.split(";", 1)[0] !== "application/json") return reply(request, env, { error: "content_type_required" }, 415);
  if (!(await rateLimit(request, env))) {
    return reply(request, env, { error: "rate_limited" }, 429);
  }
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > MAX_BODY_BYTES) return reply(request, env, { error: "body_too_large" }, 413);
  let payload: { question?: unknown; sourceMode?: unknown; episodeId?: unknown; history?: unknown };
  try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
  if (typeof payload.question !== "string" || !payload.question.trim()) {
    return reply(request, env, { error: "question_required" }, 400);
  }
  const question = payload.question.trim();
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
      uncutUnavailable: false,
      responseState: "abstained",
      citedIndices: [],
      followUps: [],
    });
  }
  try {
    const searchQuery = await reformulateQuery(env, question, history);
    const matches = await env.VECTORIZE.query(
      await vectorFor(env, searchQuery),
      buildVectorQueryOptions(episodeId),
    );
    const rawMatches = matches.matches ?? [];
    const relevantMatches = prioritizeMatchesForQuestion(rawMatches, searchQuery);
    const namedEntityQuestion = extractNamedEntityPhrases(searchQuery).length > 0;
    const resolved = resolveEpisodeScopedSources(relevantMatches, sourceMode, episodeId, MIN_SCORE, 6, {
      dedupeByEpisode: !namedEntityQuestion,
    });
    const sources = resolved.citations.map((source) => {
      const match = relevantMatches.find((item: { id?: unknown }) => String(item.id ?? "") === source.segmentId)
        ?? relevantMatches.find((item: { metadata?: { video_id?: unknown } }) => item.metadata?.video_id === source.videoId);
      return { ...source, text: match?.metadata?.text };
    });
    if (sources.length < 2) {
      return reply(request, env, {
        answer: resolved.uncutUnavailable
          ? episodeId
            ? "No approved uncut evidence is mapped to this episode, and there is not enough published evidence to answer reliably. no timestamp was inferred."
            : "uncut is not activated and there is not enough published YouTube evidence for this question. no timestamp was inferred."
          : episodeId
            ? "I don’t have enough relevant evidence in this episode to answer that reliably."
            : "I don’t have enough relevant evidence in the catalogue to answer that reliably.",
        sources: sources.map(({ text: _text, ...source }) => source),
        grounded: false,
        sourceMode: resolved.sourceMode,
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
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ]);
    const answer = answered.answer;
    const citations = [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
    if (citations.length === 0 || citations.some((citation) => citation < 1 || citation > sources.length)) {
      console.warn("wtfmedia answer rejected: invalid citations", { sourceCount: sources.length, citations });
      const fallbackCited = sources.slice(0, 3).map((s) => s.n);
      const followUps = await generateFollowUps(env, question, citedEvidenceFallback(sources), sources);
      return reply(request, env, {
        answer: citedEvidenceFallback(sources),
        sources: sources.map(({ text: _text, ...source }) => source),
        grounded: true,
        sourceMode: resolved.sourceMode,
        uncutUnavailable: resolved.uncutUnavailable,
        model: answered.model,
        modelFallback: true,
        responseState: "synthesis_invalid",
        citedIndices: fallbackCited,
        followUps,
        ...(searchQuery !== question ? { searchQuery } : {}),
      });
    }
    const citedIndices = [...new Set(citations)];
    const followUps = await generateFollowUps(env, question, answer, sources);
    return reply(request, env, {
      answer,
      sources: sources.map(({ text: _text, ...source }) => source),
      grounded: true,
      sourceMode: resolved.sourceMode,
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
      try { await ingest(message.body as TranscriptJob, env); message.ack(); }
      catch (error) { console.error("wtfmedia ingest failed", { message: error instanceof Error ? error.message : "unknown" }); message.retry(); }
    }
  },
};
