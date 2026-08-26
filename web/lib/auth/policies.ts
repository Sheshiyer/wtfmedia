// Authorization policies for route protection.
// Maps URL paths to required capabilities for the middleware.

import { checkCapability, type Role, type Resource, type Action } from "./capabilities";

export interface PolicyRule {
  pattern: RegExp;
  resource: Resource;
  action: Action;
  adminOnly?: boolean;
}

export const POLICIES: PolicyRule[] = [
  { pattern: /^\/ops\/operators/, resource: "operators", action: "read", adminOnly: true },
  { pattern: /^\/ops\/audit/, resource: "audit", action: "read", adminOnly: true },
  { pattern: /^\/ops\/settings/, resource: "settings", action: "read", adminOnly: true },
  { pattern: /^\/ops\/analytics/, resource: "analytics", action: "read" },
  { pattern: /^\/ops\/chat/, resource: "chat", action: "read" },
  { pattern: /^\/ops$/, resource: "episodes", action: "read" },
];

export function getPolicyForPath(pathname: string): PolicyRule | null {
  for (const rule of POLICIES) {
    if (rule.pattern.test(pathname)) return rule;
  }
  return null;
}

export function checkPolicy(role: Role | null, pathname: string): boolean {
  if (isPublicRoute(pathname)) return true;
  if (!role || !isProtectedRoute(pathname)) return false;
  const rule = getPolicyForPath(pathname);
  if (!rule) return false;
  if (rule.adminOnly && role !== "admin" && role !== "super_admin") return false;
  return checkCapability(role, rule.resource, rule.action);
}

export function isPublicRoute(pathname: string): boolean {
  const publicPatterns = [/^\/$/, /^\/episodes/, /^\/connections/, /^\/chat/, /^\/api\/chat/, /^\/sign-in/, /^\/_next/, /^\/favicon/, /^\/brand/];
  return publicPatterns.some((p) => p.test(pathname));
}

export function isProtectedRoute(pathname: string): boolean {
  return /^\/ops/.test(pathname);
}
