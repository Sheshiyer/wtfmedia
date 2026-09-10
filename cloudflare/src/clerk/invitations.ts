export type ClerkInvitationRequest = {
  email: string;
  redirectUrl: string;
  publicMetadata: Record<string, string>;
};

export type ClerkInvitationResult =
  | { id: string; status: "pending" | "accepted" | "revoked" | "expired" }
  | { error: "rate_limited" | "rejected" | "unavailable"; retryAfterSeconds?: number };

type Fetcher = (request: Request) => Promise<Response>;

const clerkInvitationId = /^(?:invitation|inv)_[A-Za-z0-9_-]{1,148}$/u;

function retryAfterSeconds(response: Response): number | undefined {
  const value = Number(response.headers.get("retry-after"));
  return Number.isSafeInteger(value) && value > 0 && value <= 86_400 ? value : undefined;
}

function validInvitation(value: unknown): value is { id: string; status: "pending" | "accepted" | "revoked" | "expired" } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; status?: unknown };
  return typeof candidate.id === "string"
    && clerkInvitationId.test(candidate.id)
    && ["pending", "accepted", "revoked", "expired"].includes(String(candidate.status));
}

/** Server-only narrow Clerk Backend API client. Never return provider response bodies. */
export function createClerkInvitationClient(secret: unknown, fetcher: Fetcher = fetch) {
  const bearer = typeof secret === "string" && secret.trim().length >= 8 ? secret.trim() : null;

  return {
    async create(input: ClerkInvitationRequest): Promise<ClerkInvitationResult> {
      if (!bearer) return { error: "unavailable" };
      let response: Response;
      try {
        response = await fetcher(new Request("https://api.clerk.com/v1/invitations", {
          method: "POST",
          headers: {
            authorization: `Bearer ${bearer}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email_address: input.email,
            redirect_url: input.redirectUrl,
            public_metadata: input.publicMetadata,
          }),
        }));
      } catch {
        return { error: "unavailable" };
      }
      if (response.status === 429) return { error: "rate_limited", ...(retryAfterSeconds(response) ? { retryAfterSeconds: retryAfterSeconds(response) } : {}) };
      if (!response.ok) return { error: "rejected" };
      const payload = await response.json().catch(() => null);
      return validInvitation(payload) ? payload : { error: "unavailable" };
    },
    async revoke(invitationId: string): Promise<ClerkInvitationResult> {
      if (!bearer || !clerkInvitationId.test(invitationId)) return { error: "unavailable" };
      let response: Response;
      try {
        response = await fetcher(new Request(`https://api.clerk.com/v1/invitations/${invitationId}/revoke`, {
          method: "POST",
          headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        }));
      } catch {
        return { error: "unavailable" };
      }
      if (response.status === 429) return { error: "rate_limited", ...(retryAfterSeconds(response) ? { retryAfterSeconds: retryAfterSeconds(response) } : {}) };
      if (!response.ok) return { error: "rejected" };
      const payload = await response.json().catch(() => null);
      return validInvitation(payload) ? payload : { error: "unavailable" };
    },
  };
}
