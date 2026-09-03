export const roles = ["super_admin", "admin", "editor"] as const;
export const resources = ["control_room", "operators", "audit", "chat", "assets", "episodes", "ingest", "transcripts"] as const;
export const actions = ["read", "write", "export", "manage", "transfer", "approve", "create", "upload", "confirm"] as const;
export type Role = typeof roles[number];
export type Resource = typeof resources[number];
export type Action = typeof actions[number];

const grants: Record<Role, ReadonlySet<`${Resource}:${Action}`>> = {
  super_admin: new Set([
    "control_room:read", "operators:read", "operators:manage", "operators:transfer", "operators:approve",
    "audit:read", "audit:export", "chat:read", "chat:write", "chat:export",
    "assets:read", "assets:write", "assets:create", "assets:upload", "assets:confirm", "assets:manage",
    "episodes:read", "episodes:write", "episodes:create", "episodes:manage",
    "ingest:read", "ingest:write", "ingest:create", "ingest:manage",
    "transcripts:read", "transcripts:write", "transcripts:create", "transcripts:manage",
  ]),
  admin: new Set([
    "control_room:read", "operators:read", "operators:manage", "audit:read", "audit:export", "chat:read", "chat:write", "chat:export",
    "assets:read", "assets:write", "assets:create", "assets:upload", "assets:confirm", "assets:manage",
    "episodes:read", "episodes:write", "episodes:create", "episodes:manage",
    "ingest:read", "ingest:write", "ingest:create", "ingest:manage",
    "transcripts:read", "transcripts:write", "transcripts:create", "transcripts:manage",
  ]),
  editor: new Set([
    "control_room:read", "chat:read", "chat:write",
    "assets:read", "assets:write", "assets:create", "assets:upload", "assets:confirm",
    "episodes:read", "ingest:read",
    "transcripts:read", "transcripts:write",
  ]),
};

const routeRequirements: Record<string, readonly [Resource, Action]> = {
  "/ops": ["control_room", "read"],
  "/ops/settings": ["control_room", "read"],
  "/ops/chat": ["chat", "read"],
  "/ops/api/chat": ["chat", "read"],
  "/api/ops/chat": ["chat", "read"],
  "/ops/api/release/authenticated-chat": ["control_room", "read"],
  "/api/ops/release/authenticated-chat": ["control_room", "read"],
  "/ops/api/operator-context": ["control_room", "read"],
  "/api/ops/operator-context": ["control_room", "read"],
  "/ops/production": ["control_room", "read"],
  "/ops/operators": ["operators", "read"],
  "/ops/audit": ["audit", "read"],
  "/ops/ingest": ["ingest", "read"],
  "/ops/episodes": ["episodes", "read"],
  "/ops/api/episodes": ["episodes", "read"],
  "/api/ops/episodes": ["episodes", "read"],
  "/ops/api/ingest/jobs": ["ingest", "read"],
  "/api/ops/ingest/jobs": ["ingest", "read"],
  "/ops/api/ingest/youtube-sync": ["ingest", "create"],
  "/api/ops/ingest/youtube-sync": ["ingest", "create"],
  "/ops/api/assets/upload-intent": ["assets", "create"],
  "/ops/api/assets/upload-stream": ["assets", "upload"],
  "/ops/api/assets/confirm-upload": ["assets", "confirm"],
  "/api/ops/assets/upload-intent": ["assets", "create"],
  "/api/ops/assets/upload-stream": ["assets", "upload"],
  "/api/ops/assets/confirm-upload": ["assets", "confirm"],
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
  if (routeRequirements[pathname]) return routeRequirements[pathname];
  if (/^\/chat\/cnv_[A-Za-z0-9-]{8,88}-[a-z0-9][a-z0-9_-]*$/u.test(pathname)) return ["chat", "read"];
  if (pathname.startsWith("/ops/api/chat/") || pathname.startsWith("/api/ops/chat/") || pathname.startsWith("/ops/chat/")) return ["chat", "read"];
  if (pathname.startsWith("/ops/episodes/") || pathname.startsWith("/api/ops/episodes/") || pathname.startsWith("/ops/api/episodes/")) {
    if (pathname.endsWith("/citation")) return ["episodes", "read"];
    if (pathname.endsWith("/provenance")) return ["episodes", "read"];
    if (pathname.endsWith("/activate")) return ["transcripts", "write"];
    if (pathname.endsWith("/stage")) return ["transcripts", "write"];
    return ["episodes", "read"];
  }
  return null;
}

export function canAccessPath(role: unknown, pathname: string): boolean {
  const requirement = policyForPath(pathname);
  return requirement ? decide(role, requirement[0], requirement[1]) : false;
}

export function navigationFor(role: unknown) {
  const items = [{ label: "Control Room", href: "/ops" }];
  if (decide(role, "control_room", "read")) items.push({ label: "Production", href: "/ops/production" });
  if ((role === "super_admin" || role === "admin") && decide(role, "episodes", "read")) items.push({ label: "Episodes", href: "/ops/episodes" });
  if (decide(role, "ingest", "create") || decide(role, "ingest", "manage")) items.push({ label: "Ingest", href: "/ops/ingest" });
  if (decide(role, "operators", "read")) items.push({ label: "Operators", href: "/ops/operators" });
  if (decide(role, "audit", "read")) items.push({ label: "Audit", href: "/ops/audit" });
  return items;
}
