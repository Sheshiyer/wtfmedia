# Invite-only Company Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a staging-only, invite-only Ask WTF member Beta for one shared company workspace, piloted with Bangalore while leaving the anonymous public Alpha unchanged.

**Architecture:** Retain the existing Clerk-to-D1 operator mapping and `/ops` control plane. Add a distinct D1 member authority, invite receipt lifecycle, and member-owned chat/memory tables; the edge Worker verifies each Clerk JWT then resolves either a D1 operator or an active invited member according to the route. Clerk application invitations deliver email, while D1 remains authoritative for membership status, role, pilot cohort, audit evidence, and app access.

**Tech Stack:** Cloudflare Workers + D1, Clerk JWTs and Backend Invitations API, Next.js App Router, TypeScript, Node test runner, Vitest, Playwright.

**Spec:** `.planning/RELEASE-SAFE-INTEGRATION.md` and this approved design: shared company workspace; Bangalore is the first rollout cohort; member conversations and explicit memory remain private; operator access does not imply member-content access.

## Source implementation checkpoint — 2026-09-09

The source implementation is present in the current dirty checkout and has not
been committed, pushed, migrated, deployed, or activated. It includes the
member D1 authority and independent release manifest, Clerk invite/revoke
client, admin-only roster lifecycle actions, protected `/beta/api/*` routes,
and the member chat/memory UI. Local verification passed: Cloudflare 204 tests,
web unit 93 tests, typecheck, production build, and `git diff --check`.

Read-only staging inventory on 2026-09-09 found neither local pending
`0009_saved_memory.sql` nor `0010_member_beta.sql` applied, no release-manifest
row, and no staging Worker `CLERK_SECRET_KEY` entry. The remote contains a
different historical migration named `0009_temporary_super_admin_roster.sql`;
the name difference must be reconciled through the reviewed migration receipt,
not overwritten.

The remaining work is external acceptance, not a source claim: apply the
pending migrations to the dedicated staging D1, deploy reviewed edge/web
artifacts, configure and verify the staging-only secret/key pair, set and
verify the member manifest, confirm Clerk invite-only access mode, then
exercise invite, accept, suspend, reactivate, revoke, two-member privacy, and
Alpha invariance using real staging accounts. Do not close #50–#52 until those
receipts and their agreed revised acceptance are recorded.

## Global Constraints

- Public `/chat` and `/api/chat` remain anonymous and behaviorally unchanged.
- `/ops` remains operator-only; a member cannot inherit operator capability from a Clerk session or email domain.
- Member conversations, messages, and saved memories are owned by one D1 member record and cannot be viewed, exported, or archived by another member or an operator in this slice.
- Office/cohort is rollout metadata (`bangalore` first), not an authorization grant.
- Clerk invitation delivery needs a Worker secret named `CLERK_SECRET_KEY`; no secret value is committed, logged, or returned by an API.
- Clerk invitations alone do not restrict sign-up; the Worker must deny every member route unless D1 finds an active invited member.
- All migrations are additive and apply to staging only after a reviewed change; production and public Alpha deployment remain out of scope.
- Memory stays explicit-save, bounded, archive-only, and never derives automatically from chat.

---

### Task 1: Create the member and invitation D1 authority

**Files:**
- Create: `cloudflare/migrations/0010_member_beta.sql`
- Modify: `cloudflare/src/db.ts`
- Test: `cloudflare/tests/d1-migrations.test.mjs`

**Interfaces:**
- Produces `member_users`, `member_invitations`, `member_chat_conversations`, `member_chat_messages`, and `member_saved_memories`.
- Produces `MemberRole = "member"` and member lifecycle values `invited | active | suspended | revoked`.
- Consumed by member resolution, member chat storage, and administrator invitation actions.

- [ ] **Step 1: Write failing migration assertions**

```js
assert.match(migration, /CREATE TABLE member_users/);
assert.match(migration, /CHECK \(pilot_cohort IN \('bangalore', 'company'\)\)/);
assert.match(migration, /CREATE TABLE member_invitations/);
assert.match(migration, /CREATE TABLE member_chat_conversations/);
assert.match(migration, /CREATE TRIGGER member_chat_conversations_no_reassign/);
assert.match(migration, /CREATE TRIGGER member_saved_memories_no_delete/);
```

- [ ] **Step 2: Run the migration test and verify it fails because `0010_member_beta.sql` does not exist**

Run: `npm test --prefix cloudflare -- tests/d1-migrations.test.mjs`

