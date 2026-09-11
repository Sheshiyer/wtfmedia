---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: active
stopped_at: Candidate 32ec582 deployed to Beta staging; shared signed-in UI regression closed, full personas corpus operator delete rollback and production promotion remain gated
last_updated: "2026-09-11T21:18:00+05:30"
last_activity: 2026-09-11
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 35
  completed_plans: 35
  authorized_plan_cohort_percent: 100
  roadmap_items_total: 43
  roadmap_items_complete: 36
  roadmap_percent: 84
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-08-20)

**Core value:** An operator can move from any episode, question, or decision to
its source asset, exact evidence, current owner, workflow state, and next action
without losing provenance.

**Current focus:** Beta 0.1 is a separately tracked authenticated release lane,
not completion of the broader v1.0 roadmap. Exact web-staging candidate
`32ec582` builds on `abb5413`: current work remains authoritative for
UI/routes/Clerk/RBAC/admin/Settings, while Pavun57 leads
chat/inference/retrieval/accuracy/backend behavior.
The user-reported `3eebf57` object is unavailable here. Alpha's actual Ask WTF
UI, interaction, inference, retrieval, and navigation remain the product
bedrock; authentication, private conversations, history, explicit memory,
scoped Settings, and role routing are modular Beta additions. The release
authority is `.planning/inputs/2026-09-11-beta-0.1-production-readiness-checklist.md`.
The assigned client-facing environment names are `beta-staging.wtfhq.in` for
real staging acceptance and `beta.wtfhq.in` for the production-Beta handoff;
the staging hostname is now live with web candidate `32ec582` bound to the
unchanged staging edge version. Production Beta remains planning-only. Real authenticated IAB
personas and rollback are still required before staging acceptance. The
source-lineage correction is
`.planning/inputs/2026-09-11-beta-0.3-lineage-and-surface-authority-audit.md`:
the semantic tags, `release/beta`, `beta_0.1`, Pavun57 RAG branch, local merge,
and deployed staging candidate are distinct objects and must not be called one
"latest Beta" branch.

## Beta 0.1 local integration and release-readiness checkpoint

- UI/runtime candidate `32ec582d9ab953413710832c62e773eb212c00e1` is
  deployed to `wtfmedia-web-staging` as version
  `b67a0833-3eda-4c53-b6ed-056969200350`, still bound only to
  `wtfmedia-edge-staging` version
  `3b4aa27f-6c62-4077-a432-897f10002039`. Production was not changed.
- The shared Alpha-derived chat presentation now serves both member and
  operator principals through typed owner-store adapters. Live super-admin IAB
  confirms persisted operator history, bounded/clamped cards, no chat/settings
  bottom dock, no ingest destination, the reduced Settings map, and a real
  D1-backed operator roster.
- Principal context is retained across same-session Beta navigation and each
  route is checked locally against the verified capability projection; the
  full-screen workspace-opening card no longer repeats on every page load.
- Source verification at `32ec582`: Edge 380/380, web unit 205/205, contracts
  96/96, typecheck, lint, OpenNext build, privacy 0/399, architecture 623
  inputs, and `git diff --check` all pass.
- Remaining release blockers are the empty staging evidence plane, permanent
  operator Delete (no reviewed server contract), complete persona/viewport
  acceptance, host-only cookie proof, rollback, remote PR/tag topology, and all
  production-Beta gates.

- A fresh remote/tag audit shows `v0.3.3-beta.2` peels to older `main`
  `66f434a` and is not an ancestor of `origin/release/beta` `498c0e0`.
  `origin/beta_0.1` `7ec8298` descends from that Member Beta branch and PR #77
  remains open. Local/staging `abb5413` additionally contains Pavun57's
  `d4e45b4`; local manifests say `0.3.3-beta.3`, but there is no beta.3 tag.
- The current UI precedence statement was too broad. Within `beta_0.1`, the
  accepted Member/Alpha-derived chat components exist, but `cab6773` routes
  operator principals to the older operator `ChatWorkspace`. The super-admin
  IAB therefore exposes already-solved presentation defects. Future work must
  preserve the existing shared/Member presentation and add a typed operator
  data adapter; it must not recreate the chat UI or alter Pavun57 inference.
- Canonical IAB now resolves and authenticates the existing super-admin. It
  proves principal resolution, operator landing, and persistence/reopening of
  owner-scoped `cnv_*` conversations, while also exposing the operator
  presentation mapping regression. The complete persona and viewport matrices
  remain open.
