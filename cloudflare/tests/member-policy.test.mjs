import assert from "node:assert/strict";
import { test } from "node:test";
import { betaCapabilitiesForRole, canAccessPath, decide, policyForPath } from "../src/auth/policy.ts";

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
  assert.equal(canAccessPath("member", "/beta/api/chat"), true);
  assert.equal(canAccessPath("owner", "/beta/api/chat"), false);
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

test("Beta exposes no ingest destination or capability while Alpha operator ingest remains intact", () => {
  for (const role of ["member", "editor", "admin", "super_admin"]) {
    assert.equal(policyForPath("/beta/workspace/ingest"), null);
    assert.equal(canAccessPath(role, "/beta/workspace/ingest"), false);
    assert.equal(betaCapabilitiesForRole(role).some((capability) => capability.startsWith("ingest:")), false);
  }
  assert.deepEqual(policyForPath("/ops/ingest"), ["ingest", "read"]);
  for (const role of ["editor", "admin", "super_admin"]) assert.equal(canAccessPath(role, "/ops/ingest"), true);
});

test("workspace settings session and memory views require control room authority", () => {
  for (const pathname of ["/beta/settings/workspace/sessions", "/beta/settings/workspace/memory"]) {
    assert.deepEqual(policyForPath(pathname), ["control_room", "read"]);
    assert.equal(canAccessPath("member", pathname), false);
    for (const role of ["editor", "admin", "super_admin"]) assert.equal(canAccessPath(role, pathname), true);
  }
});

test("member beta APIs are explicitly method-gated before route dispatch", () => {
  assert.deepEqual(policyForPath("/beta/api/principal-context", "GET"), ["beta", "read"]);
  assert.equal(policyForPath("/beta/api/principal-context", "POST"), null);
  assert.deepEqual(policyForPath("/beta/api/chat", "GET"), ["chat", "read"]);
  assert.deepEqual(policyForPath("/beta/api/chat", "POST"), ["chat", "write"]);
  assert.deepEqual(policyForPath("/beta/api/chat/mcnv_12345678", "DELETE"), ["chat", "write"]);
  assert.deepEqual(policyForPath("/beta/api/chat/mcnv_12345678/archive", "POST"), ["chat", "write"]);
  assert.deepEqual(policyForPath("/beta/api/memory", "POST"), ["memory", "write"]);
  assert.deepEqual(policyForPath("/beta/api/memory/mmem_12345678/archive", "POST"), ["memory", "write"]);
  assert.equal(policyForPath("/beta/api/chat/mcnv_12345678", "PATCH"), null);
  assert.deepEqual(policyForPath("/beta/workspace"), ["control_room", "read"]);
  assert.deepEqual(policyForPath("/beta/settings"), ["beta", "read"]);
  assert.deepEqual(policyForPath("/beta/settings/workspace"), ["control_room", "read"]);
});