- [ ] **Step 3: Add the additive migration**

Create D1 tables with these non-negotiable fields:

```sql
member_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  clerk_user_id TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role = 'member'),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('invited','active','suspended','revoked')),
  pilot_cohort TEXT NOT NULL CHECK (pilot_cohort IN ('bangalore','company')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT
)
```

Make `member_invitations` append-only for prior sends and include `member_id`, `clerk_invitation_id`, normalized email, `status`, `sent_at`, `accepted_at`, `revoked_at`, `created_by_operator_id`, and `correlation_id`. Make member chat and memory separate tables with `member_id` foreign keys and the same immutable-message/archive-only invariants as the operator tables.

- [ ] **Step 4: Extend D1 types and readiness assertion**

Add typed `Member`, `MemberInvitation`, lifecycle guards, and an assertion that the member tables are present before resolving or serving member routes.

- [ ] **Step 5: Run the migration test and D1 suite**

Run: `npm test --prefix cloudflare -- tests/d1-migrations.test.mjs`

- [ ] **Step 6: Commit the isolated task when the worktree is clean**

```bash
git add cloudflare/migrations/0010_member_beta.sql cloudflare/src/db.ts cloudflare/tests/d1-migrations.test.mjs
git commit -m "feat: add member beta D1 authority"
```

### Task 2: Add server-only Clerk invitation delivery with durable receipts

**Files:**
- Create: `cloudflare/src/members.ts`
- Create: `cloudflare/src/clerk/invitations.ts`
- Modify: `cloudflare/src/ops-router.ts`
- Modify: `cloudflare/src/auth/policy.ts`
- Test: `cloudflare/tests/member-invitations.test.mjs`
- Test: `cloudflare/tests/ops-router.test.mjs`

**Interfaces:**
- Consumes a verified `OperatorContext`, D1 member tables, `CLERK_SECRET_KEY`, and a test-injected `fetch`.
- Produces `GET /ops/api/members` and `POST /ops/api/members` actions `invite`, `revoke`, `suspend`, and `reactivate`.
- Produces no Clerk secret or invitation URL in list responses.

- [ ] **Step 1: Write failing invite lifecycle tests**

```js
test("admin invitation creates a D1 receipt then sends one Clerk application invitation", async () => {
  const result = await inviteMember(db, admin, { email: "pilot@wtf.example", cohort: "bangalore" }, clerk);
  assert.equal(result?.status, "sent");
  assert.equal(clerk.requests[0].url, "https://api.clerk.com/v1/invitations");
});

test("operator content authority never grants member-content access", async () => {
  assert.equal(canMemberContentAccess({ memberId: 1 }, 2), false);
});
```

- [ ] **Step 2: Run tests and verify they fail because the member service and route are absent**

Run: `npm test --prefix cloudflare -- tests/member-invitations.test.mjs tests/ops-router.test.mjs`

- [ ] **Step 3: Implement Clerk application invitation client**

Implement a narrow Worker `fetch` client for `POST https://api.clerk.com/v1/invitations` and `POST /v1/invitations/{id}/revoke`. It must send the secret only in the `Authorization: Bearer` header, pass `email_address`, `redirect_url`, and minimal non-sensitive public metadata, reject non-2xx replies without leaking details, respect `Retry-After` on 429, and be dependency-injectable for tests.

- [ ] **Step 4: Implement D1-first invitation state transitions**

On invite, create an `invited` member plus `dispatching` invitation receipt in a D1 batch, call Clerk once, then record `sent` with the Clerk invitation ID. If Clerk rejects the request, retain a `failed` audit receipt without activating the member. Revoke must call Clerk for a sent invitation before D1 records the member as revoked; never silently claim delivery or revocation on an ambiguous external response.

- [ ] **Step 5: Add policy-gated operator API routes**

Permit roster reads and lifecycle actions only to `admin` and `super_admin`; make member routes return the existing protected 404 shape on unverified or unauthorized calls. Do not reuse the operator seat API or its approval semantics.

- [ ] **Step 6: Run focused tests and complete Cloudflare test suite**

Run: `npm test --prefix cloudflare -- tests/member-invitations.test.mjs tests/ops-router.test.mjs && npm test --prefix cloudflare`

- [ ] **Step 7: Commit the isolated task when the worktree is clean**