- Grounded inference is not testable on the current isolated staging data
  plane: its catalogue R2, KV catalogue namespace, and Vectorize index each
  report zero usable records. The saved ungrounded conversations prove history
  wiring; the fallback proves truthful no-evidence behavior. Seeding staging
  requires separate approval and must not copy production data down.

- `beta_0.1` remains a source-integration branch label, not a package version,
  tag, staging receipt, production claim, or moving deployment target. The
  host-visible reconstruction is merge `d3b4590`; it does not prove GitHub PR
  state, staging, or production.
- Exact staging candidate `abb5413` passes Edge 380/380, web unit 197/197, web
  contracts 96/96, TypeScript, lint, production/OpenNext build, privacy with
  zero violations across 396 files, architecture freshness across 620 inputs,
  and `git diff --check`.
- Staging D1 migrations `0012`–`0015` are applied after a Time Travel bookmark;
  no migrations remain. Edge version `3b4aa27f-6c62-4077-a432-897f10002039`
  and web version `00cfe1b4-161e-4c86-addf-dd3894085d3d` run the paired staging
  plane. Authoritative DNS, TLS, root-to-`/beta`, signed-out `401`, and
  environment-true health pass. Codex IAB now resolves and admits the existing
  super-admin, but the role-to-chat-presentation fork, empty staging evidence
  plane, remaining personas, viewport matrix, and rollback evidence keep
  acceptance open.
- The integration precedence map is
  `.planning/inputs/2026-09-11-pavun-beta-integration-precedence.md`. Current
  Beta UI, canonical routes, Clerk/auth flow, navigation pill, RBAC, admin, and
  Settings cannot be reverted by a Pavun branch. Pavun57's PR #48/#49 intent
  takes precedence for chat, inference, retrieval/accuracy, and backend chat
  behavior; shared files require symbol-level resolution.
- The earlier user report of local runtime behavior remains historical context,
  not evidence. Independent named-profile receipts now establish the staging
  backup, migrations, bindings, deployment, DNS/TLS, signed-out denial, and
  health state. Authenticated IAB and rollback remain unaccepted; production
  remains untouched.
- Root, web, and edge source manifests now use the unused `0.3.3-beta.3`
  candidate version. Remote `v0.3.3-beta.2` already exists at `66f434a` even
  though its release note says it was source-only and not a tag. The owner must
  reconcile that historical contradiction before publishing `beta.3`; no tag
  may be reused, moved, deleted, or silently reinterpreted by this work.
- GitHub still reports PR #77 open from `beta_0.1` into `release/beta`, while
  PR #48 uses `rag/alpha-answer-accuracy` as its head into `main`. The local
  branch is ahead of its remote; pushing would materially expand
  PR #48 and therefore remains held for an explicit owner topology decision.
- The web Worker owns OpenNext routes plus `ASSETS` and reaches only its paired
  edge Worker. The edge Worker owns Clerk-token verification, D1 RBAC/chat and
  provenance, R2 source objects, Vectorize retrieval, Workers AI, KV state,
  and ingest queue consumption.
- Public Alpha remains `wtfhq.in` on `wtfmedia-web` → `wtfmedia-edge`.
  Staging Beta is assigned `beta-staging.wtfhq.in` on
  `wtfmedia-web-staging` → `wtfmedia-edge-staging`. Production Beta is assigned
  `beta.wtfhq.in` on a dedicated planned `wtfmedia-web-beta` →
  `wtfmedia-edge-beta` pair. The production-Beta edge must declare every
  production binding explicitly and must not register a duplicate ingest
  consumer. `workers.dev` remains diagnostic only.
- Required staging order is backup/recovery inventory, reviewed migrations and
  post-apply readback, exact edge deploy/health/bindings, exact web deploy and
  paired service binding, then the real Clerk/D1 IAB persona and viewport
  matrix. Production remains separately owner-authorized with its own Clerk,
  backup, migration, domain/traffic, smoke, and rollback receipts.
- Provider/YouTube persistence, scheduled jobs, long-context compaction, and
  full Alpha alignment are explicit Beta 0.1 deferrals, not implied delivery.

## Current Beta single-shell authority — local source checkpoint `00e8267`

**Historical source checkpoint only:** this local contract remains useful for
route/RBAC review, but its test counts and pre-merge release posture are
superseded for Beta 0.1 promotion by the local integration evidence and
checklist above.

