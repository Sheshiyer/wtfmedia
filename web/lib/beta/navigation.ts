export type BetaAudience = "member" | "operator" | "admin" | "super_admin";

export type BetaNavigationDestination = {
  href: string;
  /** Canonical edge policy path. */
  edgePath: string;
  capability: string;
  audiences: readonly BetaAudience[];
};

/** Browser navigation contract. Authorization still happens at the edge. */
export const BETA_PROTECTED_DESTINATIONS: readonly BetaNavigationDestination[] = [
  { href: "/beta", edgePath: "/beta", capability: "beta:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/chat", edgePath: "/beta/chat", capability: "chat:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/settings", edgePath: "/beta/settings", capability: "beta:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/settings/account", edgePath: "/beta/settings/account", capability: "beta:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/settings/memory", edgePath: "/beta/settings/memory", capability: "memory:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/settings/sessions", edgePath: "/beta/settings/sessions", capability: "chat:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/settings/appearance", edgePath: "/beta/settings/appearance", capability: "beta:read", audiences: ["member", "operator", "admin", "super_admin"] },
  { href: "/beta/workspace", edgePath: "/beta/workspace", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/workspace/production", edgePath: "/beta/workspace/production", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/workspace/episodes", edgePath: "/beta/workspace/episodes", capability: "episodes:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/workspace/ingest", edgePath: "/beta/workspace/ingest", capability: "ingest:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace", edgePath: "/beta/settings/workspace", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/readiness", edgePath: "/beta/settings/workspace/readiness", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/release", edgePath: "/beta/settings/workspace/release", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/ai", edgePath: "/beta/settings/workspace/ai", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/analytics", edgePath: "/beta/settings/workspace/analytics", capability: "control_room:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/sessions", edgePath: "/beta/settings/workspace/sessions", capability: "chat:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/memory", edgePath: "/beta/settings/workspace/memory", capability: "memory:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/settings/workspace/sources", edgePath: "/beta/settings/workspace/sources", capability: "transcripts:read", audiences: ["operator", "admin", "super_admin"] },
  { href: "/beta/admin/users", edgePath: "/beta/admin/users", capability: "members:read", audiences: ["admin", "super_admin"] },
  { href: "/beta/admin/audit", edgePath: "/beta/admin/audit", capability: "audit:read", audiences: ["admin", "super_admin"] },
  { href: "/beta/admin/release", edgePath: "/beta/admin/release", capability: "release:manage", audiences: ["super_admin"] },
];

export function betaDestinationForPath(pathname: string): BetaNavigationDestination | null {
  const exact = BETA_PROTECTED_DESTINATIONS.find((item) => item.href === pathname);
  if (exact) return exact;
  if (/^\/beta\/chat\/(?:mcnv|cnv)_[A-Za-z0-9-]{8,88}$/u.test(pathname)) return BETA_PROTECTED_DESTINATIONS.find((item) => item.href === "/beta/chat") ?? null;
  return null;
}

export function capabilityForBetaPath(pathname: string): string | null {
  return betaDestinationForPath(pathname)?.capability ?? null;
}

export function audienceForRole(role: string): BetaAudience {
  return role === "member" ? "member" : role === "admin" ? "admin" : role === "super_admin" ? "super_admin" : "operator";
}
