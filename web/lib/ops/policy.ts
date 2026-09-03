import "server-only";

export const opsRoles = ["super_admin", "admin", "editor"] as const;
export type OpsRole = typeof opsRoles[number];
export const opsDestinations = [
  "/ops",
  "/ops/production",
  "/ops/episodes",
  "/ops/chat",
  "/ops/ingest",
  "/ops/operators",
  "/ops/audit",
] as const;
export type OpsDestination = typeof opsDestinations[number];

const grants: Record<OpsRole, ReadonlySet<OpsDestination>> = {
  super_admin: new Set(opsDestinations),
  admin: new Set(opsDestinations),
  editor: new Set(["/ops", "/ops/production", "/ops/chat"]),
};

export function isOpsRole(value: unknown): value is OpsRole {
  return typeof value === "string" && (opsRoles as readonly string[]).includes(value);
}

/**
 * Local fail-closed compatibility seam. Staging must replace this with the
 * audited server release manifest; a browser can never opt into the route.
 */
export function authenticatedChatReleaseEnabled(): boolean {
  const state = process.env.WTFMEDIA_AUTH_CHAT_RELEASE?.trim().toLowerCase();
  return state === "preview" || state === "stable" || state === "enabled";
}

export function canAccessOpsPath(role: unknown, pathname: unknown): pathname is OpsDestination {
  return isOpsRole(role) && typeof pathname === "string" && grants[role].has(pathname as OpsDestination);
}

export function activatedOpsNavigation(role: unknown): Array<{ label: string; href: OpsDestination }> {
  if (!isOpsRole(role)) return [];
  return [
    { label: "Control Room", href: "/ops" },
    ...(canAccessOpsPath(role, "/ops/production") ? [{ label: "Production", href: "/ops/production" as const }] : []),
    ...(canAccessOpsPath(role, "/ops/episodes") ? [{ label: "Episodes", href: "/ops/episodes" as const }] : []),
    ...(authenticatedChatReleaseEnabled() && canAccessOpsPath(role, "/ops/chat") ? [{ label: "Chat", href: "/ops/chat" as const }] : []),
    ...(canAccessOpsPath(role, "/ops/ingest") ? [{ label: "Ingest", href: "/ops/ingest" as const }] : []),
    ...(canAccessOpsPath(role, "/ops/operators") ? [{ label: "Operators", href: "/ops/operators" as const }] : []),
    ...(canAccessOpsPath(role, "/ops/audit") ? [{ label: "Audit", href: "/ops/audit" as const }] : []),
  ];
}