```bash
git add cloudflare/src/members.ts cloudflare/src/clerk/invitations.ts cloudflare/src/ops-router.ts cloudflare/src/auth/policy.ts cloudflare/tests/member-invitations.test.mjs cloudflare/tests/ops-router.test.mjs
git commit -m "feat: add auditable member invitations"
```

### Task 3: Build a member-only authenticated chat boundary

**Files:**
- Create: `cloudflare/src/auth/member-context.ts`
- Create: `cloudflare/src/chat/member-history.ts`
- Create: `cloudflare/src/chat/member-memory.ts`
- Modify: `cloudflare/src/ops-router.ts`
- Modify: `cloudflare/src/index.ts`
- Test: `cloudflare/tests/member-context.test.mjs`
- Test: `cloudflare/tests/member-chat.test.mjs`

**Interfaces:**
- Consumes the existing verified Clerk identity and active D1 member record.
- Produces `/beta/api/chat`, `/beta/api/chat/:conversationId`, and `/beta/api/memory` behind member resolution.
- Does not alter `/api/chat`, `/ops/api/chat`, operator history, or operator memory.

- [ ] **Step 1: Write failing context and isolation tests**

```js
test("an active invitation binds a Clerk subject once and yields member context", async () => {
  assert.deepEqual(await resolveMemberContext(db, verifiedIdentity, "staging", "corr-12345678"), {
    memberId: 11, role: "member", workspace: "wtfmedia", pilotCohort: "bangalore",
  });
});

test("a member cannot read, archive, export, or save memory against another member conversation", async () => {
  assert.equal(await getMemberConversation(db, { memberId: 11 }, "cnv_other_member"), null);
});
```

- [ ] **Step 2: Run tests and verify the member boundary is absent**

Run: `npm test --prefix cloudflare -- tests/member-context.test.mjs tests/member-chat.test.mjs`

- [ ] **Step 3: Implement member resolution**

Normalize and match the verified Clerk email to `member_users`; atomically bind the first verified `sub` to the pending invited member, then require `lifecycle_state = 'active'` for every future request. A Clerk account without a matching active D1 member must receive the protected denial response.

- [ ] **Step 4: Implement separate member chat and explicit memory stores**

Copy behavior—not authority—from operator history: create/list/read/archive only within one `member_id`; no cross-member projection or export. Keep `member_saved_memories` explicit-save only, bounded to 2,000 characters per entry and 8,000 characters of model context.

- [ ] **Step 5: Wire a distinct Beta route family and release switch**

Route member calls only through `/beta/api/*`. Introduce a separate staging manifest feature `member_beta_chat`; it begins `paused` and cannot enable production or public Alpha routes.

- [ ] **Step 6: Run focused and full Worker tests**

Run: `npm test --prefix cloudflare -- tests/member-context.test.mjs tests/member-chat.test.mjs && npm test --prefix cloudflare`

- [ ] **Step 7: Commit the isolated task when the worktree is clean**

```bash
git add cloudflare/src/auth/member-context.ts cloudflare/src/chat/member-history.ts cloudflare/src/chat/member-memory.ts cloudflare/src/ops-router.ts cloudflare/src/index.ts cloudflare/tests/member-context.test.mjs cloudflare/tests/member-chat.test.mjs
git commit -m "feat: add private member beta chat"
```

### Task 4: Add the operator Users settings view and member Beta experience

**Files:**
- Create: `web/app/(operator)/ops/settings/users/page.tsx`
- Create: `web/components/domain/ops/MemberAdministrationPanel.tsx`
- Create: `web/app/(member)/beta/page.tsx`
- Create: `web/app/(member)/beta/chat/[conversationSlug]/page.tsx`
- Create: `web/components/domain/member/MemberChatWorkspace.tsx`
- Modify: `web/lib/ops/settings-navigation.ts`
- Modify: `web/middleware.ts`
- Modify: `web/app/ops/api/[...path]/route.ts`
- Test: `web/tests/unit/member-administration.test.ts`
- Test: `web/tests/unit/settings-navigation.test.ts`
- Test: `web/tests/phase2/member-beta.spec.ts`

**Interfaces:**
- Consumes `GET/POST /ops/api/members` for operators and `/beta/api/*` for members.
- Produces `/ops/settings/users` for approved operator roles and `/beta` for authenticated D1 members.
- Preserves `/chat` as the public anonymous page.

- [ ] **Step 1: Write failing UI and route-policy tests**

