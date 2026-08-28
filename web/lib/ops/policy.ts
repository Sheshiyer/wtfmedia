import "server-only";

export const opsRoles = ["super_admin", "admin", "editor"] as const;
export type OpsRole = typeof opsRoles[number];
export const opsDestinations = ["/ops", "/ops/production", "/ops/operators", "/ops/audit"] as const;
export type OpsDestination = typeof opsDestinations[number];

const grants: Record<OpsRole, ReadonlySet<OpsDestination>> = {
  super_admin: new Set(opsDestinations),
  admin: new Set(opsDestinations),
  editor: new Set(["/ops", "/ops/production"]),
};

export function isOpsRole(value: unknown): value is OpsRole {
  return typeof value === "string" && (opsRoles as readonly string[]).includes(value);
}

export function canAccessOpsPath(role: unknown, pathname: unknown): pathname is OpsDestination {
  return isOpsRole(role) && typeof pathname === "string" && grants[role].has(pathname as OpsDestination);
}

export function activatedOpsNavigation(role: unknown): Array<{ label: string; href: OpsDestination }> {
  if (!isOpsRole(role)) return [];
  return [
    { label: "Control Room", href: "/ops" },
    ...(canAccessOpsPath(role, "/ops/production") ? [{ label: "Production", href: "/ops/production" as const }] : []),
    ...(canAccessOpsPath(role, "/ops/operators") ? [{ label: "Operators", href: "/ops/operators" as const }] : []),
    ...(canAccessOpsPath(role, "/ops/audit") ? [{ label: "Audit", href: "/ops/audit" as const }] : []),
  ];
}
