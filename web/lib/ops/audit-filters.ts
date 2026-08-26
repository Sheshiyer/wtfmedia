import "server-only";

const actions = new Set(["auth_allowed", "auth_denied", "session_expired", "logout", "protected_search", "protected_view", "audit_export", "operator_invite", "operator_role_change", "operator_deactivate", "settings_policy_change", "audit_purge", "super_admin_handoff"]);
const outcomes = new Set(["allowed", "denied", "succeeded", "failed"]);
const roles = new Set(["super_admin", "admin", "editor"]);
const environments = new Set(["local", "staging", "production"]);
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export type AuditFilters = { action?: string; outcome?: string; role?: string; environment?: string; before?: string; after?: string };

export function parseAuditFilters(search: URLSearchParams): AuditFilters | null {
  const known = new Set(["action", "outcome", "role", "environment", "before", "after"]);
  if ([...search.keys()].some((key) => !known.has(key))) return null;
  const value = (key: string) => search.get(key) || undefined;
  const result = { action: value("action"), outcome: value("outcome"), role: value("role"), environment: value("environment"), before: value("before"), after: value("after") };
  if ((result.action && !actions.has(result.action)) || (result.outcome && !outcomes.has(result.outcome)) || (result.role && !roles.has(result.role)) || (result.environment && !environments.has(result.environment)) || (result.before && !iso.test(result.before)) || (result.after && !iso.test(result.after))) return null;
  return result;
}