- `/beta` is the authenticated principal landing. Members resolve to
  `/beta/chat`; operators resolve to `/beta/workspace` for the control room.
  Both admitted principal kinds may open `/beta/chat`, which selects the
  appropriate owner-scoped history view inside the same Beta gate/AppShell.
  The public `/chat` and legacy `/ops` trees remain Alpha surfaces;
  `/beta/ops/*` is middleware redirect compatibility only and renders no
  independent Beta shell.
- The edge is the authorization authority: principal resolution gives any
  operator record precedence over a member record, inactive operators deny,
  and profile mirrors do not grant authority. Browser navigation is projected
  from edge capabilities and its contract imports the edge policy; unknown
  routes fail closed and no Beta `public_link` fallback exists.
- Canonical Beta pages include the shared authenticated
  `/beta/chat[/conversationId]`, nested `/beta/settings/*`, the operator
  control-room `/beta/workspace/*`, `/beta/admin/users`, and
  `/beta/admin/audit`. Settings are capability-scoped for members, operators,
  admins, and super-admins; each page/API still rechecks the edge policy.
- Member and operator persistence remains separate and owner-scoped. Public
  URLs expose only conversation UUIDs with their established prefixes; Clerk
  subjects, hashes, and D1 owner identifiers remain server-side. Session cards
  provide Archive and separately confirmed permanent Delete.
- Legacy operator `cnv_` deep links redirect from public `/chat/*` into the
  protected canonical `/beta/chat/*` route. Browser chat DTOs are projected at
  the server boundary, and admin/super-admin roster authority never grants
  cross-operator private-chat read, archive, or export access.
- AI Route and YouTube Analytics panels are labelled non-persisted local
  previews. They neither configure inference/providers nor claim server writes
  until a separately approved integration exists.
- Local receipts: Cloudflare 267/267; web unit 162/162; web contracts 92/92;
  typecheck, lint, production build, architecture check, and privacy scan with
  zero violations passed. These are source/build receipts only, not staging or
  production runtime evidence.
- Remaining release gate: a named staging deployment/migration receipt and
  real Clerk/D1 Codex IAB matrix for signed-out, two members,
  suspended/revoked, editor, admin, and super-admin personas at desktop and
  mobile. Production is not deployed or changed by this checkpoint.

## Active Member Beta lane — anti-drift authority

- Source branch: isolated `codex/beta-chat-refinement`; source-only checkpoint
  `3e4c887` is local, unpushed, and undeployed. PR #60 is already merged at the
  `origin/release/beta` baseline `498c0e0`.
- Acceptance authorities: `.project/HANDOFF.md`, this state file,
  `02-MEMBER-BETA-UI-ADDENDUM.md`, and Member Beta ISC criteria must agree.
- Visual authority: live Public Alpha at `https://wtfhq.in`, the named Alpha
  release head `origin/release/alpha` at `e86923b`, and the later Alpha
  answer-accuracy line with `887699e` as the accepted composer-placement
  reference. Beta is not descended from that later line, so source ancestry is
  an explicit acceptance gate.
- Direct component lock: ordinary-member empty Ask uses
  `ConversationEmptyState`; its composer uses the live-production compact
  `AskComposer` capsule rather than the expanded source-mode panel.
- Navigation lock: the floating wordmark and hamburger remain global;
  member Ask routes hide the bottom dock like live Alpha `/chat`; Alpha's Ask
  WTF, Episodes, Connections, and theme disclosure remains intact, with member
  account/logout and one Settings gear added as utilities. The rejected
  two-button icon-labelled Ask WTF/Settings bottom substitute is not the
  baseline. Sessions remain in the rail/drawer and nested Settings adds no
  second global header.
- Layout lock: desktop session grids/links are zero-min-width, titles clamp to
  two wrapped lines, and long history scrolls inside a bounded rail without
  crossing the evidence card or compact composer at 1382x887.
- Data lock: Clerk verifies identity, D1 remains authority, private records stay
  owner-scoped, explicit saved memory remains distinct from chat context, and
  operators route separately. Archive retains storage. Permanent Delete is a
  new owner-approved contract requiring an additive migration, confirmation,
  privacy-safe audit semantics, a reviewed detach/tombstone design for the
  current `ON DELETE RESTRICT` saved-memory link, and non-resurrection probes
  that replay both continuation and original create idempotency keys.
