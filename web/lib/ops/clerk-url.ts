/**
 * Clerk owns the browser session. The redirect target is a fixed internal
 * path so release controls cannot turn the sign-in link into an open redirect.
 */
export const BETA_RELEASE_RETURN_TO = "/ops/settings?releaseTrack=beta";
export const OPERATOR_RETURN_TO = "/ops";

export function clerkRedirectTarget(value: string | null | undefined): typeof OPERATOR_RETURN_TO | typeof BETA_RELEASE_RETURN_TO {
  return value === BETA_RELEASE_RETURN_TO ? BETA_RELEASE_RETURN_TO : OPERATOR_RETURN_TO;
}

export function clerkLoginUrl(): string {
  return `/sign-in?redirect_url=${encodeURIComponent(BETA_RELEASE_RETURN_TO)}`;
}
