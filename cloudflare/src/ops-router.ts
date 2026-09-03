import { appendAudit, exportAuditCsv, projectAuditLedger, queryAuditEvents, type AuditFilters } from "./audit.ts";
import { createRemoteAccessVerifier, type AccessVerification } from "./auth/access.ts";
import { resolveOperatorContext, type OperatorContext } from "./auth/operator-context.ts";
import { decide, policyForPath } from "./auth/policy.ts";
import type { DB } from "./db.ts";
import { operatorContextDto, protectedResponseHeaders, safeOpsError } from "./dto.ts";
import { approveOperatorInvitation, changeOperatorLifecycle, inviteApprovedOperator, listOperatorRoster, transferSuperAdmin } from "./operators.ts";
import { handleAssetConfirmUpload, handleAssetUploadIntent, handleAssetUploadStream } from "./assets/upload-handler.ts";
import {
  handleActivateTranscriptVersion,
  handleGetEpisodeProvenance,
  handleGetEpisodes,
  handleListIngestionJobs,
  handleResolveCitation,
  handleYouTubeSync,
} from "./ops-episodes.ts";
import {
  appendMessage,
  archiveConversation,
  createConversation,
  exportConversationsCsv,
  getConversation,
  getConversationForActor,
  listConversationsForActor,
  type ChatActor,
  type MessageInput,
} from "./chat/history.ts";
import { runChat, type ChatAnswer, type ChatAnswerInput } from "./chat/answer.ts";
import { parseSourceMode } from "./chat/source-mode.ts";
import {
  canMutateAuthenticatedChatRelease,
  isAuthenticatedChatEnabled,
  resolveAuthenticatedChatRelease,
  setAuthenticatedChatRelease,
} from "./release-manifest.ts";

export type OpsEnvironment = "local" | "staging" | "production";
export type OpsEnv = {
  DB: DB;
  OPS_HOSTNAME: string;
  OPS_ORIGIN: string;
  OPS_ORIGIN_PROOF: string;
  OPS_ENVIRONMENT: OpsEnvironment;
  ACCESS_ISSUER: string;
  ACCESS_AUDIENCE: string;
  ACCESS_JWKS_URL: string;
  CATALOGUE?: any;
  AI?: any;
  VECTORIZE?: any;
  EDGE_SHARED_SECRET?: string;
  CHAT_HISTORY_ENABLED?: string | boolean;
};

type OpsDependencies = {
  verifyAccess?: (assertion: string | null) => Promise<AccessVerification>;
  fetchOrigin?: typeof fetch;
  now?: () => number;
  runChat?: (input: ChatAnswerInput, env: OpsEnv) => Promise<ChatAnswer>;
};

function denied(): Response {
  return Response.json(safeOpsError(), { status: 404, headers: protectedResponseHeaders });
}

function protectedPath(pathname: string): string | null {
  if (pathname === "/api/ops/operators") return "/ops/operators";
  if (pathname === "/api/ops/audit") return "/ops/audit";
  if (pathname === "/ops/api/assets/upload-intent" || pathname === "/api/ops/assets/upload-intent") return "/ops/api/assets/upload-intent";
  if (pathname === "/ops/api/assets/upload-stream" || pathname === "/api/ops/assets/upload-stream") return "/ops/api/assets/upload-stream";
  if (pathname === "/ops/api/assets/confirm-upload" || pathname === "/api/ops/assets/confirm-upload") return "/ops/api/assets/confirm-upload";
  if (pathname === "/ops/api/episodes" || pathname === "/api/ops/episodes") return "/ops/api/episodes";
  if (pathname === "/ops/api/ingest/jobs" || pathname === "/api/ops/ingest/jobs") return "/ops/api/ingest/jobs";
  if (pathname === "/ops/api/ingest/youtube-sync" || pathname === "/api/ops/ingest/youtube-sync") return "/ops/api/ingest/youtube-sync";
  if (pathname.startsWith("/ops/api/episodes/") || pathname.startsWith("/api/ops/episodes/")) return pathname;
  if (pathname === "/ops") return pathname;
  if (pathname === "/ops/settings") return pathname;
  if (pathname === "/ops/chat" || pathname.startsWith("/ops/chat/")) return pathname;
  if (pathname === "/ops/api/chat" || pathname.startsWith("/ops/api/chat/") || pathname === "/api/ops/chat" || pathname.startsWith("/api/ops/chat/")) return pathname;
  if (pathname === "/ops/api/release/authenticated-chat" || pathname === "/api/ops/release/authenticated-chat") return pathname;
  if (pathname === "/ops/api/operator-context" || pathname === "/api/ops/operator-context") return pathname;
  if (/^\/chat\/cnv_[A-Za-z0-9-]{8,88}-[a-z0-9][a-z0-9_-]*$/u.test(pathname)) return pathname;
  if (pathname === "/ops/operators" || pathname === "/ops/audit" || pathname === "/ops/production" || pathname === "/ops/ingest" || pathname === "/ops/episodes" || pathname.startsWith("/ops/episodes/")) return pathname;
  return null;
}

