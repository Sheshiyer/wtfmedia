import "server-only";

import { accessLogoutUrl } from "@/lib/ops/return-to";

/** WTF does not issue an application session; Access remains authoritative. */
export function beginAccessLogout(): string {
  return accessLogoutUrl("/");
}
