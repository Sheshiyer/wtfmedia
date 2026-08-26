import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { test } from "node:test";
import { createAccessVerifier } from "../src/auth/access.ts";

const issuer = "https://access.example.test";
const audience = "ops-audience";

async function verifier() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  const verify = createAccessVerifier({ issuer, audience, jwks: createLocalJWKSet({ keys: [jwk] }) });
  const sign = async ({ tokenIssuer = issuer, tokenAudience = audience, expiration = "5m", email = "Operator@Example.test" } = {}) => new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(privateKey);
  return { verify, valid: await sign(), sign };
}

test("jwt accepts only a verified issuer, audience, expiry, and normalized email", async () => {
  const { verify, valid, sign } = await verifier();
  assert.deepEqual(await verify(valid), { ok: true, email: "operator@example.test" });
  assert.deepEqual(await verify("forged.token.value"), { ok: false });
  assert.deepEqual(await verify(await sign({ tokenIssuer: "https://other.example.test" })), { ok: false });
  assert.deepEqual(await verify(await sign({ tokenAudience: "other-audience" })), { ok: false });
  assert.deepEqual(await verify(await sign({ expiration: "-1s" })), { ok: false });
});

test("header identity and role hints never establish authority", async () => {
  const { verify } = await verifier();
  assert.deepEqual(await verify(null), { ok: false });
});
