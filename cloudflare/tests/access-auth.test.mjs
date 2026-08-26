import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { test } from "node:test";
import { createAccessVerifier } from "../src/auth/access.ts";
import { resolveOperatorContext } from "../src/auth/operator-context.ts";

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
  const allowed = await resolveOperatorContext(active, { ok: true, email: "operator@example.test" }, "local", "corr-12345678");
  assert.deepEqual(allowed, { operatorId: 7, email: "operator@example.test", role: "editor", environment: "local", correlationId: "corr-12345678" });
  assert.equal(active.statements.filter((sql) => sql.includes("FROM operators")).length, 1);
  assert.equal(await resolveOperatorContext(dbFor(null), { ok: true, email: "absent@example.test" }, "local", "corr-12345678"), null);
  assert.equal(await resolveOperatorContext(dbFor({ id: 8, email: "inactive@example.test", role: "admin", active: 0 }), { ok: true, email: "inactive@example.test" }, "local", "corr-12345678"), null);
  assert.equal(await resolveOperatorContext(dbFor({ id: 9, email: "unknown@example.test", role: "owner", active: 1 }), { ok: true, email: "unknown@example.test" }, "local", "corr-12345678"), null);
});
