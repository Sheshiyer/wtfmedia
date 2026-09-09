import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMemberContext } from "../src/auth/member-context.ts";

test("an invited Bangalore member becomes active only when Clerk email and subject agree", async () => {
  const calls = [];
  let activated = false;
  const db = {
    prepare(sql) {
      return {
        bind(...args) { calls.push({ sql, args }); return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("FROM member_users")) return activated ? {
            id: 19,
            email: "pilot@example.test",
            clerk_user_id: "user_pilot_1",
            lifecycle_state: "active",
            pilot_cohort: "bangalore",
          } : {
            id: 19,
            email: "pilot@example.test",
            clerk_user_id: null,
            lifecycle_state: "invited",
            pilot_cohort: "bangalore",
          };
          return null;
        },
        async run() { return {}; },
      };
    },
    async batch() { activated = true; return []; },
  };
  const context = await resolveMemberContext(db, { ok: true, email: "pilot@example.test", userId: "user_pilot_1" }, "staging", "corr-member-1", "2026-09-09T00:00:00.000Z");
  assert.deepEqual(context, { memberId: 19, role: "member", workspace: "wtfmedia", pilotCohort: "bangalore", environment: "staging", correlationId: "corr-member-1" });
  assert.ok(calls.some((call) => call.sql.includes("SET clerk_user_id = ?, lifecycle_state = 'active'")));
});

test("an activation race is denied unless the committed Clerk subject matches", async () => {
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("WHERE email")) return { id: 19, email: "pilot@example.test", clerk_user_id: null, lifecycle_state: "invited", pilot_cohort: "bangalore" };
          if (sql.includes("WHERE id")) return { id: 19, email: "pilot@example.test", clerk_user_id: "user_other_1", lifecycle_state: "active", pilot_cohort: "bangalore" };
          return null;
        },
      };
    },
    async batch() { return []; },
  };
  assert.equal(await resolveMemberContext(db, { ok: true, email: "pilot@example.test", userId: "user_pilot_1" }, "staging", "corr-member-race"), null);
});

test("uninvited Clerk identities receive no member context", async () => {
  const db = { prepare() { return { bind() { return this; }, async first() { return null; } }; } };
  assert.equal(await resolveMemberContext(db, { ok: true, email: "unknown@example.test", userId: "user_unknown_1" }, "staging", "corr-member-2"), null);
});
