# Member Beta workspace mapping and remediation plan

## Status

**PLANNING INPUT — READY FOR A FRESH IMPLEMENTATION SESSION.** This document
maps the authenticated member Beta work that already exists, identifies the
actual product gaps visible in the 2026-09-10 staging review, and sequences a
staging-only remediation. It does not authorize a production deployment,
Cloudflare resource deletion, Clerk policy change, D1 data rewrite, or Public
Alpha change.

The live staging route at `/beta` is a valid authenticated integration baseline,
but its current single-page dashboard is an interim presentation rather than
the intended member product. Preserve its working identity, routing, privacy,
and persistence seams while replacing the information architecture around them.

## Goal

Turn the existing authenticated member Beta into a coherent, account-scoped Ask
WTF workspace: a persistent conversation rail, switchable and continuable chats,
member Settings, explicit memory controls, useful account copy, and clear Alpha
and Beta navigation. The work is complete only when one super-admin and two
ordinary members pass the existing live authorization and isolation gates.

## User review incorporated

1. Replace `your private workspace` with a personalized welcome using the
   signed-in member's safe display name and a neutral fallback.
2. Keep the current side panel, but replace implementation language such as
   Clerk, ownership scope, and catalogue policy with useful product guidance.
3. Replace the inline history card with a persistent ChatGPT/Claude-style
   conversation rail that supports new chats, switching, deep links, and
   continuation without repeating authentication.
4. Remove memory management from the Ask WTF home workspace and place it in
   normal-member Settings.
5. Add a copyable preference-extraction prompt and a review-before-save import
   flow in memory Settings. Nothing generated or pasted becomes memory without
   explicit member confirmation.
6. Expand the hamburger into a clear Alpha/Beta directory while preserving the
   anonymous/public boundary.
7. Add Settings for ordinary members. Operator/admin governance settings remain
   protected under `/beta/ops/settings` and are never exposed to members.

## Preserve / adapt / build map

| Product concern | Existing source and proven behavior | Disposition | Target use |
|---|---|---|---|
| Clerk browser session | `/beta` obtains a Clerk token and the Edge verifies issuer, JWKS, authorized party, subject, and normalized email | **Preserve** | Identity only; never use Clerk claims as RBAC authority |
| Operator routing | `/beta` checks `/ops/api/operator-context` first and routes active operators to `/beta/ops` | **Preserve** | Super-admin/admin/editor routing remains D1-authoritative |
| Member enrollment | `resolveMemberContext` excludes active operators, binds an invitation or self-provisions one active member, and fails closed for suspended/revoked rows | **Preserve** | One Clerk subject to one member row; staging only |
| Member API privacy | `/beta/api/*` requires staging host, active release, Clerk verification, and owner-scoped D1 member context; failures are non-enumerating 404s | **Preserve** | Shared gate for all member workspace routes |
| Conversation persistence | `member_chat_conversations` and `member_chat_messages` are server-side, owner-scoped, ordered, and archive-only | **Preserve** | History survives logout and reauthentication |
| Conversation list/read | Member API lists 25 active conversations and reads an owned conversation | **Adapt** | Cursor pagination, stable route selection, and client cache reconciliation |
| New conversation | `POST /beta/api/chat` creates a conversation, runs RAG, stores the sourced answer, and returns the conversation | **Adapt** | Use an idempotency key and route to the new canonical conversation URL |
| Continue conversation | Operator chat supports a conversation POST; member chat has no equivalent | **Build** | Owner-scoped `POST /beta/api/chat/:conversationId` appends user and assistant turns |
| Session navigator | Operator `ChatSessionNavigator` already supplies sticky layout, new/all actions, active state, pagination, and loading/error/empty states | **Adapt, do not copy blindly** | Extract audience-neutral navigator primitives and use member routes/copy |
| Conversation workspace | Operator `ChatWorkspace` and public `ConversationThread`, `AskComposer`, and `SourcePanel` contain proven conversation/composer/source patterns | **Compose** | Member-specific workspace with safe member API adapter and current WTF OS tokens |
| Explicit memory data | `member_saved_memories` and member API list/create/archive are owner-scoped; up to eight active entries feed chat context | **Preserve** | Server persistence remains independent from conversation history |
| Memory UI | Current member home card and operator `MemoryGovernancePanel` expose useful states but have the wrong placement/audience | **Adapt** | A member Settings ledger with save, archive, empty/error/loading, and import review |
| Preference import | No existing member workflow | **Build narrowly** | Copy prompt, paste result, review/edit/select candidates, then explicit save |
| App shell | `AppShell`, `AppRail`, theme control, WTF OS wordmark, semantic tokens, and responsive disclosure are live | **Preserve and extend** | Member route registry and collision-free desktop/mobile layout |
| Member navigation | `MemberBetaShell` currently links Ask, Sessions, and Memory to anchors on one page | **Replace** | Route-backed Ask WTF and Settings; conversation list belongs to the chat rail |
| Operator Settings | Eight nested `/beta/ops/settings/*` workspaces have operator RBAC | **Preserve and isolate** | Never reuse their route registry or governance actions for normal members |
| Member Settings | No route or policy contract exists | **Build** | Profile/account overview, memory/preferences, sessions/privacy, and appearance |
| Public Alpha | `wtfhq.in` public room, episodes, connections, and anonymous Ask WTF remain separate | **Preserve** | Clearly labelled public exits; no member state crosses the boundary |
| Phase 2 UI contract | Defines operator rail, responsive drawer, active-only navigation, useful recovery, and labelled public exits | **Reuse principles only** | Write a member-specific addendum; do not treat operator IA/RBAC as member authority |

