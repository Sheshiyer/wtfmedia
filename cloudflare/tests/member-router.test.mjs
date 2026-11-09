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
