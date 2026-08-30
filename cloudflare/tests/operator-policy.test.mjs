import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessPath, decide, navigationFor } from "../src/auth/policy.ts";
import { transferSuperAdmin } from "../src/operators.ts";

test("matrix grants only activated role capabilities", () => {
  for (const role of ["super_admin", "admin", "editor"]) assert.equal(canAccessPath(role, "/ops"), true);
  for (const role of ["super_admin", "admin"]) {
    assert.equal(canAccessPath(role, "/ops/operators"), true);
    assert.equal(canAccessPath(role, "/ops/audit"), true);
  }
  assert.equal(canAccessPath("editor", "/ops/production"), true);
  assert.equal(canAccessPath("editor", "/ops/operators"), false);
  assert.equal(canAccessPath("editor", "/ops/audit"), false);
  assert.equal(decide("super_admin", "operators", "transfer"), true);
  assert.equal(decide("admin", "operators", "transfer"), false);
});

test("unknown and tampered policy inputs deny", () => {
  assert.equal(decide("owner", "operators", "manage"), false);
  assert.equal(decide("editor", "future_module", "read"), false);
  assert.equal(decide("admin", "audit", "read", { environment: "preview" }), false);
  assert.equal(canAccessPath("admin", "/ops/unknown"), false);
  assert.deepEqual(navigationFor("editor"), [
    { label: "Control Room", href: "/ops" },
    { label: "Production", href: "/ops/production" },
    { label: "Episodes", href: "/ops/episodes" },
  ]);
});

test("transfer is super-admin-only, atomic, audited, and checks the final invariant", async () => {
  const statements = [];
  const db = {
    prepare(sql) {
      return { bind(...args) { statements.push({ sql, args }); return this; }, async first() {
        if (sql.includes("SELECT id, active")) return { id: 2, active: 1 };
        if (sql.includes("COUNT(*)")) return { total: 1 };
        return null;
      } };
    },
    async batch(items) { statements.push({ batch: items.length }); },
  };
  assert.equal(await transferSuperAdmin(db, { id: 1, role: "admin", active: true }, 2, "local", "corr-12345678"), false);
  assert.equal(await transferSuperAdmin(db, { id: 1, role: "super_admin", active: true }, 2, "local", "corr-12345678"), true);
  assert.ok(statements.some((entry) => entry.batch === 5));
  assert.ok(statements.some((entry) => entry.args?.includes("super_admin_handoff")));
});
