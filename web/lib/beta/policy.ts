export type BetaResource = "control_room" | "members" | "audit" | "episodes" | "ingest" | "chat" | "memory" | "release";
export type BetaAction = "read" | "write" | "manage";

/** Canonical browser projection of the edge policy interface. The edge remains authority. */
export function policyForPath(pathname: string): readonly [BetaResource, BetaAction] | null {
  if (pathname === "/beta" || pathname === "/beta/chat" || pathname.startsWith("/beta/chat/")) return ["chat", "read"];
  if (pathname === "/beta/workspace" || pathname.startsWith("/beta/workspace/production")) return ["control_room", "read"];
  if (pathname.startsWith("/beta/workspace/episodes")) return ["episodes", "read"];
  if (pathname.startsWith("/beta/workspace/ingest")) return ["ingest", "read"];
  if (pathname.startsWith("/beta/admin/users")) return ["members", "read"];
  if (pathname.startsWith("/beta/admin/audit")) return ["audit", "read"];
  if (pathname.startsWith("/beta/admin/release")) return ["release", "manage"];
  if (pathname.startsWith("/beta/settings")) return ["control_room", "read"];
  return null;
}
