import { appendAudit, exportAuditCsv, projectAuditLedger, queryAuditEvents, type AuditFilters } from "./audit.ts";
import { createRemoteClerkVerifier, type ClerkVerification } from "./auth/clerk.ts";
import { resolveOperatorContext, type OperatorContext } from "./auth/operator-context.ts";
import { decide, policyForPath } from "./auth/policy.ts";
import { getOperatorById, type DB } from "./db.ts";
import { operatorContextDto, operatorProfileDto, protectedResponseHeaders, safeOpsError } from "./dto.ts";
import { approveOperatorInvitation, changeOperatorLifecycle, inviteApprovedOperator, listOperatorRoster, transferSuperAdmin } from "./operators.ts";
import { changeCompanyMemberLifecycle, inviteCompanyMember, listCompanyMembers } from "./members.ts";
import { createClerkInvitationClient } from "./clerk/invitations.ts";
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
  archiveMemory,
  createMemory,
  getMemoryForActor,
  listMemoriesForActor,
  type MemoryActor,
} from "./chat/memory.ts";
import type { ChatAnswer, ChatAnswerInput } from "./chat/answer.ts";
import type { AlphaChatService } from "./chat/alpha-gateway.ts";
import { parseSourceMode } from "./chat/source-mode.ts";
import {
  canMutateAuthenticatedChatRelease,
  isAuthenticatedChatEnabled,
  resolveAuthenticatedChatRelease,
  setAuthenticatedChatRelease,
} from "./release-manifest.ts";

export type OpsEnvironment = "local" | "staging" | "production";

/**
 * CSRF guard for the authenticated routers: sessions ride an ambient cookie
 * (the web proxy also mints a bearer from it), so a cross-origin page must
 * never trigger a mutation. Browsers send Origin on every non-GET/HEAD
 * request, so reject mismatches outright; non-browser clients present no
 * Origin and must speak JSON. The upload stream is exempt — it authenticates
 * with a signed ticket header a cross-origin form cannot set.
 */
export function mutationRequestAllowed(request: Request, url: URL): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      return new URL(origin).host === url.host;
    } catch {
      return false;
    }
  }
  if (url.pathname.endsWith("/assets/upload-stream")) return true;
  return request.headers.get("Content-Type")?.split(";", 1)[0].trim() === "application/json";
}
export type OpsEnv = {
  DB: DB;
  OPS_HOSTNAME: string;
  OPS_ORIGIN: string;
  OPS_ORIGIN_PROOF: string;
  OPS_ENVIRONMENT: OpsEnvironment;
  CLERK_ISSUER: string;
  CLERK_JWKS_URL: string;
  CLERK_AUTHORIZED_PARTIES: string;
  CLERK_AUDIENCE?: string;
  CLERK_SECRET_KEY?: string;
  CATALOGUE?: any;
  AI?: any;
  VECTORIZE?: any;
  EDGE_SHARED_SECRET?: string;
  CHAT_HISTORY_ENABLED?: string | boolean;
  /** Staging-only, read-only route to Alpha's public `/api/chat` contract. */
  WTFMEDIA_ALPHA_WEB?: AlphaChatService;
};

type OpsDependencies = {
  verifyClerk?: (request: Request) => Promise<ClerkVerification>;
  fetchOrigin?: typeof fetch;
  now?: () => number;
  runChat?: (input: ChatAnswerInput, env: OpsEnv) => Promise<ChatAnswer>;
  fetchClerk?: typeof fetch;
};

function denied(): Response {
  return Response.json(safeOpsError(), { status: 404, headers: protectedResponseHeaders });
}

function protectedPath(pathname: string): string | null {
  if (pathname === "/api/ops/operators") return "/ops/operators";
  if (pathname === "/api/ops/members") return "/ops/api/members";
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
  if (pathname === "/ops/profile") return pathname;
  if (pathname.startsWith("/ops/settings/")) return pathname;
  if (pathname === "/ops/api/memory" || pathname.startsWith("/ops/api/memory/") || pathname === "/api/ops/memory" || pathname.startsWith("/api/ops/memory/")) return pathname;
  if (pathname === "/ops/api/release/authenticated-chat" || pathname === "/api/ops/release/authenticated-chat") return pathname;
  if (pathname === "/ops/api/operator-context" || pathname === "/api/ops/operator-context") return pathname;
  if (pathname === "/ops/api/profile" || pathname === "/api/ops/profile") return "/ops/api/profile";
  if (pathname === "/ops/api/members") return pathname;
  if (pathname === "/ops/operators" || pathname === "/ops/audit" || pathname === "/ops/production" || pathname === "/ops/ingest" || pathname === "/ops/episodes" || pathname.startsWith("/ops/episodes/")) return pathname;
  return null;
}

function releaseRoute(pathname: string): boolean {
  return pathname === "/ops/api/release/authenticated-chat" || pathname === "/api/ops/release/authenticated-chat";
}

function operatorContextRoute(pathname: string): boolean {
  return pathname === "/ops/api/operator-context" || pathname === "/api/ops/operator-context";
}

function operatorProfileRoute(pathname: string): boolean {
  return pathname === "/ops/api/profile" || pathname === "/api/ops/profile";
}

function memoryRoute(pathname: string): boolean {
  return pathname === "/ops/api/memory" || pathname.startsWith("/ops/api/memory/")
    || pathname === "/api/ops/memory" || pathname.startsWith("/api/ops/memory/");
}

function jsonBody(request: Request): Promise<Record<string, unknown> | null> {
  return request.json().then((body) => body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null).catch(() => null);
}

function memoryIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/memory\/(mem_[A-Za-z0-9-]{8,88})(?:\/archive)?$/u);
  return match?.[1] ?? null;
}