## What is already working

- The staging web and edge pair are distinct from production and use the same
  Clerk development instance.
- A verified ordinary user can resolve a private member context and load member
  chat and memory APIs.
- An active D1 operator is excluded from member self-provisioning and is routed
  to the operator workspace.
- Conversation and memory records bind `member_id` in their SQL reads and
  writes. Unknown and cross-member identifiers fail through the same
  non-enumerating response.
- Conversation and memory data already persist on the server across browser
  sessions. The current visual history card is not the persistence mechanism.
- Public Alpha and production remain separate from the staging member lane.

## Actual gap ledger

| ID | Gap | Evidence in current source | Required outcome |
|---|---|---|---|
| G1 | No member conversation continuation | Member router accepts POST only at `/beta/api/chat`; it has GET-only handling for `/beta/api/chat/:id` | Add owner-scoped, idempotent continuation and return the updated conversation |
| G2 | No history pagination | `listMemberConversations` hard-limits 25 and always returns `nextCursor: null` | Add opaque cursor pagination and preserve owner filtering on every page |
| G3 | No durable route selection | Current selected conversation exists only in component state | Canonical `/beta/chat/:conversationId`; reload, back/forward, and shared internal links restore selection |
| G4 | Single global busy state | Ask, open, archive, and memory actions share `isSubmitting` | Isolate request state so one chat cannot receive another chat's response or block unrelated navigation |
| G5 | Home mixes four jobs | Welcome, new chat, active chat, history, and memory share one long page | One focused Ask WTF workspace with persistent session rail and conversation thread |
| G6 | Member Settings absent | Only operator Settings routes and a member home memory card exist | Add a separate, non-admin member Settings tree and route contract |
| G7 | Memory import absent | Member memory supports direct create/archive only | Add local review workflow; explicit saves use existing memory API |
| G8 | Safe personalization absent | Member context returns no display name; current heading is static | Use Clerk `useUser()` for presentation-only `firstName/fullName`, with neutral fallback; do not add provider metadata to Edge context in this slice |
| G9 | Internal language leaks | Current side panel says `verified by Clerk`, `this member only`, and `approved catalogue` | Replace with member benefits and move operational truth to logs/tests |
| G10 | Member navigation is anchor-based | Member shell links `/beta#history` and `/beta#memory` | Introduce a member navigation registry with real routes and a grouped Alpha/Beta disclosure |
| G11 | Member UI contract missing | Phase 2 UI spec is explicitly operator-bound | Add a member Beta UI addendum before component implementation |
| G12 | Live multi-persona acceptance incomplete | Existing auth plan still requires super-admin plus two ordinary accounts | Execute the unchanged isolation and reauthentication matrix after staging deployment |

