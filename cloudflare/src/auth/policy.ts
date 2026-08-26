export const roles = ["super_admin", "admin", "editor"] as const;
export const resources = ["control_room", "operators", "audit", "chat"] as const;
export const actions = ["read", "write", "export", "manage", "transfer"] as const;
export type Role = typeof roles[number];
export type Resource = typeof resources[number];
export type Action = typeof actions[number];

const grants: Record<Role, ReadonlySet<`${Resource}:${Action}`>> = {
  super_admin: new Set(["control_room:read", "operators:read", "operators:manage", "operators:transfer", "audit:read", "audit:export", "chat:read", "chat:write"]),
  admin: new Set(["control_room:read", "operators:read", "operators:manage", "audit:read", "audit:export", "chat:read", "chat:write"]),
  editor: new Set(["control_room:read", "chat:read", "chat:write"]),
};

const routeRequirements: Record<string, readonly [Resource, Action]> = {
  "/ops": ["control_room", "read"],
  "/ops/operators": ["operators", "read"],
  "/ops/audit": ["audit", "read"],
};

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function decide(role: unknown, resource: unknown, action: unknown, options: { environment?: unknown; record?: unknown; fields?: unknown } = {}): boolean {
  if (!includes(roles, role) || !includes(resources, resource) || !includes(actions, action)) return false;
  if (options.environment !== undefined && !["local", "staging", "production"].includes(String(options.environment))) return false;
  if (options.record !== undefined && typeof options.record !== "string") return false;
  if (options.fields !== undefined && (!Array.isArray(options.fields) || options.fields.some((field) => typeof field !== "string"))) return false;
  return grants[role].has(`${resource}:${action}`);
}

export function policyForPath(pathname: string): readonly [Resource, Action] | null {
  return routeRequirements[pathname] ?? null;
}

export function canAccessPath(role: unknown, pathname: string): boolean {
  const requirement = policyForPath(pathname);
  return requirement ? decide(role, requirement[0], requirement[1]) : false;
}

export function navigationFor(role: unknown) {
  const items = [{ label: "Control Room", href: "/ops" }];
  if (decide(role, "operators", "read")) items.push({ label: "Operators", href: "/ops/operators" });
  if (decide(role, "audit", "read")) items.push({ label: "Audit", href: "/ops/audit" });
  return items;
}
