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

test("a verified non-operator Clerk identity self-provisions an owner-scoped member account", async () => {
  let provisioned = false;
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) { calls.push({ sql, args }); return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("FROM operators")) return null;
          if (sql.includes("FROM member_users")) return provisioned ? {
            id: 31,
            email: "new-member@example.test",
            clerk_user_id: "user_new_member_1",
            lifecycle_state: "active",
            pilot_cohort: "company",
          } : null;
          return null;
        },
      };
    },
    async batch() { provisioned = true; return []; },
  };
  assert.deepEqual(
    await resolveMemberContext(db, { ok: true, email: "new-member@example.test", userId: "user_new_member_1" }, "staging", "corr-member-2", "2026-09-10T16:10:00.000Z"),
    { memberId: 31, role: "member", workspace: "wtfmedia", pilotCohort: "company", environment: "staging", correlationId: "corr-member-2" },
  );
  assert.ok(calls.some((call) => call.sql.includes("INSERT OR IGNORE INTO member_users")));
});

test("an active operator is never silently self-provisioned as a member", async () => {
  let wrote = false;
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("FROM operators")) return { id: 7 };
          return null;
        },
      };
    },
    async batch() { wrote = true; return []; },
  };
  assert.equal(await resolveMemberContext(db, { ok: true, email: "admin@example.test", userId: "user_admin_1" }, "staging", "corr-member-admin"), null);
  assert.equal(wrote, false);
});

test("suspended and revoked member rows remain denied under open enrollment", async () => {
  for (const lifecycle_state of ["suspended", "revoked"]) {
    let wrote = false;
    const db = {
      prepare(sql) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes("sqlite_master")) return { ready: 1 };
            if (sql.includes("FROM operators")) return null;
            if (sql.includes("FROM member_users")) return { id: 42, email: "held@example.test", clerk_user_id: "user_held_1", lifecycle_state, pilot_cohort: "company" };
            return null;
          },
        };
      },
      async batch() { wrote = true; return []; },
    };
    assert.equal(await resolveMemberContext(db, { ok: true, email: "held@example.test", userId: "user_held_1" }, "staging", `corr-member-${lifecycle_state}`), null);
    assert.equal(wrote, false);
  }
});