## Target information architecture

```text
/beta
└── Ask WTF workspace
    ├── persistent conversation rail
    │   ├── new chat
    │   ├── active conversations
    │   └── load more
    └── active conversation surface
        ├── personalized welcome or conversation title
        ├── source-backed thread
        ├── sticky composer
        └── archive action

/beta/chat/[conversationId]
└── same shell with URL-selected conversation

/beta/settings
├── account overview
├── /memory       explicit memories and preference import
├── /sessions     privacy, persistence, and archive explanation
└── /appearance   theme and display preferences

/beta/ops/*
└── D1-authorized operator/admin workspace, unchanged
```

### Navigation contract

- Desktop: a 240px persistent conversation rail inside the Ask WTF workspace.
  It is for conversations, not for global product destinations.
- Mobile/tablet: the conversation rail becomes a labelled, focus-managed
  drawer; the composer and currently selected thread remain primary.
- Bottom pill: only active member product destinations. Initial set is
  `ask wtf` and `settings`. Do not place every conversation or utility action
  in the pill.
- Hamburger disclosure:
  - **Beta workspace:** Ask WTF, Settings, appearance, sign out.
  - **Public Alpha:** room, episodes, connections, anonymous Ask WTF.
  - Render only active, reachable destinations. Do not show operator/admin
    routes or disabled future modules to a member.
- Crossing to Public Alpha is an explicit exit. It does not sign the member out
  unless the user chooses sign out, and it never merges anonymous Alpha chat
  with member history.

## Member-facing copy contract

### Personalized heading

- Preferred: `Welcome back, {firstName}`.
- If the provider has only a full name: use the first safe display segment.
- Fallback: `Welcome to your workspace`.
- Never render email, Clerk subject, member ID, role, issuer, D1 state, or raw
  claims as the main heading.

### Replacement for the current workspace contract

Use a small `Your workspace` guide:

- **Source-backed answers** — See the evidence behind each response.
- **Private history** — Return to your conversations from any signed-in session.
- **Your preferences** — Only the notes you choose to save shape future chats.

### State copy

- Loading explains what is being fetched without naming infrastructure.
- Empty history invites the first question and does not imply data loss.
- Access denial distinguishes signed-out, unavailable, and membership lifecycle
  states without revealing whether an email, account, or record exists.
- Failed turns stay in the selected conversation with a retry affordance; they
  never silently create another conversation.

## Member Settings contract

### Account overview

- Present safe Clerk profile display data client-side and the active Beta
  workspace label.
- Initial delivery is read-only. Editing provider identity or email is out of
  scope until its Clerk mutation/reverification policy is separately approved.

### Memory and preferences

- List active explicit memories from the existing member memory API.
- Preserve archive-only semantics and the 2,000-character bound.
- Explain separately:
  - conversation history is the saved transcript of each chat;
  - memory is a short preference/context note the member explicitly elects to
    reuse in future chats.
- Provide a copyable prompt that asks an external assistant to summarize the
  user's preferences, communication style, recurring context, and explicit
  exclusions as short candidate notes.
- The member may paste the response into a local review surface. Parse only for
  presentation; show candidates individually with edit/select controls.
- Saving requires an explicit action per selected candidate and uses the
  existing owner-scoped memory endpoint.
- Do not connect to, scrape, or claim access to ChatGPT, a Work project, or any
  third-party conversation in this slice. Do not auto-save generated content.

### Sessions and privacy

- Explain server persistence, archive behavior, and Public Alpha separation in
  plain language.
- Show no operator audit, release, provider, roster, or RBAC controls.
- Restoring archived sessions is a deferred product decision; do not imply that
  archive is deletion or implement destructive deletion.

