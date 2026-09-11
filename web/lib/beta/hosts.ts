export const PUBLIC_ALPHA_HOSTNAME = "wtfhq.in";
export const BETA_STAGING_HOSTNAME = "beta-staging.wtfhq.in";
export const BETA_PRODUCTION_HOSTNAME = "beta.wtfhq.in";

const betaHostnames = new Set([
  BETA_STAGING_HOSTNAME,
  BETA_PRODUCTION_HOSTNAME,
]);

export function normalizedRequestHostname(hostname: string): string {
  return hostname.trim().replace(/\.$/u, "").toLowerCase();
}

export function isCanonicalBetaHostname(hostname: string): boolean {
  return betaHostnames.has(normalizedRequestHostname(hostname));
}

/** Beta host roots enter the authenticated resolver; Alpha and diagnostics do not. */
export function betaRootRedirectForHost(hostname: string, pathname: string): "/beta" | null {
  return pathname === "/" && isCanonicalBetaHostname(hostname) ? "/beta" : null;
}
