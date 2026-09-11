import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { principalContextDto, resolvePrincipalContext } from "../src/auth/principal-context.ts";

const identity = { ok: true, email: "person@example.test", userId: "user_person_1", firstName: "Person", lastName: "Example" };

function contextDb({ operator = null, member = null } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) { calls.push({ sql, args }); return this; },
        async first() {
          if (sql.includes("sqlite_master")) return { ready: 1 };
          if (sql.includes("FROM operators")) return operator;
          if (sql.includes("FROM member_users")) return member;
          return null;
        },
      };
    },
    async batch() { return []; },
  };
}

test("principal resolution gives active operators precedence over historical member rows", async () => {
  const db = contextDb({
    operator: { id: 7, email: identity.email, display_name: "Control Person", role: "editor", active: 1 },
    member: { id: 9, email: identity.email, clerk_user_id: identity.userId, lifecycle_state: "active", pilot_cohort: "company" },
  });
  const context = await resolvePrincipalContext(db, identity, "staging", "corr-principal-1");
  assert.equal(context?.kind, "operator");
  assert.equal(context?.role, "editor");
  assert.equal(db.calls.some((call) => call.sql.includes("FROM member_users")), false);
});

test("an inactive operator denies instead of falling back to a colliding member", async () => {
  const db = contextDb({
    operator: { id: 7, email: identity.email, display_name: "Former Operator", role: "editor", active: 0 },
    member: { id: 9, email: identity.email, clerk_user_id: identity.userId, lifecycle_state: "active", pilot_cohort: "company" },
  });
  assert.equal(await resolvePrincipalContext(db, identity, "staging", "corr-principal-2"), null);
  assert.equal(db.calls.some((call) => call.sql.includes("FROM member_users")), false);
});

test("suspended and revoked members deny while absent users retain local/staging enrollment", async () => {
  for (const lifecycle_state of ["suspended", "revoked"]) {
    assert.equal(await resolvePrincipalContext(contextDb({ member: { id: 9, email: identity.email, clerk_user_id: identity.userId, lifecycle_state, pilot_cohort: "company" } }), identity, "staging", `corr-principal-${lifecycle_state}`), null);
  }
  let provisioned = false;
  const open = contextDb();
  const originalPrepare = open.prepare;
  open.prepare = (sql) => {
    const statement = originalPrepare(sql);
    if (sql.includes("FROM member_users")) statement.first = async () => provisioned ? { id: 12, email: identity.email, clerk_user_id: identity.userId, lifecycle_state: "active", pilot_cohort: "company" } : null;
    return statement;
  };
  open.batch = async () => { provisioned = true; return []; };
  const enrolled = await resolvePrincipalContext(open, identity, "staging", "corr-principal-open", "2026-09-11T00:00:00.000Z");
  assert.equal(enrolled?.kind, "member");
  assert.ok(open.calls.some((call) => call.sql.includes("INSERT OR IGNORE INTO member_users")));
  assert.ok(open.calls.some((call) => call.sql.includes("principal_profiles") && call.sql.includes("ON CONFLICT(email)")));
});

test("the browser principal DTO contains safe display fields and no stable internal correlators", () => {
  const dto = principalContextDto({
    kind: "member", memberId: 9, role: "member", email: identity.email, firstName: "Person", lastName: "Example", displayName: "Person Example",
    workspace: "wtfmedia", pilotCohort: "company", environment: "staging", correlationId: "corr-principal-private",
  });
  assert.deepEqual(dto, {
    kind: "member", role: "member", email: identity.email, firstName: "Person", lastName: "Example", displayName: "Person Example",
    landingRoute: "/beta/chat", capabilities: ["beta:read", "chat:read", "chat:write", "memory:read", "memory:write"], environment: "staging",
  });
  assert.doesNotMatch(JSON.stringify(dto), /memberId|operatorId|correlationId|user_|hash|digest/i);
});

test("operator principals land on the canonical Beta workspace root", () => {
  const dto = principalContextDto({
    kind: "operator", operatorId: 7, role: "editor", email: "operator@example.test", displayName: "Operator", environment: "staging", correlationId: "corr-principal-operator",
  });
  assert.equal(dto.landingRoute, "/beta/workspace");
});

test("principal DTO type permits only canonical Beta landing routes", () => {
  const source = readFileSync(new URL("../src/auth/principal-context.ts", import.meta.url), "utf8");
  assert.match(source, /landingRoute: "\/beta\/chat" \| "\/beta\/workspace";/);
  assert.doesNotMatch(source, /landingRoute: "\/beta\/chat" \| "\/beta\/workspace\/production";/);
});