### Appearance

- Reuse the existing theme control and semantic token system.
- Persist only the existing display preference mechanism; do not introduce a
  second settings store in this slice.

## API and data changes

### Continue an owned conversation

Add `POST /beta/api/chat/:conversationId` with this contract:

- requires the existing member gate;
- validates an `idempotency-key` header and the bounded question/source mode;
- confirms the conversation is active and owned by the resolved `member_id`;
- appends the user turn with the next sequence;
- runs RAG with the same bounded explicit-memory context;
- appends the assistant turn and metadata;
- returns the updated conversation view;
- returns the same non-enumerating denial for unknown, archived, and
  cross-member identifiers.

Prefer a DAL operation that records the user turn idempotently before running
the model and prevents duplicate turns on retry. Do not let a late response
append to a different conversation selected in the browser.

### Paginate member history

- Replace the fixed 25-row terminal list with an opaque `(updated_at, id)`
  cursor.
- Bind `member_id` and `lifecycle_state = 'active'` on every query.
- Return `nextCursor` only when another owned row exists.
- Keep content bodies out of the list payload; load messages only for the
  selected conversation.

### Personalization

Use Clerk's client `useUser()` display fields only for presentation in this
slice. Keep the Edge member context DTO unchanged so no new identity attributes
or provider details are exposed through `/beta/api/context`. If a future
server-rendered greeting is required, design a separate allowlisted profile DTO
and privacy test before changing the Edge response.

### Schema impact

No migration is expected for the first implementation: the existing
conversation/message tables already contain sequence and idempotency columns,
and memory already has the required lifecycle fields. If code inspection or a
red test proves otherwise, stop and produce a migration plan rather than
silently altering staging D1.

## Proposed source structure

The names below are a handoff map, not a requirement to duplicate an existing
abstraction. Confirm current ownership before creating a file.

```text
web/app/beta/layout.tsx                         shared member gate and shell
web/app/beta/page.tsx                           new/most-recent Ask WTF entry
web/app/beta/chat/[conversationId]/page.tsx     deep-linked conversation
web/app/beta/settings/page.tsx                  member settings directory
web/app/beta/settings/memory/page.tsx           explicit memory and import review
web/app/beta/settings/sessions/page.tsx         member history/privacy policy
web/app/beta/settings/appearance/page.tsx       display preferences
web/components/domain/member/
  MemberWorkspaceShell.tsx
  MemberSessionNavigator.tsx
  MemberChatWorkspace.tsx
  MemberSettingsNavigation.tsx
  MemoryPreferencesPanel.tsx
  PreferenceImportPrompt.tsx
web/lib/member/
  navigation.ts
  chat.ts
  memory.ts
cloudflare/src/chat/member-history.ts
cloudflare/src/member-router.ts
```

Do not make the Next layout itself responsible for Edge authorization unless
the route architecture supports that without duplicating client auth. A shared
client gate/provider may be the smaller change. Preserve the operator-first
redirect before mounting member-private data.

## Execution waves

### Wave 0 — mapping lock and member UI addendum

1. Re-read this plan, the current handoff, the open-enrollment auth plan, and
   the live source commit.
2. Add a member-specific UI addendum covering navigation, responsive session
   rail, copy, settings, keyboard/focus behavior, and loading/error/empty states.
3. Turn G1–G12 into red unit, Edge, route-contract, and browser assertions.
4. Stop if current source or live staging no longer matches the mapped baseline.

**Exit:** every target component is marked reuse/adapt/build and every gap has a
named test. No feature code starts while mapping remains ambiguous.

### Wave 1 — route and shell foundation

1. Introduce one member navigation registry separate from public and operator
   navigation.
2. Create shared member gate/shell composition without changing the current
   Clerk-to-D1 authority path.
3. Add route-backed Ask WTF and Settings destinations.
4. Add safe client-side personalized welcome and member-benefit copy.
5. Remove anchor-based history/memory navigation only after replacement routes
   are reachable.