- Forbidden fallback: `/beta/preview`, fake member data, browser-only fixtures,
  demo acceptance, or a generic dashboard may not substitute for the real flow.
- Long-session lock: there is no auto-compaction today. The selected API returns
  the full message history while inference receives only the latest eight turns
  within 8,000 characters. Message pagination and versioned, non-evidence
  context checkpoints must be implemented and evaluated before full-session
  memory is claimed.
- Remaining live gate: one editor, one admin, one active super-admin, two
  ordinary members, signed-out, and suspended/revoked states must prove their
  route, screen, action, and server-policy matrices before full Beta acceptance.
- Staging receipt: source commit `5bdbd3e`, web version
  `51cce902-fdde-4327-80f3-758f79d38d30`; authenticated IAB verified real
  create, continue, reload, browser history, and all four member Settings
  destinations. The tested answer abstained truthfully, so sourced-answer
  rendering remains covered by deterministic contracts rather than this probe.
- Owner annotations supersede that version's visual acceptance because its
  session item overlapped the Alpha evidence card and its composer used the
  rejected expanded panel. The underlying authenticated flow evidence remains
  valid; visual acceptance requires the corrected redeploy.
- Corrected staging receipt: source commit `56aad90`, web version
  `e298b69c-d0a0-49a4-b528-5f3914703e0e`. Authenticated 1382x887 IAB now shows
  two clamped session cards wholly inside the rail, the unobscured Alpha
  evidence card, compact one-line composer, and icon-labelled Ask/Settings pill;
  the compact bar also continued a real persisted conversation.
- The 1382x1180 owner review now supersedes the corrected receipt's pill and
  selected-session acceptance. Its auth/continuation evidence remains useful;
  its two-button navigation, dead unavailable canvas, ambiguous archive link,
  and lack of long-session compaction do not pass the new convergence contract.

## Current Position

Phase: 02 (Platform Foundation + Authenticated Policy Boundary) — COMPLETE ✓
Plan cohort: 35 of 35 authorized Phase 1/2 plans
Status: Beta 0.1 source integration is locally present; the 10-phase v1.0
milestone remains active and its release/lifecycle gates are not completed.
Last activity: 2026-09-11 — local Beta 0.1 integration and production-readiness
criteria reconciled; no staging or production action is accepted here.

**Accounting:** the authorized-plan cohort is 35/35 (100%). The broader
roadmap inventory is 36/43 (84%) and the ten-phase milestone is 2/10 phases
complete. Beta 0.1 is a separate source/release lane; neither its local merge
nor the 35/35 cohort marks the broader roadmap complete.

## Phase 1: COMPLETE ✓
## Phase 2: COMPLETE ✓

## Execution Authorization

- **Completed foundation:** Phase 1 and Phase 2 are complete bounded phases.
  Their 35/35 authorized-plan cohort does not authorize the remaining roadmap
  or any Beta staging/production action.

- **Planned / inactive:** Phases 3–10. Implementation requires Phases 1–2
  acceptance plus explicit owner authorization.

- **Completed bounded release exception (owner-approved 2026-08-31):** the
  episode-scoped published/uncut/both Ask WTF retrieval slice, approved 49-item
  uncut activation, Vectorize metadata indexing, and production web/edge
  deployment are complete. This exception does not authorize or complete the
  remaining Phase 3–10 requirements.

## Performance Metrics

**Velocity:**

- Total plans completed: 35
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Compatibility + Component Proof Harness | 23 | 23 | — |
| Phase 02 P01 | 20min | 2 tasks | 9 files |
| Phase 02 P02 | 28min | 2 tasks | 12 files |
| Phase 02 P03 | 17min | 2 tasks | 5 files |
| Phase 02 P04 | 16min | 2 tasks | 8 files |
| Phase 02 P05 | 19min | 2 tasks | 7 files |
| Phase 02 P06 | 18min | 2 tasks | 6 files |
| Phase 02 P07 | 24min | 2 tasks | 18 files |
| Phase 02 P08 | 43min | 2 tasks | 14 files |
| Phase 02 P09 | 31min | 2 tasks | 16 files |
| Phase 02 P10 | 29min | 2 tasks | 14 files |
| Phase 02 P11 | 18min | 2 tasks | 9 files |
| Phase 02 P12 | 15min | 2 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 1 progress: Plan 01-21 (Wave 8) completes the pre-migration freeze — dependency graph (20 nodes) and 12 visual captures at 320/768/1440 hash-bound + owner-approved, binding Plans 01-08 and 01-10 to preserve or restore this exact presentation
- Client Phase 1/2 build scope reconciled: commercial delivery labels now map across repository Phases 2–4 and 5–9; repository Phase 1 remains the unchanged 23-plan prerequisite and migration closure moves to Phase 10
- Phase 2 complete: All 12 plans executed, all 35 threat mitigations verified, staging preflight passed, owner approval bound, read-only production smoke passed, and the bounded Phase 2 requirement cohort reached 100%; this did not complete the broader v1.0 roadmap.

