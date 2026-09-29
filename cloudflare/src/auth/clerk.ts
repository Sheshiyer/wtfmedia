import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type ClerkVerification =
  | { ok: true; email: string; userId: string; firstName?: string; lastName?: string; sessionId?: string }
  | { ok: false };

export type ClerkVerifierConfig = {
  issuer: string;
  jwks: JWTVerifyGetKey;
  authorizedParties?: readonly string[];
  audience?: string | readonly string[];
};

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function safeProfileName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length >= 1 && name.length <= 80 ? name : undefined;
}

function tokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+([^\s]+)$/iu)?.[1] ?? null;
  const cookie = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("__session="))
    ?.slice("__session=".length) ?? null;
  if (bearer && cookie && bearer !== cookie) return null;
  const token = bearer ?? cookie;
  return token && token.length <= 16_384 ? token : null;
}

function validUserId(value: unknown): value is string {
  return typeof value === "string" && /^user_[A-Za-z0-9_-]{1,120}$/u.test(value);
}

export function createClerkVerifier(config: ClerkVerifierConfig) {
  return async (request: Request): Promise<ClerkVerification> => {
    const token = tokenFromRequest(request);
    if (!token || !config.issuer) return { ok: false };
    try {
      const verified = await jwtVerify(token, config.jwks, {
        issuer: config.issuer,
        ...(config.audience ? { audience: config.audience } : {}),
      });
      const authorizedParty = verified.payload.azp;
      if (config.authorizedParties?.length && (typeof authorizedParty !== "string" || !config.authorizedParties.includes(authorizedParty))) {
        return { ok: false };
      }
      const email = normalizedEmail(verified.payload.email);
      const userId = verified.payload.sub;
      if (!email || !validUserId(userId)) return { ok: false };
      const sessionId = typeof verified.payload.sid === "string" && verified.payload.sid.length <= 128
        ? verified.payload.sid
        : undefined;
      const firstName = safeProfileName(verified.payload.given_name);
      const lastName = safeProfileName(verified.payload.family_name);
      return { ok: true, email, userId, ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}), ...(sessionId ? { sessionId } : {}) };
    } catch {
      return { ok: false };
    }
  };
}

export function createRemoteClerkVerifier(options: Omit<ClerkVerifierConfig, "jwks"> & { jwksUrl: string }) {
  return createClerkVerifier({
    issuer: options.issuer,
    jwks: createRemoteJWKSet(new URL(options.jwksUrl)),
    ...(options.authorizedParties ? { authorizedParties: options.authorizedParties } : {}),
    ...(options.audience ? { audience: options.audience } : {}),
  });
}