**Exit:** members cannot discover operator settings; Public Alpha exits are
explicit; unauthenticated and unavailable states remain non-enumerating.

### Wave 2 — member continuation and pagination

1. Add DAL tests for owned continuation, idempotent retry, archived denial,
   sequence ordering, and cross-member denial.
2. Implement the continuation DAL and router contract.
3. Add cursor pagination with stable ordering and owner filtering.
4. Add a typed member chat client/parser rather than decoding ad hoc in pages.

**Exit:** API tests prove create, continue, list, paginate, read, and archive for
Member A while Member B receives the same denial as an unknown identifier.

### Wave 3 — native chat workspace

1. Extract the useful interaction pattern from the operator navigator while
   removing operator endpoints, copy, policy, and owner labels.
2. Compose the member thread from existing conversation, composer, and source
   components where their contracts fit.
3. Make `/beta/chat/:id` the selected state and support back/forward/reload.
4. Isolate in-flight state per conversation; cancel or ignore stale responses
   when switching.
5. Reserve layout insets so the session drawer, bottom pill, and sticky composer
   never overlap at the reviewed 710px height or at 320px width.

**Exit:** new chat, switch, continue, archive, pagination, refresh, and logout/
login persistence work without re-running the auth flow between chats.

### Wave 4 — member Settings and explicit memory

1. Add the member Settings directory and separate route registry.
2. Move memory list/create/archive out of the Ask WTF home workspace.
3. Add account, sessions/privacy, memory/preferences, and appearance pages.
4. Add the copyable external preference prompt and local candidate review.
5. Require explicit confirmation for every memory write; preserve archive-only
   behavior and the existing model-context bound.

**Exit:** memory and history are visibly different concepts; no candidate is
persisted before a deliberate save; normal members can reach Settings and no
operator control appears.

### Wave 5 — navigation, responsive, and content polish

1. Group active Beta destinations and labelled Public Alpha exits in the
   hamburger disclosure.
2. Confirm bottom pill scope, active states, keyboard navigation, focus return,
   Escape behavior, reduced motion, and touch targets.
3. Remove all implementation-facing copy from member screens.
4. Test desktop sticky rail and mobile session drawer with long titles, empty
   history, errors, and more than one history page.

**Exit:** the member workspace reads as a product, not an infrastructure status
page, while truthful recovery boundaries remain intact.

### Wave 6 — staging acceptance

1. Run deterministic Edge, web unit, contract, typecheck, lint, build, privacy,
   architecture, and diff checks.
2. Deploy only the reviewed web and Edge commits to the named staging pair.
3. Execute the existing auth plan unchanged:
   - super-admin enters `/beta` and is routed to `/beta/ops` without a member row;
   - Member A creates and continues two sessions, saves/archives memory, logs
     out, logs in, and regains the same history;
   - Member B receives a distinct account and cannot enumerate Member A data.
4. Read back only identity-binding/lifecycle metadata and owner-scoped counts;
   do not inspect private message or memory bodies.
5. Confirm `wtfhq.in`, Public Alpha routes, production Workers, and production
   D1 were untouched.

**Exit:** source, CI, staging deployment, live browser behavior, D1 metadata,
and human visual approval are recorded separately. A successful build or 200
response alone is not Beta acceptance.

## Verification matrix

### Edge and data

- Member context remains non-enumerating for unsigned, suspended, revoked,
  archived-target, unknown-target, and cross-member requests.
- Continuation validates idempotency and preserves user/assistant sequence.
- Conversation pages contain only active rows owned by the resolved member.
- Memory list/create/archive remains owner-scoped and explicit-only.
- Operator context still wins before member self-provisioning.

### Web and route contracts

- Member registry contains no `/beta/ops` destinations.
- Member Settings registry contains no release, access, users, AI provider,
  analytics, source health, audit, or roster routes.
