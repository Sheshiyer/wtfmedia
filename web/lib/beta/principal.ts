export type PrincipalKind = "member" | "operator";
export type PrincipalRole = "member" | "editor" | "admin" | "super_admin";

export type PrincipalContext = {
  kind: PrincipalKind;
  role: PrincipalRole;
  email: string;
  firstName?: string;
  lastName?: string;
  canonicalLanding: "/beta/chat" | "/beta/workspace";
  capabilities: readonly string[];
  environment: "local" | "staging" | "production";
};

/** Browser DTO boundary. Unknown or operator-only fields are discarded. */
export function parsePrincipalContext(value: unknown): PrincipalContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const kind = raw.kind === "member" || raw.kind === "operator" ? raw.kind : raw.principalKind;
  if (kind !== "member" && kind !== "operator") return null;
  const role = typeof raw.role === "string" && ["member", "editor", "admin", "super_admin"].includes(raw.role)
    ? raw.role as PrincipalRole
    : null;
  if (!role || typeof raw.email !== "string" || !raw.email.includes("@")) return null;
  const landingValue = raw.canonicalLanding ?? raw.landingRoute;
  const landing = landingValue === "/beta/chat"
    ? "/beta/chat"
    : kind === "member" ? "/beta/chat" : "/beta/workspace";
  const environment = raw.environment === "staging" || raw.environment === "production" ? raw.environment : "local";
  const capabilities = Array.isArray(raw.capabilities)
    ? raw.capabilities.filter((entry): entry is string => typeof entry === "string").slice(0, 128)
    : [];
  return {
    kind,
    role,
    email: raw.email,
    ...(typeof raw.firstName === "string" ? { firstName: raw.firstName } : {}),
    ...(typeof raw.lastName === "string" ? { lastName: raw.lastName } : {}),
    canonicalLanding: landing,
    capabilities,
    environment,
  };
}

export function principalCanAccess(context: PrincipalContext, pathname: string): boolean {
  if (pathname === "/beta" || pathname === "/beta/api/principal-context") return true;
  if (context.kind === "member") return pathname === "/beta/chat" || pathname.startsWith("/beta/chat/") || pathname.startsWith("/beta/settings/") || pathname === "/beta/settings";
  return pathname.startsWith("/beta/workspace") || pathname.startsWith("/beta/settings") || pathname.startsWith("/beta/admin") || pathname.startsWith("/beta/api/");
}

export function capabilityForPath(pathname: string): string | null {
  if (pathname.startsWith("/beta/admin/release")) return "release:manage";
  if (pathname.startsWith("/beta/admin/users")) return "members:read";
  if (pathname.startsWith("/beta/admin/audit")) return "audit:read";
  if (pathname.startsWith("/beta/workspace/ingest")) return "ingest:read";
  if (pathname.startsWith("/beta/workspace/episodes")) return "episodes:read";
  if (pathname.startsWith("/beta/workspace")) return "control_room:read";
  if (pathname.startsWith("/beta/settings/workspace")) return "control_room:read";
  return null;
}
