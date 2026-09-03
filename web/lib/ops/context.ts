import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";
import { isOpsRole, type OpsRole } from "./policy";

export type VerifiedOpsContext = {
  operatorId: number;
  role: OpsRole;
  environment: "local" | "staging" | "production";
  correlationId: string;
};

type SignedPayload = VerifiedOpsContext & { exp: number };
const environments = new Set<VerifiedOpsContext["environment"]>(["local", "staging", "production"]);

function parseOperatorContext(value: unknown): VerifiedOpsContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = value as Record<string, unknown>;
  if (!Number.isSafeInteger(parsed.operatorId) || Number(parsed.operatorId) <= 0) return null;
  if (!isOpsRole(parsed.role) || !environments.has(parsed.environment as VerifiedOpsContext["environment"])) return null;
  if (typeof parsed.correlationId !== "string" || parsed.correlationId.length < 8 || parsed.correlationId.length > 128) return null;
  return {
    operatorId: Number(parsed.operatorId),
    role: parsed.role,
    environment: parsed.environment as VerifiedOpsContext["environment"],
    correlationId: parsed.correlationId,
  };
}

function decodePayload(value: string): SignedPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (!Number.isSafeInteger(parsed.operatorId) || Number(parsed.operatorId) <= 0 || !isOpsRole(parsed.role) || !environments.has(parsed.environment as VerifiedOpsContext["environment"]) || typeof parsed.correlationId !== "string" || parsed.correlationId.length < 8 || parsed.correlationId.length > 128 || !Number.isSafeInteger(parsed.exp) || Number(parsed.exp) <= Date.now()) return null;
    return parsed as SignedPayload;
  } catch {
    return null;
  }
}

export function verifyTrustedOpsContext(payload: string | null, proof: string | null, secret = process.env.WTFMEDIA_OPS_ORIGIN_PROOF ?? ""): VerifiedOpsContext | null {
  if (!payload || !proof || !secret) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (proof.length !== expected.length || !timingSafeEqual(Buffer.from(proof), Buffer.from(expected))) return null;
  const decoded = decodePayload(payload);
  return decoded ? { operatorId: decoded.operatorId, role: decoded.role, environment: decoded.environment, correlationId: decoded.correlationId } : null;
}

type EdgeFetch = (request: Request) => Promise<Response>;

/**
 * Server-rendered operator pages arrive at the web Worker directly. Ask the
 * bound edge Worker to verify the Access assertion so page chrome and API
 * permissions use the same authority without exposing the assertion to the
 * browser or trusting a decoded JWT at the origin.
 */
export async function fetchEdgeVerifiedOpsContext(
  requestHeaders: Pick<Headers, "get">,
  edgeFetch?: EdgeFetch,
): Promise<VerifiedOpsContext | null> {
  const assertion = requestHeaders.get("cf-access-jwt-assertion");
  const host = requestHeaders.get("host");
  if (!assertion || !host || /[\r\n]/u.test(host)) return null;

  let fetcher = edgeFetch;
  if (!fetcher) {
    try {
      const { env } = await getCloudflareContext({ async: true });
      const binding = env.WTFMEDIA_EDGE;
      if (!binding) return null;
      fetcher = binding.fetch.bind(binding);
    } catch {
      return null;
    }
  }

  try {
    const endpoint = new URL(`https://${host}/ops/api/operator-context`);
    const response = await fetcher(new Request(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        "cf-access-jwt-assertion": assertion,
        "x-request-id": requestHeaders.get("x-request-id") ?? crypto.randomUUID(),
      },
    }));
    if (!response.ok) return null;
    return parseOperatorContext(await response.json());
  } catch {
    return null;
  }
}

async function readVerifiedOpsContext(): Promise<VerifiedOpsContext | null> {
  const requestHeaders = await headers();
  return verifyTrustedOpsContext(requestHeaders.get("x-wtf-ops-context"), requestHeaders.get("x-wtf-ops-proof"))
    ?? await fetchEdgeVerifiedOpsContext(requestHeaders);
}

/** React cache only deduplicates this verification inside the current server render. */
export const getVerifiedOpsContext = cache(readVerifiedOpsContext);

export async function requireVerifiedOpsContext(): Promise<VerifiedOpsContext> {
  const context = await getVerifiedOpsContext();
  if (!context) throw new Error("ops_context_required");
  return context;
}
