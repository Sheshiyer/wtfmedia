import assert from "node:assert/strict";
import { test } from "node:test";
import { handleOpsRequest } from "../src/ops-router.ts";

const env = { OPS_HOSTNAME: "ops.local.test", OPS_ORIGIN: "https://origin.local.test", OPS_ORIGIN_PROOF: "test-proof", OPS_ENVIRONMENT: "local", CLERK_ISSUER: "https://clerk.example.test", CLERK_JWKS_URL: "https://clerk.example.test/.well-known/jwks.json", CLERK_AUTHORIZED_PARTIES: "https://ops.local.test" };

function db() {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          return sql.includes("SELECT id") ? {
            id: 7,
            email: "operator@example.test",
            display_name: "Operator Example",
            role: "admin",
            active: 1,
            created_at: "2026-08-20T00:00:00.000Z",
            updated_at: "2026-08-26T00:00:00.000Z",
          } : null;
        },
        async run() { return {}; },
        async all() { return { results: [{ display_name: "Approved Person", email: "approved@example.test", role: "editor", active: 1, updated_at: "2026-08-26T00:00:00.000Z" }] }; },
      };
    },
  };
}

test("direct, spoofed, wrong-host, and unknown operator paths deny without origin access", async () => {
  let calls = 0;
  const deps = { verifyClerk: async () => ({ ok: false }), fetchOrigin: async () => { calls++; return new Response("unexpected"); } };
  for (const url of ["https://origin.local.test/ops", "https://ops.local.test/ops/unknown", "https://ops.local.test/ops"]) {
    const response = await handleOpsRequest(new Request(url, { headers: { authorization: "Bearer forged", "x-wtf-ops-context": "spoofed" } }), { ...env, DB: db() }, deps);
    assert.equal(response.status, 404);
  }
  assert.equal(calls, 0);
});

test("protected routes deny before verification when Clerk boundary configuration is incomplete", async () => {
  let called = false;
  const response = await handleOpsRequest(new Request("https://ops.local.test/ops"), { ...env, CLERK_AUTHORIZED_PARTIES: "" }, {
    verifyClerk: async () => { called = true; return { ok: false }; },
  });
  assert.equal(response.status, 404);
  assert.equal(called, false);
});

test("verified operators API returns only the allowlisted roster projection", async () => {
  const response = await handleOpsRequest(new Request("https://ops.local.test/api/ops/operators", { headers: { authorization: "Bearer verified", "x-request-id": "corr-12345678" } }), { ...env, DB: db() }, {
    verifyClerk: async () => ({ ok: true, email: "operator@example.test", userId: "user_test_123" }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { operators: [{ name: "Approved Person", email: "approved@example.test", role: "editor", active: true, changedAt: "2026-08-26T00:00:00.000Z" }] });
});

test("verified profile returns the safe Clerk-to-D1 self projection", async () => {
  const response = await handleOpsRequest(new Request("https://ops.local.test/api/ops/profile", {
    headers: { authorization: "Bearer verified", "x-request-id": "corr-12345678" },
  }), { ...env, DB: db() }, {
    verifyClerk: async () => ({ ok: true, email: "operator@example.test", userId: "user_test_123" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    profile: {
      displayName: "Operator Example",
      email: "operator@example.test",
      role: "admin",
      active: true,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-26T00:00:00.000Z",
      identityProvider: "clerk",
      mapping: "normalized_email_to_active_d1_operator",
      mappingStatus: "matched",
      environment: "local",
      workspace: "operations",
      organizationScope: "unknown",
    },
  });
  assert.equal("userId" in body.profile, false);
  assert.equal("correlationId" in body.profile, false);
});

test("verified active policy-approved context is the only origin handoff", async () => {
  let forwarded;
  const response = await handleOpsRequest(new Request("https://ops.local.test/ops", { headers: { authorization: "Bearer verified", "x-request-id": "corr-12345678" } }), { ...env, DB: db() }, {
    verifyClerk: async () => ({ ok: true, email: "operator@example.test", userId: "user_test_123" }),
    fetchOrigin: async (request) => { forwarded = request; return new Response("origin-ok", { headers: { "cache-control": "public, max-age=900" } }); },
    now: () => 0,
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "origin-ok");
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(forwarded.headers.has("authorization"), false);
  assert.equal(forwarded.headers.get("x-wtf-ops-route"), "edge-verified");
});

test("authenticated conversation deep links use the protected Clerk-to-origin boundary", async () => {
  let forwarded;
  const response = await handleOpsRequest(new Request("https://ops.local.test/chat/cnv_12345678-alice", {
    headers: { authorization: "Bearer verified", "x-request-id": "corr-12345678" },
  }), { ...env, CHAT_HISTORY_ENABLED: true, DB: db() }, {
    verifyClerk: async () => ({ ok: true, email: "operator@example.test", userId: "user_test_123" }),
    fetchOrigin: async (request) => { forwarded = request; return new Response("origin-ok"); },
    now: () => 0,
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "origin-ok");
  assert.equal(forwarded.url, "https://origin.local.test/chat/cnv_12345678-alice");
  assert.equal(forwarded.headers.get("x-wtf-ops-route"), "edge-verified");
  assert.equal(forwarded.headers.has("authorization"), false);
});
