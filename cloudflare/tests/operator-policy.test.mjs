import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessPath, decide, navigationFor } from "../src/auth/policy.ts";

test("matrix grants only activated role capabilities", () => {
  for (const role of ["super_admin", "admin", "editor"]) assert.equal(canAccessPath(role, "/ops"), true);
  for (const role of ["super_admin", "admin"]) {
    assert.equal(canAccessPath(role, "/ops/operators"), true);
    assert.equal(canAccessPath(role, "/ops/audit"), true);
  }
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
  assert.deepEqual(navigationFor("editor"), [{ label: "Control Room", href: "/ops" }]);
});
