import "server-only";

export const protectedCacheHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Vary: "Cookie, Authorization",
} as const;

export function protectedFetchInit(): RequestInit {
  return { cache: "no-store", headers: protectedCacheHeaders };
}

export function protectedClientKey(scope: string, correlationId: string): readonly ["ops", string, string] {
  return ["ops", scope, correlationId] as const;
}
