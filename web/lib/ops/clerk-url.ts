/**
 * Clerk owns the browser session. The redirect target is a fixed internal
 * path so release controls cannot turn the sign-in link into an open redirect.
 */
export const BETA_RELEASE_RETURN_TO = "/ops/settings?releaseTrack=beta";
export const MEMBER_BETA_RETURN_TO = "/beta";
export const OPERATOR_RETURN_TO = "/ops";

const MEMBER_INVITATION_PATH = "/sign-up";
const invitationTicketPattern = /^[A-Za-z0-9._~-]{16,8192}$/;

/**
 * Clerk appends this one-time value to an invitation redirect. It is not an
 * authorization credential for the app; this only preserves it until the
 * Clerk SignUp component can consume it.
 */
export function memberInvitationTicket(value: string | null | undefined): string | null {
  return typeof value === "string" && invitationTicketPattern.test(value) ? value : null;
}

/**
 * A direct /beta visit starts ordinary sign-in. An invitation return must
 * instead reach the branded SignUp component with the Clerk ticket intact.
 */
export function memberBetaEntryTarget(ticket: string | null | undefined): string {
  const verifiedTicket = memberInvitationTicket(ticket);
  if (!verifiedTicket) return `/sign-in?redirect_url=${encodeURIComponent(MEMBER_BETA_RETURN_TO)}`;
  return `${MEMBER_INVITATION_PATH}?redirect_url=${encodeURIComponent(MEMBER_BETA_RETURN_TO)}&__clerk_ticket=${encodeURIComponent(verifiedTicket)}`;
}

export function clerkRedirectTarget(
  value: string | null | undefined,
  requestOrigin?: string | null,
): typeof OPERATOR_RETURN_TO | typeof BETA_RELEASE_RETURN_TO | typeof MEMBER_BETA_RETURN_TO {
  if (value === MEMBER_BETA_RETURN_TO) return MEMBER_BETA_RETURN_TO;
  if (value === BETA_RELEASE_RETURN_TO) return BETA_RELEASE_RETURN_TO;
  if (!value || !requestOrigin) return OPERATOR_RETURN_TO;

  try {
    const callback = new URL(value);
    if (callback.origin !== requestOrigin) return OPERATOR_RETURN_TO;
    if (callback.pathname === MEMBER_BETA_RETURN_TO) return MEMBER_BETA_RETURN_TO;
    return callback.pathname === BETA_RELEASE_RETURN_TO ? BETA_RELEASE_RETURN_TO : OPERATOR_RETURN_TO;
  } catch {
    return OPERATOR_RETURN_TO;
  }
}

export function clerkLoginUrl(): string {
  return `/sign-in?redirect_url=${encodeURIComponent(BETA_RELEASE_RETURN_TO)}`;
}
