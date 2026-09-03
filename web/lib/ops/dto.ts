import "server-only";

import type { OpsRole } from "./policy";

export type OperatorContextDto = {
  role: OpsRole | "public_link";
  environment: "local" | "staging" | "production";
  workspace: "operations";
  organizationScope: "unknown";
  lastVerifiedAt: string;
};
export type SafeOpsError = { error: "operator_unavailable" };

export function opsEnvironmentForHost(host: string | null): OperatorContextDto["environment"] {
  const hostname = (host ?? "").split(":", 1)[0].toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return "local";
  if (hostname.includes("-staging.") || hostname.startsWith("staging.")) return "staging";
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

export function operatorContextDto(context: { role: OpsRole; environment: OperatorContextDto["environment"] }): OperatorContextDto {
  return { role: context.role, environment: context.environment, workspace: "operations", organizationScope: "unknown", lastVerifiedAt: new Date().toISOString() };
}

export function ungatedReleaseContextDto(environment = opsEnvironmentForHost(null)): OperatorContextDto {
  return {
    role: "public_link",
    environment,
    workspace: "operations",
    organizationScope: "unknown",
    lastVerifiedAt: "not-observed",
  };
}

export function safeOpsError(): SafeOpsError {
  return { error: "operator_unavailable" };
}
