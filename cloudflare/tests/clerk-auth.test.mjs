import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { test } from "node:test";
import { createClerkVerifier } from "../src/auth/clerk.ts";
import { resolveOperatorContext } from "../src/auth/operator-context.ts";

const issuer = "https://clerk.example.test";
const authorizedParty = "https://ops.example.test";

async function verifier() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  const verify = createClerkVerifier({
    issuer,
    authorizedParties: [authorizedParty],
    jwks: createLocalJWKSet({ keys: [jwk] }),
  });
  const sign = async ({ tokenIssuer = issuer, tokenParty = authorizedParty, expiration = "5m", email = "Operator@Example.test", sub = "user_test_123", includeParty = true } = {}) => {
    const claims = { email, sub, ...(includeParty ? { azp: tokenParty } : {}) };
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(tokenIssuer)
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(privateKey);
  };
  return { verify, valid: await sign(), sign };
}

const bearer = (token) => new Request("https://ops.example.test/ops", { headers: { authorization: `Bearer ${token}` } });

test("Clerk JWT accepts only a verified issuer, expiry, authorized party, user id, and normalized email", async () => {
  const { verify, valid, sign } = await verifier();
  assert.deepEqual(await verify(bearer(valid)), { ok: true, email: "operator@example.test", userId: "user_test_123" });
  assert.deepEqual(await verify(new Request("https://ops.example.test/ops", { headers: { cookie: `__session=${valid}` } })), { ok: true, email: "operator@example.test", userId: "user_test_123" });
  assert.deepEqual(await verify(bearer("forged.token.value")), { ok: false });
  assert.deepEqual(await verify(bearer(await sign({ tokenIssuer: "https://other.example.test" }))), { ok: false });
  assert.deepEqual(await verify(bearer(await sign({ tokenParty: "https://other.example.test" }))), { ok: false });
  assert.deepEqual(await verify(bearer(await sign({ expiration: "-1s" }))), { ok: false });
  assert.deepEqual(await verify(bearer(await sign({ email: "not-an-email" }))), { ok: false });
  assert.deepEqual(await verify(bearer(await sign({ sub: "session_test_123" }))), { ok: false });
});

test("Clerk credentials are required; Access headers and conflicting credentials never establish authority", async () => {
  const { verify, valid } = await verifier();
  assert.deepEqual(await verify(new Request("https://ops.example.test/ops", { headers: { "cf-access-jwt-assertion": valid } })), { ok: false });
  assert.deepEqual(await verify(new Request("https://ops.example.test/ops", { headers: { authorization: `Bearer ${valid}`, cookie: "__session=different" } })), { ok: false });
  assert.deepEqual(await verify(new Request("https://ops.example.test/ops")), { ok: false });
});

function dbFor(operator) {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      statements.push(sql);
      return {
        bind() { return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          return operator;
        },
      };
    },
  };
}

test("operator lookup runs freshly and denies absent, inactive, unknown, or unavailable records", async () => {
  const active = dbFor({ id: 7, email: "operator@example.test", role: "editor", active: 1 });
  const identity = { ok: true, email: "operator@example.test", userId: "user_test_123" };
  const allowed = await resolveOperatorContext(active, identity, "local", "corr-12345678");
  assert.deepEqual(allowed, { operatorId: 7, email: "operator@example.test", role: "editor", environment: "local", correlationId: "corr-12345678" });
  assert.equal(active.statements.filter((sql) => sql.includes("FROM operators")).length, 1);
  assert.equal(await resolveOperatorContext(dbFor(null), { ...identity, email: "absent@example.test" }, "local", "corr-12345678"), null);
  assert.equal(await resolveOperatorContext(dbFor({ id: 8, email: "inactive@example.test", role: "admin", active: 0 }), { ...identity, email: "inactive@example.test" }, "local", "corr-12345678"), null);
  assert.equal(await resolveOperatorContext(dbFor({ id: 9, email: "unknown@example.test", role: "owner", active: 1 }), { ...identity, email: "unknown@example.test" }, "local", "corr-12345678"), null);
});
