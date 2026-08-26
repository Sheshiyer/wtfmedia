import "server-only";

import type { OpsRole } from "./policy";

export type OperatorContextDto = { role: OpsRole; environment: "local" | "staging" | "production"; workspace: "operations"; organizationScope: "unknown"; lastVerifiedAt: string };
export type SafeOpsError = { error: "operator_unavailable" };

export function operatorContextDto(context: { role: OpsRole; environment: OperatorContextDto["environment"] }): OperatorContextDto {
  return { role: context.role, environment: context.environment, workspace: "operations", organizationScope: "unknown", lastVerifiedAt: new Date().toISOString() };
}

export function safeOpsError(): SafeOpsError {
  return { error: "operator_unavailable" };
}