```ts
it("lists the company users setting for administrators but not editors", () => {
  expect(settingsSectionsFor("admin").some((section) => section.id === "users")).toBe(true);
  expect(settingsSectionsFor("editor").some((section) => section.id === "users")).toBe(false);
});

test("member Beta never changes the anonymous chat route", async ({ page }) => {
  await page.goto("/chat");
  await expect(page.getByText(/sign in/i)).toHaveCount(0);
});
```

- [ ] **Step 2: Run tests and verify they fail before UI implementation**

Run: `npm test --prefix web -- tests/unit/member-administration.test.ts tests/unit/settings-navigation.test.ts`

- [ ] **Step 3: Add the Users settings panel**

Add a protected `users` settings section that shows minimal roster data: email, role, lifecycle, pilot cohort, invitation status, and changed time. Provide admin actions for invite, revoke, suspend, and reactivate; no invitation URL, Clerk secret, session ID, raw chat, or raw memory appears in the UI.

- [ ] **Step 4: Add the member Beta shell**

Use `/beta` and `/beta/chat/:conversationSlug` for the member experience. Send all calls to the same-origin member API, show only the member’s own history and explicit memories, and link logout to public Alpha. Middleware must allow Clerk session processing on `/beta` without converting `/chat` into an authenticated route.

- [ ] **Step 5: Run unit, contract, and browser tests**

Run: `npm test --prefix web -- tests/unit/member-administration.test.ts tests/unit/settings-navigation.test.ts && npm run --prefix web test:contracts && npx --prefix web playwright test tests/phase2/member-beta.spec.ts`

- [ ] **Step 6: Commit the isolated task when the worktree is clean**

```bash
git add web/app web/components/domain/member web/components/domain/ops/MemberAdministrationPanel.tsx web/lib/ops/settings-navigation.ts web/middleware.ts web/tests
git commit -m "feat: add company beta user administration"
```

### Task 5: Record staging-only rollout requirements and verify the release boundary

**Files:**
- Modify: `.planning/RELEASE-SAFE-INTEGRATION.md`
- Modify: `.project/HANDOFF.md`
- Modify: `docs/AGENT-ONBOARDING.md`
- Test: `cloudflare/tests/release-manifest.test.mjs`
- Test: `web/tests/phase2/member-beta.spec.ts`

**Interfaces:**
- Consumes the member Beta release manifest and staging deploy receipt.
- Produces a bounded Bangalore-pilot checklist and a later company-expansion gate.

- [ ] **Step 1: Write the failing release test**

```js
test("member beta cannot activate from a production manifest or public chat flag", async () => {
  assert.equal(isMemberBetaEnabled({ environment: "production", state: "stable" }), false);
  assert.equal(isMemberBetaEnabled({ environment: "staging", state: "paused" }), false);
});
```

- [ ] **Step 2: Run the test and confirm it fails before the dedicated gate exists**

Run: `npm test --prefix cloudflare -- tests/release-manifest.test.mjs`

- [ ] **Step 3: Document the required staging receipts**

Record: migration `0010` applied to `wtfmedia-ops-staging`; Worker and web staging deployments from the reviewed commit; `CLERK_SECRET_KEY`, matching origin proof, and publishable key configured outside Git; Clerk instance access mode restricted for the pilot; one admin plus two Bangalore member accounts; invite delivered, accepted, revoked, and suspended flows verified; cross-member and operator-to-member content denial verified.

- [ ] **Step 4: Run the complete verification suite**

Run: `npm test --prefix cloudflare && npm run --prefix web test:unit && npm run --prefix web test:contracts && npm run --prefix web lint && npm run --prefix web typecheck && npm run --prefix web build && git diff --check`

- [ ] **Step 5: Commit planning and handoff documentation when the worktree is clean**

```bash
git add .planning/RELEASE-SAFE-INTEGRATION.md .project/HANDOFF.md docs/AGENT-ONBOARDING.md cloudflare/tests/release-manifest.test.mjs web/tests/phase2/member-beta.spec.ts
git commit -m "docs: define Bangalore member beta gates"
```

## Plan Review

- **Spec coverage:** Tasks 1–3 establish membership, invitation delivery, RBAC, private data ownership, and a separately gated API. Task 4 supplies the requested admin user/settings page and the member surface. Task 5 preserves the Alpha boundary and defines the Bangalore-to-company rollout receipts.
- **Placeholder scan:** No deferred implementation, unnamed interface, or unspecified test is left in the task steps.
- **Type consistency:** `MemberRole`, `MemberContext`, `memberId`, `member_invitations`, and the `/beta/api/*` route family are used consistently across tasks.