### Decisions

- [Alpha-bedrock convergence 2026-09-11]: Alpha's exact Ask WTF UI,
  interaction, inference, retrieval, source, and navigation implementation is
  the bedrock; Beta adds private/authenticated capabilities modularly. Because
  the branches diverged, convergence starts with an exact capability ledger and
  bounded forward-ports rather than palette matching or wholesale merge.
- [Member lifecycle and long context 2026-09-11]: Archive retains private D1
  records; confirmed permanent Delete is a distinct new migration/API/UI
  contract. There is no auto-compaction today; message pagination and
  non-evidence context checkpoints are required before full-session memory is
  claimed.
- [Member Beta anti-drift 2026-09-11]: Public Alpha is the ordinary-member
  composition and component baseline. Beta must extend the shared Ask WTF empty
  state and composer directly; token-only similarity, welcome dashboards, dark
  member gateways, duplicated settings chrome, and preview fixtures fail.
- ISA remains acceptance authority; GSD remains execution-planning authority.
- Public and operator projections stay separate over shared evidence.
- Phase 1 ships the proof harness, starts with the Episodes proof slice, and visibly migrates every protected public route without changing its contract.
- Phase 2 may show only truthful empty or unavailable operator states until canonical records exist.
- Client-facing phase numbers do not replace repository execution phase numbers.
- Read-only source adapters precede the unified analytics and reporting that consume them.
- Predictive clip suggestions remain a human-owned evaluated shortlist in a separately gated Phase 9.
- The owner approved the exact `@types/node@22.12.0` peer-compatible amendment; no peer-dependency bypass was used.
- GitHub execution tracking is limited to repository Phases 1 and 2; future repository phases remain planned locally and inactive.
- [Phase 02]: Cloudflare Zero Trust Access owns operator authentication and Cloudflare D1 owns operator/audit persistence — Owner clarification supersedes the Clerk decision that the prior session failed to persist
- [Phase 02]: The personal 9d9d Wrangler account may temporarily own Phase 2 Cloudflare resources behind a Cloudflare-controlled operator endpoint — Repository-owned schema, migrations, bindings, policy, and verification remain portable; credentials/account identifiers are not committed; final account migration is separately authorized
- [Phase 02]: Cloudflare Access authenticates normalized email, while authorization requires a matching active D1 operator with an admin or editor role — Missing records, inactive operators, and unknown roles fail closed
- [Phase 02]: Expiry, revocation, and operator deactivation immediately discard protected state and require fresh Access plus D1 validation before recovery — Recovery reveals no protected data and preserves only a validated intended /ops destination
- [Phase 02]: Verified Cloudflare Access is the sole authentication session; no WTF auth cookie; every protected request rechecks the active D1 role; sign-out uses Access logout — The existing unsigned JSON wtf_session draft is superseded and not approved implementation authority
- [Phase 02]: One shared deny-by-default server policy governs all protected surfaces; UI visibility never grants authority — Unknown resource/action/record/field combinations deny and errors reveal no protected details
- [Phase 02]: The single temporary super_admin seat belongs to sheshnarayan.iyer@gmail.com and may move only through an atomic audited handoff — Six visible roster candidates were supplied; application-role mapping remains pending and the screenshot may be incomplete
- [Phase 02]: Visible roster mapping approved: 9d9d owner super_admin; Aditi Raj admin; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia editor — Yash's job title and screenshot completeness remain explicit metadata unknowns
- [Phase 02]: Append-only D1 audit ledger covers authentication, session, protected read/export, operator/role/settings, and super-admin handoff events — Only allowlisted metadata and correlation IDs are stored; tokens, raw queries, prompts, responses, and private payloads are prohibited
- [Phase 02]: Audit retention is 365 days production, 30 days staging, ephemeral local; only super_admin/admin may view or export; exports and purges are audited with no archival — Supersedes the unapproved draft 90-day setting
- [Phase 02]: Local, staging, and production use separate D1 databases, Cloudflare Access applications/policies, secrets, and cache namespaces; production data never moves downward; repository migrations promote forward; previews have no protected backend unless explicitly bound. — Owner-approved Phase 2 isolation boundary.
- [Phase 02]: The first authenticated /ops release is a truthful empty Control Room showing environment, workspace, effective role, authorized navigation, live-derived service status, and one dominant setup action; missing systems use explicit unknown/offline/unavailable/permission-denied states, never fabricated health or misleading zeroes. — Owner-approved initial operator-shell contract.
- [Phase 02]: Production remains blocked until deterministic staging checks prove the full authorization, lifecycle, isolation, audit, environment, accessibility, responsive, rollback, and runbook matrix; the owner approves the evidence packet; the production smoke test is read-only; and every failed or unknown gate blocks release. — Owner-approved Phase 2 release contract.
- [Phase 02]: Plan 02-12 staging preflight executed under exact target parameters, hash-bound owner approval recorded in phase2-approval.json, read-only exact-host production smoke verified against wtfmedia.vercel.app, and Phase 2 closed with full 35/35 threat mitigation.
- [Current inventory 2026-08-29]: Repository Phase 1 is a public compatibility/proof release and is explicitly independent of Cloudflare Zero Trust, Access Applications, Access policies, and D1 operator provisioning. Its acceptance remains local, credential-free, and network-independent; the operator boundary is a later workstream.
- [Current inventory 2026-08-29]: The operator UI, role/seat model, JWT verifier, D1 authorization design, and loopback-only local development context exist in source, but this checkout does not prove a live Access Application, policy, protected hostname, Access issuer/audience/JWKS, environment binding, or real seat assignment. Historical Phase 2 closure language is retained as record, not current runtime proof. See `docs/architecture/architecture.html`.
- [Current release 2026-08-30]: The owner temporarily authorizes an ungated public URL. Anonymous visitors may view WTF OS and list/create/update production-calendar records; anonymous delete, ingestion control, transcript activation, provider configuration, secrets, and release approval remain outside the exception. Cloudflare Access and fine-grained RBAC move to the next release.
- [Cloudflare migration 2026-08-30]: Live evidence resolves three accounts: `9d9d` is the retained read/copy source, repository-bound `wtfmedia` is the target that owns `wtfhq.in`, and `default` is unrelated and untouched. The initial target foundation wave is complete: R2 reconciles at 99 objects / 13,204,194 bytes with all-object hash equality; KV reconciles at 55 keys with value equality and no logged values; Vectorize reconciles at 5,742 unique matching IDs, 1,024 dimensions, and cosine; both queue shells exist; and D1 has migrations `0001`–`0005` applied. Target Workers, queue bindings, the calendar migration, secrets, domain/DNS, final delta, and cutover remain gated. See `.planning/inputs/2026-08-30-9d9d-cloudflare-migration-inventory.md`.
- [Episode-scoped Ask WTF release 2026-08-31]: Owner-approved production receipt confirms 55/55 published and 49/49 mapped uncut KV memberships, 11,948 Vectorize vectors with `source_mode` and `video_id` indexes, queue backlog 0, DLQ baseline 18, and grounded live `published`, `uncut`, and `both` chat for mapped episodes. Web version `90099f42-13b6-4a4e-8d97-bd93b9f953fa` and edge version `75b96e1f-6fa6-4182-bbdd-99047399de64` are the final deployed versions. This is a bounded production slice, not proof of trusted timeline alignment or synchronized uncut playback.
- [Member Beta staging preview 2026-09-09]: `release/beta` source is deployed to the separate staging web/edge Workers, D1 migrations `0009_saved_memory` and `0010_member_beta` are applied, and the dedicated staging member-release manifest is `preview`. The linked Clerk development instance is restricted-sign-up (invitation required). This is not a production release and does not complete #50–#52: a staging super-admin plus two Bangalore members must still prove invitation, Clerk-to-D1 activation, private history/archive, explicit memory/archive, and cross-member isolation with live receipts.

