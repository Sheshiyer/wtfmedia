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
} from "./chat/source-mode.ts";
import {
  ingestStateKey,
  parseJobSourceMode,
  resolveCatalogueJobIdentity,
  vectorRecordId,
  vectorSourceRef,
} from "./catalogue/asset-map.ts";
import {
  admitTranscriptJobs,
  assertCatalogueJobSourceAsset,
  type TranscriptJob,
} from "./catalogue/job-admission.ts";
import { extractTimestampLines } from "./catalogue/timestamps.ts";
import { runChat, vectorFor } from "./chat/answer.ts";

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

const MAX_BODY_BYTES = 16_000;
const MAX_QUESTION_CHARS = 2_000;
const MAX_CHUNK_CHARS = 1_100;
const UPSERT_BATCH_SIZE = 8;
const UPSERT_ATTEMPTS = 5;
type Passage = { text: string; start?: number };
type TimestampLine = { t: number; x: string };

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

async function rateLimit(request: Request, env: Env) {
  const ip = request.headers.get("X-Client-IP") || request.headers.get("CF-Connecting-IP") || "unknown";
  const window = Math.floor(Date.now() / 60_000);
  const key = `rate:${window}:${ip}`;
  const seen = Number((await env.WTFMEDIA_STATE.get(key)) || "0");
  if (seen >= Number(env.RATE_LIMIT_PER_MINUTE || 20)) return false;
  await env.WTFMEDIA_STATE.put(key, String(seen + 1), { expirationTtl: 120 });
  return true;
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
      },
    })));
    await upsertWithRetry(env, vectors);
  }
  await env.WTFMEDIA_STATE.put(stateKey, job.contentHash);
}

async function chat(request: Request, env: Env) {
  if (request.headers.get("Content-Type")?.split(";", 1)[0] !== "application/json") return reply(request, env, { error: "content_type_required" }, 415);
  if (!(await rateLimit(request, env))) {
    return reply(request, env, { error: "rate_limited" }, 429);
  }
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > MAX_BODY_BYTES) return reply(request, env, { error: "body_too_large" }, 413);
  let payload: { question?: unknown; sourceMode?: unknown; episodeId?: unknown };
  try { payload = await request.json(); } catch { return reply(request, env, { error: "invalid_json" }, 400); }
  if (typeof payload.question !== "string" || !payload.question.trim()) {
    return reply(request, env, { error: "question_required" }, 400);
  }
  const question = payload.question.trim();
  const sourceMode = parseSourceMode(payload.sourceMode);
  const episodeId = parseEpisodeId(payload.episodeId);
  if (payload.episodeId !== undefined && episodeId === null) {
    return reply(request, env, { error: "invalid_episode_id" }, 400);
  }
  if (question.length > MAX_QUESTION_CHARS) return reply(request, env, { error: "question_too_long" }, 400);
  try {
    const answerInput = {
      question,
      sourceMode,
      requestId: request.headers.get("x-request-id"),
      ...(episodeId ? { episodeId } : {}),
    };
    const result = await runChat(answerInput, env);
    const { requestId: _requestId, ...body } = result;
    return reply(request, env, body);
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
