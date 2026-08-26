import assert from "node:assert/strict";
import { test } from "node:test";
import { approveOperatorInvitation, changeOperatorLifecycle, inviteApprovedOperator } from "../src/operators.ts";

function db() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) { calls.push({ sql, values }); return this; },
        async first() {
          if (sql.includes("operator_invitation_approvals")) return { display_name: "Approved Person" };
          if (sql.includes("SELECT id, role, active")) return { id: 4, role: "editor", active: 1 };
          return null;
        },
      };
    },
    async batch(statements) { calls.push({ batch: statements.length }); },
  };
}

test("only an active super admin can create a normalized invitation approval", async () => {
  const store = db();
  assert.equal(await approveOperatorInvitation(store, { id: 1, role: "admin", active: true }, "new@example.test", "New Person", "local", "corr-12345678"), false);
  assert.equal(await approveOperatorInvitation(store, { id: 1, role: "super_admin", active: true }, " NEW@example.test ", "New Person", "local", "corr-12345678"), true);
  assert.ok(store.calls.some((call) => call.batch === 2));
  assert.ok(store.calls.some((call) => call.values?.includes("new@example.test")));
});

test("an admin can consume a pending approval but cannot infer one", async () => {
  const store = db();
  assert.equal(await inviteApprovedOperator(store, { id: 2, role: "admin", active: true }, "person@example.test", "editor", "local", "corr-12345678"), true);
  assert.equal(await inviteApprovedOperator(store, { id: 2, role: "admin", active: true }, "person@example.test", "super_admin", "local", "corr-12345678"), false);
  assert.ok(store.calls.some((call) => call.sql?.includes("consumed_at")));
});

test("generic lifecycle controls reject the active super-admin seat", async () => {
  const store = db();
  assert.equal(await changeOperatorLifecycle(store, { id: 1, role: "admin", active: true }, "person@example.test", { role: "super_admin" }, "local", "corr-12345678"), false);
});
