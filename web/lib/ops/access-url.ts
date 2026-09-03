/**
 * Cloudflare Access intercepts this path when the `/ops/*` application is
 * configured. The redirect target is a fixed internal path; callers cannot
 * supply an arbitrary destination.
 */
export const BETA_RELEASE_RETURN_TO = "/ops/settings?releaseTrack=beta";

export function accessLoginUrl(): string {
  return `/cdn-cgi/access/login?redirect_url=${encodeURIComponent(BETA_RELEASE_RETURN_TO)}`;
}