function chatRoute(pathname: string): boolean {
  return pathname === "/ops/chat" || pathname.startsWith("/ops/chat/")
    || pathname === "/ops/api/chat" || pathname.startsWith("/ops/api/chat/")
    || pathname === "/api/ops/chat" || pathname.startsWith("/api/ops/chat/")
    || /^\/chat\/cnv_[A-Za-z0-9-]{8,88}-[a-z0-9][a-z0-9_-]*$/u.test(pathname);
}

function releaseRoute(pathname: string): boolean {
  return pathname === "/ops/api/release/authenticated-chat" || pathname === "/api/ops/release/authenticated-chat";
}

function operatorContextRoute(pathname: string): boolean {
  return pathname === "/ops/api/operator-context" || pathname === "/api/ops/operator-context";
}

function jsonBody(request: Request): Promise<Record<string, unknown> | null> {
  return request.json().then((body) => body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null).catch(() => null);
}

function conversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/chat\/conversations\/(cnv_[A-Za-z0-9-]{8,88})(?:\/(?:archive|export))?$/u);
  return match?.[1] ?? null;
}

async function chatExport(request: Request, env: OpsEnv, context: OperatorContext, conversationId?: string): Promise<Response> {
  if (!decide(context.role, "chat", "export", { environment: context.environment })) return denied();
  const body = request.method === "POST" ? await jsonBody(request) : null;
  const operatorScope = body?.operatorId ?? new URL(request.url).searchParams.get("operatorId") ?? undefined;
  const csv = await exportConversationsCsv(env.DB, { operatorId: context.operatorId, role: context.role }, operatorScope);
  if (csv === null) return denied();
  const suffix = conversationId ? `-${conversationId}` : "";
  return new Response(csv, { headers: { ...protectedResponseHeaders, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=wtfmedia-chat-history${suffix}.csv`, "x-content-type-options": "nosniff" } });
}

function requestIdForChat(request: Request): string {
  const value = request.headers.get("x-request-id");
  return value && /^[A-Za-z0-9._:-]{1,160}$/u.test(value) ? value : crypto.randomUUID();
}

function questionForChat(body: Record<string, unknown>): string | null {
  const value = body.question ?? body.message ?? body.userMessage;
  const content = typeof value === "string"
    ? value
    : value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).content : null;
  if (typeof content !== "string") return null;
  const question = content.trim();
  return question.length > 0 && question.length <= 2_000 ? question : null;
}

function unavailableAnswer(sourceMode: ChatAnswer["sourceMode"], requestId: string): ChatAnswer {
  return {
    answer: "I couldn’t retrieve transcript evidence for this turn. The conversation is saved, but no grounded answer was produced.",
    sources: [], grounded: false, sourceMode, uncutUnavailable: false,
    model: null, modelFallback: false, requestId,
  };
}

async function chatApi(request: Request, env: OpsEnv, context: OperatorContext, dependencies: OpsDependencies): Promise<Response> {
  const actor: ChatActor = { operatorId: context.operatorId, role: context.role };
  const path = new URL(request.url).pathname;
  if (path.endsWith("/export")) return chatExport(request, env, context, conversationIdFromPath(path));

  const archivePath = path.endsWith("/archive");
  const conversationId = conversationIdFromPath(path) ?? (archivePath ? null : null);
  if (request.method === "GET") {
    if (conversationId) {
      const view = await getConversationForActor(env.DB, actor, conversationId);
      return view ? Response.json({ conversation: view.conversation, messages: view.messages, policy: { archive: true, export: context.role === "admin" || context.role === "super_admin" } }, { headers: protectedResponseHeaders }) : denied();
    }
    const url = new URL(request.url);
    const page = await listConversationsForActor(env.DB, actor, url.searchParams.get("cursor") ?? undefined, Number(url.searchParams.get("limit") ?? "25"));
    return page ? Response.json({ ...page, policy: { archive: true, export: context.role === "admin" || context.role === "super_admin" } }, { headers: protectedResponseHeaders }) : denied();
  }

  if (archivePath || request.method === "PATCH") {
    const id = conversationId ?? (await jsonBody(request))?.conversationId;
    const archived = await archiveConversation(env.DB, actor, id);
    return archived ? Response.json({ conversation: archived }, { headers: protectedResponseHeaders }) : denied();
  }

  if (request.method !== "POST") return denied();
  const body = await jsonBody(request);
  if (!body) return denied();
  if (body.action === "export") return chatExport(request, env, context);
  if (body.action === "archive") {
    const archived = await archiveConversation(env.DB, actor, body.conversationId);
    return archived ? Response.json({ conversation: archived }, { headers: protectedResponseHeaders }) : denied();
  }

  const requestId = requestIdForChat(request);
  const idempotencyKey = request.headers.get("idempotency-key") ?? body.idempotencyKey;
  const selectedConversationId = conversationId ?? body.conversationId;
  const question = questionForChat(body);
  if (!question) return denied();
  const requestedSourceMode = body.sourceMode === undefined ? undefined : parseSourceMode(body.sourceMode);
  const userMessage: MessageInput = {
    role: "user", content: question, sourceMetadata: requestedSourceMode ? { sourceMode: requestedSourceMode } : {}, groundingState: "ungrounded",
    requestId, idempotencyKey,
  };

  let view;
  if (selectedConversationId === undefined) {
    view = await createConversation(env.DB, context.operatorId, {
      title: body.title,
      sourceMode: body.sourceMode,
      episodeId: body.episodeId,
      userMessage,
      idempotencyKey,
    });
    if (!view) return denied();
  } else {
    const appended = await appendMessage(env.DB, context.operatorId, selectedConversationId, userMessage);
    if (!appended) return denied();
    view = await getConversation(env.DB, context.operatorId, selectedConversationId);
    if (!view) return denied();
  }

  const assistantKey = typeof idempotencyKey === "string" ? `${idempotencyKey}:assistant` : null;
  if (!assistantKey || !view.messages.some((message) => message.idempotency_key === assistantKey)) {
    const answerInput: ChatAnswerInput = {
      question: view.messages.filter((message) => message.role === "user").at(-1)?.content ?? question,
      sourceMode: requestedSourceMode ?? view.conversation.source_mode,
      episodeId: view.conversation.episode_id ?? undefined,
      requestId,
    };
    let answer: ChatAnswer;
    let unavailable = false;
    try {
      answer = await (dependencies.runChat ?? ((input, targetEnv) => runChat(input, targetEnv as { AI: any; VECTORIZE: any })))(answerInput, env);
    } catch {
      answer = unavailableAnswer(view.conversation.source_mode, requestId);
      unavailable = true;
    }
    const assistant: MessageInput = {
      role: "assistant",
      content: answer.answer,
      sourceMetadata: {
        sources: answer.sources,
        sourceMode: answer.sourceMode,
        uncutUnavailable: answer.uncutUnavailable,
      },
      groundingState: unavailable ? "unavailable" : answer.grounded ? "grounded" : "ungrounded",
      model: answer.model,
      modelFallback: answer.modelFallback,
      requestId: answer.requestId,
      idempotencyKey: assistantKey ?? undefined,
    };
    const assistantId = view.conversation.id;
    if (!await appendMessage(env.DB, context.operatorId, assistantId, assistant, "assistant")) return denied();
    view = await getConversation(env.DB, context.operatorId, assistantId);
    if (!view) return denied();
  }
  return Response.json(view, { status: 201, headers: protectedResponseHeaders });
}

async function releaseApi(request: Request, env: OpsEnv, context: OperatorContext): Promise<Response> {
  if (request.method === "GET") {
    const release = await resolveAuthenticatedChatRelease(env.DB, context.environment, env.CHAT_HISTORY_ENABLED);
    return Response.json({ feature: release.feature, environment: release.environment, state: release.state, track: release.track, source: release.source, ...(release.updatedAt ? { updatedAt: release.updatedAt } : {}), ...(release.updatedByOperatorId ? { updatedByOperatorId: release.updatedByOperatorId } : {}) }, { headers: protectedResponseHeaders });
  }
  if (request.method !== "POST" || !canMutateAuthenticatedChatRelease(context.role, context.environment)) return denied();
  const body = await jsonBody(request);
  const current = await resolveAuthenticatedChatRelease(env.DB, context.environment, env.CHAT_HISTORY_ENABLED);
  const release = await setAuthenticatedChatRelease(env.DB, { operatorId: context.operatorId, role: context.role }, context.environment, body?.state ?? current.state, body?.track ?? current.track, context.correlationId);
  return release ? Response.json({ feature: release.feature, environment: release.environment, state: release.state, track: release.track, source: release.source, updatedAt: release.updatedAt, updatedByOperatorId: release.updatedByOperatorId }, { headers: protectedResponseHeaders }) : denied();
}

function auditFilters(url: URL): AuditFilters {
  const get = (key: string) => url.searchParams.get(key) ?? undefined;
  const limit = url.searchParams.get("limit");
  return { action: get("action") as AuditFilters["action"], outcome: get("outcome") as AuditFilters["outcome"], role: get("role") as AuditFilters["role"], environment: get("environment") as AuditFilters["environment"], before: get("before"), after: get("after"), limit: limit === null ? undefined : Number(limit) };
}

async function auditApi(request: Request, env: OpsEnv, context: OperatorContext): Promise<Response> {
  const actor = { id: context.operatorId, role: context.role } as const;
  const filters = auditFilters(new URL(request.url));
  if (request.method === "GET") {
    const rows = await queryAuditEvents(env.DB, context.role, filters);
    return rows ? Response.json({ records: projectAuditLedger(rows) }, { headers: protectedResponseHeaders }) : denied();
  }
  if (request.method !== "POST") return denied();
  let body: { action?: unknown; filters?: AuditFilters };
  try { body = await request.json() as { action?: unknown; filters?: AuditFilters }; } catch { return denied(); }
  if (body.action !== "export") return denied();
  const exported = await exportAuditCsv(env.DB, actor, context.environment, context.correlationId, body.filters ?? {});
  if (!exported) return denied();
  return new Response(exported.body, { headers: { ...protectedResponseHeaders, ...exported.headers } });
}

async function operatorApi(request: Request, env: OpsEnv, context: OperatorContext): Promise<Response> {
  const actor = { id: context.operatorId, role: context.role, active: true } as const;
  if (request.method === "GET") {
    const operators = await listOperatorRoster(env.DB, actor, context.environment);
    return operators ? Response.json({ operators }, { headers: protectedResponseHeaders }) : denied();
  }
  if (request.method !== "POST") return denied();
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return denied(); }
  const action = body.action;
  let succeeded = false;
  if (action === "approve_invitation") succeeded = await approveOperatorInvitation(env.DB, actor, body.email, body.name, context.environment, context.correlationId);
  if (action === "invite") succeeded = await inviteApprovedOperator(env.DB, actor, body.email, body.role, context.environment, context.correlationId);
  if (action === "change_role") succeeded = await changeOperatorLifecycle(env.DB, actor, body.email, { role: body.role }, context.environment, context.correlationId);
  if (action === "set_active") succeeded = await changeOperatorLifecycle(env.DB, actor, body.email, { active: body.active }, context.environment, context.correlationId);
  if (action === "transfer") {
    const target = typeof body.email === "string" ? await env.DB.prepare("SELECT id FROM operators WHERE email = ? AND active = 1").bind(body.email.trim().toLowerCase()).first<{ id: number }>() : null;
    succeeded = target ? await transferSuperAdmin(env.DB, actor, target.id, context.environment, context.correlationId) : false;
  }
  if (!succeeded) return denied();
  const operators = await listOperatorRoster(env.DB, actor, context.environment);
  return operators ? Response.json({ operators }, { headers: protectedResponseHeaders }) : denied();
}

function validEnvironment(value: unknown): value is OpsEnvironment {
  return value === "local" || value === "staging" || value === "production";
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function originSignature(context: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(context))));
}

async function trustedOriginHeaders(context: OperatorContext, secret: string, now: number): Promise<Headers> {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ ...operatorContextDto(context), exp: now + 30_000 })));
  const signature = await originSignature(payload, secret);
  return new Headers({
    "x-wtf-ops-context": payload,
    "x-wtf-ops-proof": signature,
    "cache-control": "no-store",
    "x-wtf-ops-route": "edge-verified",
  });
}

/** The sole route permitted to create trusted operator context for the Vercel origin. */
export async function handleOpsRequest(request: Request, env: OpsEnv, dependencies: OpsDependencies = {}): Promise<Response> {
  const url = new URL(request.url);
  const path = protectedPath(url.pathname);
  if (!path || url.hostname !== env.OPS_HOSTNAME || !validEnvironment(env.OPS_ENVIRONMENT) || !env.OPS_ORIGIN || !env.OPS_ORIGIN_PROOF) return denied();
  if (chatRoute(url.pathname)) {
    const release = await resolveAuthenticatedChatRelease(env.DB, env.OPS_ENVIRONMENT, env.CHAT_HISTORY_ENABLED);
    if (!isAuthenticatedChatEnabled(release)) return denied();
  }
  const requirement = policyForPath(path);
  if (!requirement) return denied();

  const verifyAccess = dependencies.verifyAccess ?? createRemoteAccessVerifier({ issuer: env.ACCESS_ISSUER, audience: env.ACCESS_AUDIENCE, jwksUrl: env.ACCESS_JWKS_URL });
  const identity = await verifyAccess(request.headers.get("cf-access-jwt-assertion"));
  const correlationId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const context = await resolveOperatorContext(env.DB, identity, env.OPS_ENVIRONMENT, correlationId);
  if (!context || !decide(context.role, requirement[0], requirement[1], { environment: context.environment })) return denied();

  try {
    const audited = await appendAudit(env.DB, {
      action: "protected_view", entityType: "control_room", entityId: path === "/ops" ? "control-room" : path.slice(5),
      outcome: "allowed", environment: context.environment, correlationId: context.correlationId,
      actorId: context.operatorId, role: context.role, metadata: { scope: path },
    });
    if (!audited) return denied();
    if (releaseRoute(url.pathname)) return releaseApi(request, env, context);
    if (operatorContextRoute(url.pathname)) {
      if (request.method !== "GET") return denied();
      return Response.json(operatorContextDto(context), { headers: protectedResponseHeaders });
    }
    if (url.pathname === "/api/ops/operators") return operatorApi(request, env, context);
    if (url.pathname === "/api/ops/audit") return auditApi(request, env, context);
    if (chatRoute(url.pathname) && (url.pathname.includes("/api/chat"))) return chatApi(request, env, context, dependencies);
    if (url.pathname === "/ops/api/assets/upload-intent" || url.pathname === "/api/ops/assets/upload-intent") {
      return handleAssetUploadIntent(request, env, context);
    }
    if (url.pathname === "/ops/api/assets/upload-stream" || url.pathname === "/api/ops/assets/upload-stream") {
      return handleAssetUploadStream(request, env, context);
    }
    if (url.pathname === "/ops/api/assets/confirm-upload" || url.pathname === "/api/ops/assets/confirm-upload") {
      return handleAssetConfirmUpload(request, env, context);
    }
    if (url.pathname === "/ops/api/episodes" || url.pathname === "/api/ops/episodes") {
      return handleGetEpisodes(request, env, context);
    }
    if (url.pathname === "/ops/api/ingest/jobs" || url.pathname === "/api/ops/ingest/jobs") {
      return handleListIngestionJobs(request, env, context);
    }
    if (url.pathname === "/ops/api/ingest/youtube-sync" || url.pathname === "/api/ops/ingest/youtube-sync") {
      return handleYouTubeSync(request, env, context);
    }

    const provenanceMatch = url.pathname.match(/^(?:\/ops)?\/api(?:\/ops)?\/episodes\/([^/]+)\/provenance$/);
    if (provenanceMatch) {
      return handleGetEpisodeProvenance(request, env, provenanceMatch[1], context);
    }

    const citationMatch = url.pathname.match(/^(?:\/ops)?\/api(?:\/ops)?\/episodes\/([^/]+)\/citation$/);
    if (citationMatch) {
      return handleResolveCitation(request, env, citationMatch[1], context);
    }

    const activateMatch = url.pathname.match(/^(?:\/ops)?\/api(?:\/ops)?\/episodes\/([^/]+)\/transcripts\/activate$/);
    if (activateMatch) {
      return handleActivateTranscriptVersion(request, env, activateMatch[1], context);
    }

    const origin = new URL(env.OPS_ORIGIN);
    origin.pathname = url.pathname;
    origin.search = url.search;
    const headers = await trustedOriginHeaders(context, env.OPS_ORIGIN_PROOF, (dependencies.now ?? Date.now)());
    const upstream = await (dependencies.fetchOrigin ?? fetch)(new Request(origin, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    }));
    const response = new Response(upstream.body, upstream);
    for (const [name, value] of Object.entries(protectedResponseHeaders)) response.headers.set(name, value);
    return response;
  } catch {
    return denied();
  }
}