### Completed bounded release slice

- Episode detail now carries its mapped public YouTube `episodeId` into Ask
  WTF; episode-scoped retrieval filters Vectorize by `video_id` before `topK`
  and post-filters stale/unrelated matches.
- Published citations retain YouTube identity and trusted timestamps. Uncut
  citations retain hash/asset identity and never inherit a YouTube timestamp.
  `both` preserves both source modes in one grounded response.
- The approved 49-item uncut corpus is verified across R2, D1, KV, and
  Vectorize. The release also repaired five oversized vector IDs and replayed
  only those messages; no broader queue reset occurred.
- The first web bundle was rolled back after HTTP 500s. A corrected OpenNext
  bundle passed remote preview before the final production deployment.
- Remaining acceptance is intentionally open: canonical operator provenance
  workspace, ten-episode alignment evaluation, twenty-query editorial search
  evaluation, synchronized uncut playback, and daily YouTube analytics.

### Pending Todos

Phase 1 and Phase 2 are complete. Future roadmap execution:

1. **Beta 0.1 source closure and live gates** — Commit the post-merge runtime
   and release/migration fixes, select and retest one exact SHA, then follow
   the checklist for staging backup/migrations/bindings, real Clerk/D1
   persona/viewports, and separately
   authorized production receipts. The local merge is not a v1.0 phase close.
