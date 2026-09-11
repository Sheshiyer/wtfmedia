import { createRemoteClerkVerifier, type ClerkVerification } from "./auth/clerk.ts";
import { principalContextDto, resolvePrincipalContext } from "./auth/principal-context.ts";
import { decide, policyForPath } from "./auth/policy.ts";
import { archiveMemberConversation, completeMemberTurn, deleteMemberConversation, getMemberConversation, listMemberConversations, prepareMemberTurn } from "./chat/member-history.ts";
import { archiveMemberMemory, createMemberMemory, listMemberMemories } from "./chat/member-memory.ts";
import { boundedPriorTurns, runChat, type ChatAnswerInput, type ChatAnswer } from "./chat/answer.ts";
import { isMemberBetaEnabled, resolveMemberBetaRelease } from "./member-release.ts";
import type { OpsEnv } from "./ops-router.ts";

type Dependencies = { verifyClerk?: (request: Request) => Promise<ClerkVerification>; runChat?: (input: ChatAnswerInput, env: OpsEnv) => Promise<ChatAnswer> };
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const denied = () => Response.json({ error: "ops_unavailable" }, { status: 404, headers });
const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401, headers });
const forbidden = () => Response.json({ error: "forbidden" }, { status: 403, headers });
const body = (request: Request) => request.json().then((value) => value && typeof value === "object" ? value as Record<string, unknown> : null).catch(() => null);

export async function handleMemberRequest(request: Request, env: OpsEnv, dependencies: Dependencies = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/beta/api/") || url.hostname !== env.OPS_HOSTNAME || env.OPS_ENVIRONMENT === "production") return denied();
  const release = await resolveMemberBetaRelease(env.DB, env.OPS_ENVIRONMENT);
  if (!isMemberBetaEnabled(release)) return denied();
  const parties = env.CLERK_AUTHORIZED_PARTIES?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!env.CLERK_ISSUER || !env.CLERK_JWKS_URL || !parties?.length) return denied();
  const verify = dependencies.verifyClerk ?? createRemoteClerkVerifier({ issuer: env.CLERK_ISSUER, jwksUrl: env.CLERK_JWKS_URL, authorizedParties: parties, ...(env.CLERK_AUDIENCE ? { audience: env.CLERK_AUDIENCE } : {}) });
  const identity = await verify(request);
  if (!identity.ok) return unauthorized();
  const context = await resolvePrincipalContext(env.DB, identity, env.OPS_ENVIRONMENT, request.headers.get("x-request-id") ?? crypto.randomUUID());
  if (!context) return forbidden();
  const requirement = policyForPath(url.pathname, request.method);
  if (!requirement) return denied();
  if (!decide(context.role, requirement[0], requirement[1], { environment: context.environment })) return forbidden();
  if (url.pathname === "/beta/api/principal-context" && request.method === "GET") return Response.json(principalContextDto(context), { headers });
  if (context.kind !== "member") return forbidden();
  if (url.pathname === "/beta/api/context" && request.method === "GET") return Response.json({ member: { role: context.role, workspace: context.workspace, pilotCohort: context.pilotCohort, environment: context.environment } }, { headers });
  if (url.pathname === "/beta/api/memory" && request.method === "GET") {
    const memories = await listMemberMemories(env.DB, context.memberId);
    return memories ? Response.json({ memories }, { headers }) : denied();
  }
  if (url.pathname === "/beta/api/memory" && request.method === "POST") {
    const input = await body(request);
    const memory = await createMemberMemory(env.DB, context.memberId, input?.content);
    return memory ? Response.json({ memory }, { status: 201, headers }) : denied();
  }
  if (url.pathname === "/beta/api/chat" && request.method === "GET") {
    const page = await listMemberConversations(env.DB, context.memberId, url.searchParams.get("cursor") ?? undefined);
    return page ? Response.json(page, { headers }) : denied();
  }
  const match = url.pathname.match(/^\/beta\/api\/chat\/(mcnv_[A-Za-z0-9-]{8,88})$/u);
  if ((url.pathname === "/beta/api/chat" || match) && request.method === "POST") {
    const input = await body(request);
    if (!input) return denied();
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    const turn = await prepareMemberTurn(env.DB, context.memberId, match?.[1], { question: input.question, sourceMode: input.sourceMode, episodeId: input.episodeId, resumeMessageId: input.resumeMessageId, idempotencyKey: request.headers.get("idempotency-key"), requestId });
    if (!turn) return denied();
    if (turn.completed) {
      const view = await getMemberConversation(env.DB, context.memberId, turn.view.conversation.id);
      return view ? Response.json(view, { headers }) : denied();
    }
    try {
      const memories = await listMemberMemories(env.DB, context.memberId);
      const priorTurns = boundedPriorTurns(turn.view.messages.filter((message) => message.sequence < turn.userMessage.sequence).map(({ role, content }) => ({ role, content })));
      const answer = await (dependencies.runChat ?? runChat)({ question: turn.userMessage.content, sourceMode: turn.sourceMode, ...(turn.episodeId ? { episodeId: turn.episodeId } : {}), requestId, priorTurns, memory: (memories ?? []).map((memory: any) => String(memory.content)).slice(0, 8) }, env);
      const stored = await completeMemberTurn(env.DB, context.memberId, turn, { content: answer.answer, metadata: { sources: answer.sources, sourceMode: answer.sourceMode, uncutUnavailable: answer.uncutUnavailable }, grounded: answer.grounded, model: answer.model, fallback: answer.modelFallback, requestId: answer.requestId });
      return stored ? Response.json(stored, { status: turn.created ? 201 : 200, headers }) : denied();
    } catch {
      const pending = await getMemberConversation(env.DB, context.memberId, turn.view.conversation.id);
      if (!pending || pending.conversation.lifecycle_state !== "active") return denied();
      return Response.json({ ...pending, error: "chat_unavailable", retryable: true }, { status: 503, headers });
    }
  }
  if (match && request.method === "GET") {
    const view = await getMemberConversation(env.DB, context.memberId, match[1], url.searchParams.get("before") ?? undefined);
    return view ? Response.json(view, { headers }) : denied();
  }
  const archiveChat = url.pathname.match(/^\/beta\/api\/chat\/(mcnv_[A-Za-z0-9-]{8,88})\/archive$/u);
  if (archiveChat && request.method === "POST") {
    const conversation = await archiveMemberConversation(env.DB, context.memberId, archiveChat[1]);
    return conversation ? Response.json({ conversation }, { headers }) : denied();
  }
  if (match && request.method === "DELETE") {
    const input = await body(request);
    // The client confirmation dialog must send this literal acknowledgement;
    // a bare route request cannot erase a private conversation.
    if (input?.confirmation !== "DELETE") return denied();
    const deleted = await deleteMemberConversation(env.DB, context.memberId, match[1]);
    return deleted ? Response.json(deleted, { headers }) : denied();
  }
  const archiveMemory = url.pathname.match(/^\/beta\/api\/memory\/(mmem_[A-Za-z0-9-]{8,88})\/archive$/u);
  if (archiveMemory && request.method === "POST") {
    const memory = await archiveMemberMemory(env.DB, context.memberId, archiveMemory[1]);
    return memory ? Response.json({ memory }, { headers }) : denied();
  }
  return denied();
}
