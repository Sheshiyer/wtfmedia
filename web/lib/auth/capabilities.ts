// Operator capability matrix — deny-by-default access control.
// Every resource/action pair must be explicitly granted; unknown pairs return false.

export type Role = "super_admin" | "admin" | "editor";

export type Resource =
  | "episodes"
  | "connections"
  | "chat"
  | "analytics"
  | "operators"
  | "settings"
  | "audit";

export type Action =
  | "read"
  | "write"
  | "delete"
  | "export"
  | "invite"
  | "deactivate"
  | "reactivate";

export const CAPABILITIES: Record<Role, Partial<Record<Resource, Action[]>>> = {
  super_admin: {
    episodes: ["read", "write", "delete"], connections: ["read", "write"], chat: ["read", "write", "export"], analytics: ["read", "export"], operators: ["read", "write", "invite", "deactivate", "reactivate"], settings: [], audit: ["read", "export"],
  },
  admin: {
    episodes: ["read", "write", "delete"],
    connections: ["read", "write"],
    chat: ["read", "write", "export"],
    analytics: ["read", "export"],
    operators: ["read", "write", "invite", "deactivate", "reactivate"],
    settings: ["read", "write"],
    audit: ["read"],
  },
  editor: {
    episodes: ["read"],
    connections: ["read"],
    chat: ["read", "write"],
    analytics: ["read"],
    operators: [],
    settings: [],
    audit: [],
  },
} as const;

export interface OperatorContext {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

export function checkCapability(
  role: Role | string | null,
  resource: Resource | string,
  action: Action | string,
): boolean {
  if (typeof role !== "string" || !(Object.keys(CAPABILITIES) as string[]).includes(role)) return false;
  if (!(Object.keys(CAPABILITIES.super_admin) as string[]).includes(resource)) return false;
  if (!["read", "write", "delete", "export", "invite", "deactivate", "reactivate"].includes(action)) return false;
  return CAPABILITIES[role as Role][resource as Resource]?.includes(action as Action) ?? false;
}

export function canAccessResource(
  operator: OperatorContext | null,
  resource: Resource,
  action: Action,
): boolean {
  if (!operator || !operator.active) return false;
  return checkCapability(operator.role, resource, action);
}

export function isAdmin(operator: OperatorContext | null): boolean {
  return (operator?.role === "admin" || operator?.role === "super_admin") && operator.active === true;
}

export function isEditor(operator: OperatorContext | null): boolean {
  return operator?.role === "editor" && operator.active === true;
}
