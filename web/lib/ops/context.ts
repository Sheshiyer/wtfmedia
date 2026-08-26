import "server-only";

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

async function readVerifiedOpsContext(): Promise<VerifiedOpsContext | null> {
  const requestHeaders = await headers();
  return verifyTrustedOpsContext(requestHeaders.get("x-wtf-ops-context"), requestHeaders.get("x-wtf-ops-proof"));
}

/** React cache only deduplicates this verification inside the current server render. */
export const getVerifiedOpsContext = cache(readVerifiedOpsContext);

export async function requireVerifiedOpsContext(): Promise<VerifiedOpsContext> {
  const context = await getVerifiedOpsContext();
  if (!context) throw new Error("ops_context_required");
  return context;
}
