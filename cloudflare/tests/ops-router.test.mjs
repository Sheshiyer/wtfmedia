import assert from "node:assert/strict";
import { test } from "node:test";
import { handleOpsRequest } from "../src/ops-router.ts";

const env = { OPS_HOSTNAME: "ops.local.test", OPS_ORIGIN: "https://origin.local.test", OPS_ORIGIN_PROOF: "test-proof", OPS_ENVIRONMENT: "local", ACCESS_ISSUER: "https://issuer.test", ACCESS_AUDIENCE: "audience", ACCESS_JWKS_URL: "https://issuer.test/certs" };

function db() {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          return sql.includes("SELECT id") ? { id: 7, email: "operator@example.test", role: "admin", active: 1 } : null;
        },
        async run() { return {}; },
      };
    },
  };
}

test("direct, spoofed, wrong-host, and unknown operator paths deny without origin access", async () => {
  let calls = 0;
  const deps = { verifyAccess: async () => ({ ok: false }), fetchOrigin: async () => { calls++; return new Response("unexpected"); } };
  for (const url of ["https://origin.local.test/ops", "https://ops.local.test/ops/unknown", "https://ops.local.test/ops"]) {
    const response = await handleOpsRequest(new Request(url, { headers: { "cf-access-jwt-assertion": "forged", "x-wtf-ops-context": "spoofed" } }), { ...env, DB: db() }, deps);
    assert.equal(response.status, 404);
  }
  assert.equal(calls, 0);
});

test("verified active policy-approved context is the only origin handoff", async () => {
  let forwarded;
  const response = await handleOpsRequest(new Request("https://ops.local.test/ops", { headers: { "cf-access-jwt-assertion": "verified", "x-request-id": "corr-12345678" } }), { ...env, DB: db() }, {
    verifyAccess: async () => ({ ok: true, email: "operator@example.test" }),
    fetchOrigin: async (request) => { forwarded = request; return new Response("origin-ok", { headers: { "cache-control": "public, max-age=900" } }); },
    now: () => 0,
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "origin-ok");
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(forwarded.headers.has("cf-access-jwt-assertion"), false);
  assert.equal(forwarded.headers.get("x-wtf-ops-route"), "edge-verified");
});