- Personalized heading uses safe display data and the neutral fallback.
- Conversation route parsing rejects malformed IDs without leaking existence.
- Switching conversations cannot attach an answer to the wrong selected route.
- Memory import parsing does not call the save endpoint until confirmation.

### Browser / IAB

- Desktop session rail stays present while conversations switch.
- Mobile session drawer traps focus, closes on Escape, and restores focus.
- Selected conversation survives reload and browser back/forward navigation.
- History returns after logout/login for the same ordinary member.
- Memory is absent from Ask WTF home and available under member Settings.
- The side guide contains no Clerk, D1, member ID, role, RBAC, issuer, or
  internal policy language.
- Hamburger groups Beta workspace and Public Alpha destinations.
- Fixed navigation and sticky composer do not overlap at 320px width, 710px
  viewport height, or the reviewed desktop width.

### Live persona matrix

| Persona | `/beta` result | Private data result | Admin result |
|---|---|---|---|
| Signed out | Sign-in/recovery boundary | Nothing shown | Nothing shown |
| Ordinary Member A | Member Ask WTF workspace | Only A sessions/memory | No operator navigation or API authority |
| Ordinary Member B | Member Ask WTF workspace | Only B sessions/memory | No operator navigation or API authority |
| Active super-admin | Redirect to `/beta/ops` | No member row created as side effect | Existing D1-authorized workspace |
| Suspended/revoked member | Non-enumerating denial | Nothing shown | Nothing shown |

## Stop conditions

- Stop if any implementation proposes deleting a Worker, D1 row, conversation,
  memory, branch, or current staging deployment as a shortcut.
- Stop if the active source is not `codex/beta-e2e-acceptance` or its reviewed
  successor rooted at the current Beta source.
- Stop if a route or navigation registry would expose operator settings or
  admin affordances to a normal member.
- Stop if personalization requires adding unreviewed Clerk claims, email, role,
  or internal identifiers to the member context response.
- Stop if a preference import would automatically ingest third-party data or
  save generated candidates without explicit review.
- Stop if a proposed command could target production or `wtfhq.in` without a
  separate, current owner authorization.
- Stop if staging acceptance requires reading private prompt, answer, or memory
  bodies from D1. Use counts and lifecycle metadata instead.

## Deferred decisions

- Restore/unarchive behavior for member conversations and memories.
- Member data export and account deletion.
- Editable Clerk profile fields and email reverification.
- Automatic title generation, renaming, folders, search, and pinning.
- Streaming member answers if the current Edge response remains non-streaming.
- External ChatGPT/Work integrations; this plan permits only a copy/paste prompt
  and explicit local review.

## Fresh-session handoff

Use this exact bounded objective:

> Resume the WTFMedia member Beta remediation from
> `.planning/inputs/2026-09-11-member-beta-workspace-routing-remediation-plan.md`
> in an isolated worktree rooted at the current reviewed Beta branch. Begin with
> Wave 0: verify the preserve/adapt/build map against current source and staging,
> write the member UI addendum, and turn gaps G1–G12 into red tests. Do not
> redesign or replace working Clerk, D1 membership, owner-scoped chat/memory,
> operator routing, AppShell tokens, or Public Alpha. Implement waves in order,
> keep normal-member Settings separate from operator Settings, and do not deploy
> until source verification and review pass. Production, `wtfhq.in`, DNS,
> production D1, Clerk policy, and Cloudflare resource deletion are out of scope.

### First-session checklist

1. Read `README.md`, `PROJECT.md`, `.project/HANDOFF.md`,
   `docs/AGENT-ONBOARDING.md`, this plan, the open-enrollment auth plan, and the
   Phase 2 UI spec.
2. Confirm branch, worktree, dirty state, PR head, and live staging deployment
   before editing.
3. Verify G1–G12 against current source; update the map if any gap has already
   been closed by a newer commit.
4. Produce the member UI addendum and red test inventory.
5. Implement Wave 1 only after the mapping lock is internally consistent.
6. Record reviewed progress in `.project/HANDOFF.md`; keep source, merged,
   deployed, live, and human-approved states separate.
