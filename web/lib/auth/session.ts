import "server-only";

/** WTF does not issue an application session; Clerk remains authoritative. */
export function beginClerkLogout(): string {
  return "/";
}