2. **Client inputs for Phase 3–4** — IP taxonomy, 20-query editorial set, Frame.io/Drive/Zset share rotation. These block Phases 3–4.
3. **Close the remaining Phase 3/4 gates** — The bounded episode-scoped
   production slice is complete. Plan the canonical internal provenance
   workspace, source/version inspection, ten-episode trusted alignment
   evaluation, twenty-query editorial search evaluation, hybrid filters, and
   synchronized playback as separate owner-authorized work.
4. **Broader platform and analytics work** — daily YouTube
   analytics, research, production operations, source adapters, reporting,
   clip intelligence, and migration closure remain planned/inactive. Do not
   infer their completion from the episode release.

### Blockers/Concerns

- Phase 1 (21 requirements) and Phase 2 (15 requirements) are 100% complete and verified.
- YouTube access, the approved episode inventory, and the 49-item uncut mapping
  are resolved for the bounded release slice. Trusted timeline alignment,
  synchronized uncut playback, Hindi behavior, and the editorial query set
  still block full Phase 3/4 acceptance.
- Research inputs and vendor/export/orchestration decisions block Phase 5; calendar, analytics-access, reporting, and clip-trigger decisions block Phases 6–9.
- The current owner decision supersedes the blanket Phase 3 inactivity line
  only for the four named release deliverables: WTF OS UI, published/uncut
  transcript retrieval, persistent production calendar, and settings hygiene.
  Unrelated Phase 3–10 scope remains inactive.
- The episode-scoped web and edge deployments are now complete and verified;
  the final versions and rollback targets are recorded in `.project/HANDOFF.md`.
  DNS, Access/RBAC, secrets, ingest credentials, and unrelated Workers remain
  outside this release and require separate authority.
- The approved corpus receipt is reconciled for 55 published and 49 mapped
  uncut assets. Do not broaden the claim to deferred sheet rows or treat
  episode membership as timeline alignment.
- Trusted timeline alignment and synchronized uncut playback remain blocked on
  authoritative alignment data and the ten-episode evaluation set. Hybrid
  search quality remains blocked on the twenty-query editorial evaluation set.
- Historical Cloudflare Access/RBAC wording is not authority for Beta. The
  current Beta contract is Clerk identity plus edge/D1 principal/RBAC; its
  environment receipts remain release gates.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2+ | External writes, high-risk workflows, and real-time collaboration | Out of v1.0 scope | Milestone definition |
| Beta 0.1 | Provider/YouTube persistence and scheduled jobs | Explicit Beta 0.1 deferral | 2026-09-11 |
| Beta 0.1 | Long-context compaction and full Alpha alignment | Explicit Beta 0.1 deferral | 2026-09-11 |

## Session Continuity

Last session: 2026-09-11
Stopped at: Beta 0.3 lineage and role-to-presentation mapping audited; UI repair intentionally paused.
The host verifies the merge parents but not the reported `3eebf57` object; test
counts are source evidence and reported runtime/D1 activity is unaccepted.
Resume file: `.project/HANDOFF.md`
Resume: Start with the Beta 0.3 lineage audit. If the owner authorizes code,
adapt the existing Member/Alpha-derived chat presentation to typed member and
operator stores instead of repairing the legacy operator UI in isolation.
Separately authorize a provenance-safe staging corpus before grounded-chat
acceptance. Keep production Beta untouched until a fresh owner authorization.
