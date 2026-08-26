import { appendAudit } from "./audit.ts";
import { createRemoteAccessVerifier, type AccessVerification } from "./auth/access.ts";
import { resolveOperatorContext, type OperatorContext } from "./auth/operator-context.ts";
import { decide, policyForPath } from "./auth/policy.ts";
import type { DB } from "./db.ts";
import { operatorContextDto, protectedResponseHeaders, safeOpsError } from "./dto.ts";

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
};

type OpsDependencies = {
  verifyAccess?: (assertion: string | null) => Promise<AccessVerification>;
  fetchOrigin?: typeof fetch;
  now?: () => number;
};

function denied(): Response {
  return Response.json(safeOpsError(), { status: 404, headers: protectedResponseHeaders });
}

function protectedPath(pathname: string): string | null {
  if (pathname === "/ops") return pathname;
  if (pathname === "/ops/operators" || pathname === "/ops/audit") return pathname;
  return null;
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
