import type { AuditEvent, Operator, OperatorRole } from "./db.ts";
import type { OperatorContext } from "./auth/operator-context.ts";

export const protectedResponseHeaders: Readonly<Record<string, string>> = {
  "cache-control": "private, no-store, max-age=0",
  "cdn-cache-control": "no-store",
  "surrogate-control": "no-store",
  "vary": "Authorization, Cookie",
  "x-wtf-ops-cache": "bypass",
};

export type OperatorContextDto = Pick<OperatorContext, "operatorId" | "role" | "environment" | "correlationId">;
export type OperatorDto = Pick<Operator, "id" | "email" | "display_name" | "role" | "active" | "updated_at">;
export type AuditRowDto = Pick<AuditEvent, "occurred_at" | "actor_subject_digest" | "effective_role" | "action" | "entity_type" | "entity_id" | "outcome" | "environment" | "correlation_id">;
export type SafeOpsError = { error: "operator_unavailable" };

export function operatorContextDto(context: OperatorContext): OperatorContextDto {
  return { operatorId: context.operatorId, role: context.role, environment: context.environment, correlationId: context.correlationId };
}

export function operatorDto(operator: Operator): OperatorDto {
  return { id: operator.id, email: operator.email, display_name: operator.display_name, role: operator.role, active: operator.active, updated_at: operator.updated_at };
}

export function auditRowDto(event: AuditEvent): AuditRowDto {
  return {
    occurred_at: event.occurred_at, actor_subject_digest: event.actor_subject_digest, effective_role: event.effective_role,
    action: event.action, entity_type: event.entity_type, entity_id: event.entity_id, outcome: event.outcome,
    environment: event.environment, correlation_id: event.correlation_id,
  };
}

export function safeOpsError(): SafeOpsError {
  return { error: "operator_unavailable" };
}

export function isProtectedResponse(headers: Headers): boolean {
  return headers.get("cache-control") === protectedResponseHeaders["cache-control"]
    && headers.get("cdn-cache-control") === "no-store"
    && headers.get("x-wtf-ops-cache") === "bypass";
}

export function isOperatorRole(value: unknown): value is OperatorRole {
  return value === "super_admin" || value === "admin" || value === "editor";
}
