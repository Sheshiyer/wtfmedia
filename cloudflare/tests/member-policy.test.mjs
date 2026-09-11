import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessPath, decide, policyForPath } from "../src/auth/policy.ts";

test("only administrators can read or manage member beta users", () => {
  for (const role of ["super_admin", "admin"]) {
    assert.equal(decide(role, "members", "read"), true);
    assert.equal(decide(role, "members", "manage"), true);
    assert.equal(canAccessPath(role, "/ops/api/members"), true);
    assert.equal(canAccessPath(role, "/ops/settings/users"), true);
  }
  assert.equal(decide("editor", "members", "read"), false);
  assert.equal(decide("editor", "members", "manage"), false);
  assert.equal(canAccessPath("editor", "/ops/api/members"), false);
  assert.deepEqual(policyForPath("/ops/api/members"), ["members", "read"]);
});

test("member policy is not inferred from unknown roles or public routes", () => {
  assert.equal(decide("member", "members", "read"), false);
  assert.equal(canAccessPath("admin", "/beta/api/chat"), false);
  assert.equal(canAccessPath("admin", "/chat"), false);
});

test("canonical beta routes use explicit capabilities and unknown paths fail closed", () => {
  assert.deepEqual(policyForPath("/beta/chat"), ["chat", "read"]);
  assert.deepEqual(policyForPath("/beta/settings/account"), ["beta", "read"]);
  assert.deepEqual(policyForPath("/beta/workspace/production"), ["control_room", "read"]);
  assert.deepEqual(policyForPath("/beta/admin/users"), ["members", "read"]);
  assert.deepEqual(policyForPath("/beta/admin/release"), ["release", "manage"]);
  assert.equal(canAccessPath("member", "/beta/chat"), true);
  assert.equal(canAccessPath("member", "/beta/workspace/production"), false);
  assert.equal(canAccessPath("admin", "/beta/admin/release"), false);
  assert.equal(canAccessPath("super_admin", "/beta/admin/release"), true);
  assert.equal(policyForPath("/beta/unknown"), null);
});
