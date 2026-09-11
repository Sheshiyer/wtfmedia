import assert from "node:assert/strict";
import { test } from "node:test";
import { handleMemberRequest } from "../src/member-router.ts";

const env = {
  OPS_HOSTNAME: "ops.staging.test",
  OPS_ENVIRONMENT: "staging",
  CHAT_HISTORY_ENABLED: "stable",
  CLERK_ISSUER: "https://clerk.example.test",
  CLERK_JWKS_URL: "https://clerk.example.test/.well-known/jwks.json",
  CLERK_AUTHORIZED_PARTIES: "https://ops.staging.test",
};

function db() {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes("member_beta_releases")) return { state: "stable" };
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("FROM member_users")) return { id: 91, email: "member@example.test", clerk_user_id: "user_member_1", lifecycle_state: "active", pilot_cohort: "bangalore" };
          return null;
        },
        async all() { return { results: [] }; },
      };
    },
  };
}

test("member API fails closed before Clerk verification for the wrong host", async () => {
  let verified = false;
  const response = await handleMemberRequest(new Request("https://public.example.test/beta/api/context"), { ...env, DB: db() }, { verifyClerk: async () => { verified = true; return { ok: false }; } });
  assert.equal(response.status, 404);
  assert.equal(verified, false);
});

test("a missing member-beta release manifest remains denied even with an active member", async () => {
  const paused = db();
  const original = paused.prepare;
  paused.prepare = (sql) => {
    const statement = original(sql);
    if (sql.includes("member_beta_releases")) statement.first = async () => null;
    return statement;
  };
  const response = await handleMemberRequest(new Request("https://ops.staging.test/beta/api/context"), { ...env, DB: paused }, { verifyClerk: async () => ({ ok: true, email: "member@example.test", userId: "user_member_1" }) });
  assert.equal(response.status, 404);
});

test("an activated invited member receives only their beta context and history", async () => {
  const response = await handleMemberRequest(new Request("https://ops.staging.test/beta/api/chat", { headers: { authorization: "Bearer verified" } }), { ...env, DB: db() }, { verifyClerk: async () => ({ ok: true, email: "member@example.test", userId: "user_member_1" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { conversations: [], nextCursor: null });
});

test("principal-context returns a safe browser DTO and separates authentication from lifecycle denial", async () => {
  const request = new Request("https://ops.staging.test/beta/api/principal-context", { headers: { authorization: "Bearer verified", "x-request-id": "corr-principal-router" } });
  const response = await handleMemberRequest(request, { ...env, DB: db() }, { verifyClerk: async () => ({ ok: true, email: "member@example.test", userId: "user_member_1", firstName: "Member", lastName: "Example" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    kind: "member", role: "member", email: "member@example.test", firstName: "Member", lastName: "Example", displayName: "Member Example",
    landingRoute: "/beta/chat", capabilities: ["beta:read", "chat:read", "chat:write", "memory:read", "memory:write"], environment: "staging",
  });
  const signedOut = await handleMemberRequest(request, { ...env, DB: db() }, { verifyClerk: async () => ({ ok: false }) });
  assert.equal(signedOut.status, 401);
  const inactiveOperatorDb = db();
  const originalPrepare = inactiveOperatorDb.prepare;
  inactiveOperatorDb.prepare = (sql) => {
    const statement = originalPrepare(sql);
    if (sql.includes("FROM operators")) statement.first = async () => ({ id: 7, email: "member@example.test", display_name: "Inactive", role: "editor", active: 0 });
    return statement;
  };
  const denied = await handleMemberRequest(request, { ...env, DB: inactiveOperatorDb }, { verifyClerk: async () => ({ ok: true, email: "member@example.test", userId: "user_member_1" }) });
  assert.equal(denied.status, 403);
});

test("member routes reject unsupported methods and unknown API paths before persistence", async () => {
  const dependencies = { verifyClerk: async () => ({ ok: true, email: "member@example.test", userId: "user_member_1" }) };
  const unsupported = await handleMemberRequest(new Request("https://ops.staging.test/beta/api/chat", { method: "PATCH", headers: { authorization: "Bearer verified" } }), { ...env, DB: db() }, dependencies);
  assert.equal(unsupported.status, 404);
  const unknown = await handleMemberRequest(new Request("https://ops.staging.test/beta/api/not-a-route", { headers: { authorization: "Bearer verified" } }), { ...env, DB: db() }, dependencies);
  assert.equal(unknown.status, 404);
});