async function memoryApi(request: Request, env: OpsEnv, context: OperatorContext): Promise<Response> {
  const actor: MemoryActor = { operatorId: context.operatorId, role: context.role };
  const path = new URL(request.url).pathname;
  const memoryId = memoryIdFromPath(path);
  const isCollection = path === "/ops/api/memory" || path === "/api/ops/memory";
  if (!isCollection && !memoryId) return denied();
  if (request.method === "GET") {
    if (!decide(context.role, "memory", "read")) return denied();
    if (memoryId) {
      const memory = await getMemoryForActor(env.DB, actor, memoryId);
      return memory ? Response.json({ memory, policy: { archive: true, create: true } }, { headers: protectedResponseHeaders }) : denied();
    }
    const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "1";
    const memories = await listMemoriesForActor(env.DB, actor, includeArchived);
    return memories ? Response.json({ memories, policy: { archive: true, create: true } }, { headers: protectedResponseHeaders }) : denied();
  }
  if (request.method !== "POST" || !decide(context.role, "memory", "write")) return denied();
  const body = await jsonBody(request);
  if (!body) return denied();
  if (body.action === "archive") {
    const archived = await archiveMemory(env.DB, actor, body.memoryId ?? memoryId);
    if (!archived) return denied();
    const audited = await appendAudit(env.DB, {
      action: "settings_policy_change", entityType: "policy", entityId: archived.id, outcome: "succeeded",
      environment: context.environment, correlationId: context.correlationId, actorId: context.operatorId, role: context.role,
      metadata: { scope: "saved_memory_archive" },
    }).catch(() => false);
    return audited ? Response.json({ memory: archived, policy: { archive: true, create: true } }, { headers: protectedResponseHeaders }) : denied();
  }
  const memory = await createMemory(env.DB, actor, { content: body.content, sourceConversationId: body.sourceConversationId });
  if (!memory) return denied();
  const audited = await appendAudit(env.DB, {
    action: "settings_policy_change", entityType: "policy", entityId: memory.id, outcome: "succeeded",
    environment: context.environment, correlationId: context.correlationId, actorId: context.operatorId, role: context.role,
    metadata: { scope: "saved_memory_create" },
  }).catch(() => false);
  return audited ? Response.json({ memory, policy: { archive: true, create: true } }, { status: 201, headers: protectedResponseHeaders }) : denied();
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

async function operatorProfileApi(request: Request, env: OpsEnv, context: OperatorContext): Promise<Response> {
  if (request.method !== "GET") return denied();
  const operator = await getOperatorById(env.DB, context.operatorId).catch(() => null);
  if (!operator || operator.active !== 1 || operator.email !== context.email || operator.role !== context.role) return denied();
  return Response.json({ profile: operatorProfileDto(operator, context) }, { headers: protectedResponseHeaders });
}

async function memberApi(request: Request, env: OpsEnv, context: OperatorContext, dependencies: OpsDependencies): Promise<Response> {
  const actor = { operatorId: context.operatorId, role: context.role };
  if (request.method === "GET") {
    const members = await listCompanyMembers(env.DB, actor, context.environment);
    return members ? Response.json({ members }, { headers: protectedResponseHeaders }) : denied();
  }
  if (request.method !== "POST" || !env.CLERK_SECRET_KEY) return denied();
  const body = await jsonBody(request);
  if (!body || !["invite", "revoke", "suspend", "reactivate"].includes(String(body.action))) return denied();
  const invitations = createClerkInvitationClient(env.CLERK_SECRET_KEY, dependencies.fetchClerk);
  if (body.action !== "invite") {
    const changed = await changeCompanyMemberLifecycle(env.DB, actor, body.email, body.action, context.environment, context.correlationId, invitations);
    if (!changed) return denied();
    const members = await listCompanyMembers(env.DB, actor, context.environment);
    return members ? Response.json({ members }, { headers: protectedResponseHeaders }) : denied();
  }
  let redirectUrl: string;
  try { redirectUrl = new URL("/sign-up", env.OPS_ORIGIN).toString(); } catch { return denied(); }
  const member = await inviteCompanyMember(env.DB, actor, { email: body.email, pilotCohort: body.pilotCohort, office: body.office, redirectUrl }, context.environment, context.correlationId, invitations);
  return member ? Response.json({ member }, { status: member.invitationStatus === "sent" ? 201 : 502, headers: protectedResponseHeaders }) : denied();
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
  if (!mutationRequestAllowed(request, url)) return denied();
  const requirement = policyForPath(path, request.method);
  if (!requirement) return denied();
  const authorizedParties = env.CLERK_AUTHORIZED_PARTIES?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!env.CLERK_ISSUER || !env.CLERK_JWKS_URL || !authorizedParties?.length) return denied();
  const verifyClerk = dependencies.verifyClerk ?? createRemoteClerkVerifier({
    issuer: env.CLERK_ISSUER,
    jwksUrl: env.CLERK_JWKS_URL,
    authorizedParties: authorizedParties ?? [],
    ...(env.CLERK_AUDIENCE ? { audience: env.CLERK_AUDIENCE } : {}),
  });
  const identity = await verifyClerk(request);
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
    if (operatorProfileRoute(url.pathname)) return operatorProfileApi(request, env, context);
    if (url.pathname === "/ops/api/members" || url.pathname === "/api/ops/members") return memberApi(request, env, context, dependencies);
    if (memoryRoute(url.pathname)) return memoryApi(request, env, context);
    if (url.pathname === "/api/ops/operators") return operatorApi(request, env, context);
    if (url.pathname === "/api/ops/audit") return auditApi(request, env, context);
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
