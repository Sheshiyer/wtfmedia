# Beta RBAC restructure + chat redesign — design

Date: 2026-09-14. Status: draft for owner review.

## Context

The beta today has two identity tracks: `operators` (roles super_admin/admin/editor,
backs the `/ops` control room and the `/beta/admin/*` + `/beta/workspace/*` areas) and
`member_users` (fixed role `member`, backs `/beta` chat + settings, owns all
chat/memory data). Enrollment is open: any verified Clerk email is auto-provisioned
as an active member (`principal-context.ts`, audited as `open_enrollment`).

Target: one app (`/beta`) with exactly three roles and invite-only access.

- **editor** — the current member experience: ask wtf chat + settings.
- **admin** — everything editor has, plus user invitations (invite/revoke editors)
  and the YouTube analytics channel-connection section.
- **super_admin** — everything admin has, plus inviting admins and the control-room
  surfaces (episodes, ingest, production, audit, release).

Owner decisions already made: one app with tiered roles (ops control room survives as
a super_admin-only area inside the beta shell); no user-data wipe this round
(deletion deferred, will be a separate reviewed step); chat redesign = sidebar +
inline answers.

## Approach 1 (approved): unify at the policy layer now, merge tables at the wipe

No data migration this round. The two tables stay, but all behavior keys off the
resolved role, not the table:

- Operator rows resolve first (unchanged — no downgrade of a lifecycle denial).
- Member rows keep working; code treats the legacy `member` role as the editor tier
  (identical grants: `beta:read`, `chat:read/write`, `memory:read/write`).
- When the wipe happens later, a single clean users table with a 3-role CHECK is
  rebuilt and the bootstrap super_admin (email TBD by owner) is seeded. That step
  gets its own reviewed migration and is out of scope here.

## 1. Invite-only enrollment (edge)

`resolvePrincipalContext` in `cloudflare/src/auth/principal-context.ts`:

- Remove the open-enrollment `INSERT` (unknown verified email → active member).
- New resolution order: operator row (active) → member row (`active` or `invited`;
  `invited` activates on first login as today) → otherwise deny with a distinct
  `not_invited` outcome so the web shell can render the closed "request access"
  state instead of a generic 403.
- The audit metadata source `open_enrollment` disappears; activation events keep
  `source: "invitation"`.

## 2. Policy and surfaces (edge + web)

`policyForPath`/`decide` keep failing closed. Tier changes:

- `/beta`, `/beta/chat*`, `/beta/settings` (account, memory, sessions, appearance):
  all three roles (member alias included).
- `/beta/admin/users`: admin + super_admin. The invite UI offers **editor** invites
  (admin and super_admin may create them); only super_admin sees/creates **admin**
  invites.
- `/beta/settings/workspace/analytics` (YouTube channel connection): admin +
  super_admin, promoted out of `previewOnly` for those roles.
- `/beta/workspace/*` (control room, episodes, ingest, production),
  `/beta/admin/audit`, `/beta/admin/release`: **super_admin only** (tightened from
  today's editor/admin access — matches "only three roles" tiering).
- Server side: member invitations already require `members:manage` (admin+) at the
  edge; operator invitations already require `operators:manage` + super_admin
  approval for privileged roles. No edge policy weakening; the web tier gating
  mirrors existing edge grants.

Navigation (`web/lib/member/navigation.ts` + shell): nav groups are computed from
the resolved role — editor sees ask wtf + settings; admin adds users + the YouTube
section; super_admin adds the workspace/admin group. Role comes from
`/beta/api/principal-context` (already fetched by `BetaPrincipalGate`).

## 3. Chat behavior fixes (web)

Root causes in `MemberChatWorkspace` / `BetaChatAdapter`:

1. **Answer completes → full reload.** A new conversation does `router.push(href)`,
   which re-mounts the route and refetches; every send also bumps
   `sessionRevision`, forcing the navigator to refetch the entire history list.
2. **Switching conversations refetches history.** `load()` always calls
   `adapter.get(id)` with no client-side caching.

Fix: a client-side conversation store (React context in the beta shell, backed by a
module-level `Map`):

- `get(id)`: render from cache immediately when present; revalidate in background;
  only fetch on cold cache.
- `send`: the POST response **is** the full conversation view — upsert it into the
  store (thread + list entry) and navigate with the cache pre-warmed, so the route
  change renders instantly with zero refetch. No more `sessionRevision` full-list
  refetch; archive/delete update the store incrementally.
- Failed sends keep the existing retry-intent behavior unchanged.

## 4. Chat UI redesign (web)

ChatGPT/Claude-style layout, in the existing WTFOS visual language:

- **Left sidebar** (persistent on desktop, drawer on mobile): new-chat button,
  conversation list grouped by recency, per-item archive/delete affordances.
  Replaces the current hidden `MemberSessionNavigator` drawer on desktop.
- **Centered thread**: max-width column, user messages and assistant answers with
  the existing citation/moment rendering unchanged.
- **Bottom composer**: docked, multiline, enter-to-send; source-mode control moves
  beside it.
- Structure: new `BetaChatShell` component (sidebar + thread + composer) wrapping
  the existing adapter layer — member and operator transports stay as-is.

## 5. YouTube analytics connection

The existing `YouTubeAnalyticsSettingsPanel` carries over as-is into the admin
tier at `/beta/settings/workspace/analytics`; for admin/super_admin it renders the
real panel (not `previewOnly`). No new backend work — the panel is already an
observation adapter over existing endpoints.

## 6. Deferred (not this round)

- Wiping `member_users` / `member_invitations` / `operators` rows, rebuilding a
  single users table with a 3-role CHECK, and seeding the bootstrap super_admin
  (owner to supply the email). Separate reviewed migration.
- Removing the `/ops` route tree. It stays mounted; the beta shell becomes the
  primary surface. Redirect/retire decisions come with the wipe.

## Testing

- Edge: enrollment tests (unknown email denied `not_invited`, invited activates,
  member alias resolves as editor); policy tests for the tightened super_admin-only
  routes; invite-hierarchy tests (admin cannot invite admins).
- Web: unit tests for the conversation store (cache hit on switch, upsert on send,
  no refetch on new-chat navigation); navigation-by-role unit tests; Storybook
  component tests for `BetaChatShell` (sidebar, composer, archived states).
- Gates: edge `npm test`; web typecheck, lint (`--max-warnings=0`), `test:unit`,
  `test:contracts`, `test:components`.

## Assumptions to confirm during review

1. Legacy `member` rows keep working as editors until the deferred wipe.
2. Tightening episodes/ingest/audit/release to super_admin-only is intended (today
   admins and editors can read some of these).
3. The YouTube panel ships in its current read-only/observation form; live channel
   OAuth connection is a separate future item.
