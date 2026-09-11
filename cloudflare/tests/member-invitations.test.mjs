import assert from "node:assert/strict";
import { test } from "node:test";
import { changeCompanyMemberLifecycle, inviteCompanyMember } from "../src/members.ts";

function invitationDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ phase: "bind", sql, args });
          return this;
        },
        async first() {
          if (sql.includes("FROM member_users")) {
            return {
              id: 19,
              email: "pilot@example.test",
              lifecycle_state: "invited",
              pilot_cohort: "bangalore",
              office: "bangalore",
            };
          }
          return null;
        },
        async run() {
          calls.push({ phase: "run", sql });
          return {};
        },
      };
    },
    async batch(statements) {
      calls.push({ phase: "batch", statements });
      return [];
    },
  };
}

test("admin records member invitation dispatch before sending Clerk email", async () => {
  const db = invitationDb();
  let sawDispatch = false;
  let redirectUrl;
  const result = await inviteCompanyMember(
    db,
    { operatorId: 7, role: "admin" },
    { email: "pilot@example.test", pilotCohort: "bangalore", office: "Bangalore", redirectUrl: "https://staging.example.test/sign-up" },
    "staging",
    "corr-member-invite-1",
    {
      async create(input) {
        sawDispatch = db.calls.some((call) => call.phase === "run" && call.sql.includes("'dispatching'"));
        redirectUrl = input.redirectUrl;
        return { id: "invitation_12345678", status: "pending" };
      },
    },
    "2026-09-09T00:00:00.000Z",
  );

  assert.equal(sawDispatch, true);
  assert.equal(redirectUrl, "https://staging.example.test/sign-up");
  assert.deepEqual(result, {
    memberId: 19,
    email: "pilot@example.test",
    lifecycleState: "invited",
    pilotCohort: "bangalore",
    office: "bangalore",
    invitationStatus: "sent",
  });
  assert.ok(db.calls.some((call) => call.phase === "run" && call.sql.includes("status = 'sent'")));
});

test("editor cannot create a member invitation or invoke Clerk", async () => {
  const db = invitationDb();
  let calls = 0;
  const result = await inviteCompanyMember(
    db,
    { operatorId: 8, role: "editor" },
    { email: "pilot@example.test", pilotCohort: "bangalore", office: "Bangalore", redirectUrl: "https://staging.example.test/beta" },
    "staging",
    "corr-member-invite-2",
    { async create() { calls += 1; return { id: "invitation_12345678", status: "pending" }; } },
  );

  assert.equal(result, null);
  assert.equal(calls, 0);
});

function lifecycleDb(lifecycleState) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        _query: sql,
        bind(...args) { calls.push({ sql, args }); return this; },
        async first() {
          if (sql.includes("FROM member_users")) return { id: 19, email: "pilot@example.test", lifecycle_state: lifecycleState, pilot_cohort: "bangalore", office: "bangalore" };
          if (sql.includes("FROM member_invitations")) return { id: "minv_12345678", clerk_invitation_id: "invitation_12345678" };
          return null;
        },
        async run() { calls.push({ sql, run: true }); return {}; },
      };
    },
    async batch(items) { calls.push({ batch: items }); return items.map(() => ({})); },
  };
}

test("admin lifecycle controls are D1-authoritative and audited", async () => {
  const db = lifecycleDb("active");
  const changed = await changeCompanyMemberLifecycle(
    db,
    { operatorId: 7, role: "admin" },
    "pilot@example.test",
    "suspend",
    "staging",
    "corr-member-suspend",
    { async create() { return { error: "unavailable" }; }, async revoke() { return { error: "unavailable" }; } },
    "2026-09-09T00:00:00.000Z",
  );
  assert.equal(changed, true);
  assert.ok(db.calls.some((call) => call.batch?.some((statement) => statement._query.includes("SET lifecycle_state = ?"))));
});

test("pending invitation revocation waits for Clerk before changing the D1 member", async () => {
  const db = lifecycleDb("invited");
  let revokeCalls = 0;
  const changed = await changeCompanyMemberLifecycle(
    db,
    { operatorId: 7, role: "admin" },
    "pilot@example.test",
    "revoke",
    "staging",
    "corr-member-revoke",
    { async create() { return { error: "unavailable" }; }, async revoke() { revokeCalls += 1; return { id: "invitation_12345678", status: "revoked" }; } },
    "2026-09-09T00:00:00.000Z",
  );
  assert.equal(changed, true);
  assert.equal(revokeCalls, 1);
  assert.ok(db.calls.some((call) => call.batch?.some((statement) => statement._query.includes("status = 'revoked'"))));
});
