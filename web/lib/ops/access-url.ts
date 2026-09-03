/**
 * Cloudflare Access intercepts the protected settings route when the `/ops/*`
 * application is configured. Keep the CTA on that route so Access owns the
 * login challenge and its return flow; the app must not target a raw
 * `/cdn-cgi/access/login` endpoint.
 */
export const BETA_RELEASE_RETURN_TO = "/ops/settings?releaseTrack=beta";

export function accessLoginUrl(): string {
  return BETA_RELEASE_RETURN_TO;
}
