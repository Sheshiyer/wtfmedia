import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type AccessVerification =
  | { ok: true; email: string }
  | { ok: false };

export type AccessVerifierConfig = {
  issuer: string;
  audience: string;
  jwks: JWTVerifyGetKey;
};

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function createAccessVerifier(config: AccessVerifierConfig) {
  return async (assertion: string | null | undefined): Promise<AccessVerification> => {
    if (!assertion || assertion.length > 16_384) return { ok: false };
    try {
      const verified = await jwtVerify(assertion, config.jwks, {
        issuer: config.issuer,
        audience: config.audience,
      });
      const email = normalizedEmail(verified.payload.email);
      return email ? { ok: true, email } : { ok: false };
    } catch {
      return { ok: false };
    }
  };
}

export function createRemoteAccessVerifier(options: Omit<AccessVerifierConfig, "jwks"> & { jwksUrl: string }) {
  return createAccessVerifier({
    issuer: options.issuer,
    audience: options.audience,
    jwks: createRemoteJWKSet(new URL(options.jwksUrl)),
  });
}
