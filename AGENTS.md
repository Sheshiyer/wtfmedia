# Agent operating contract

This repository is `wtfmedia`.

## Continuity checkpoint (2026-09-12)

- Done:
  - Current deployed staging candidate is
    `748c0e4e8d732b5ecdbd3cda572c8bd67f2a32d6`: Edge version
    `67e93676-8519-4e33-8b7b-83b45fa975a8`; unchanged Web version
    `cbc25bba-c2a1-436f-8612-11813dbd3946` retains the accepted UI.
  - Alpha remains the sole corpus, ingest, retrieval, inference, grounding,
    citation, timestamp, and enriched-moment authority. Beta owns Clerk
    identity, D1 admission/RBAC/admin, and owner-scoped sessions/messages/
    history/lifecycle only.
  - Staging health reports `inferenceService=wtfmedia-web` and
    `corpusAuthority=alpha_public_api`; Edge resource bindings are only staging
    D1 plus `WTFMEDIA_ALPHA_WEB -> wtfmedia-web`, with no Beta evidence/ingest
    plane. Version readback still lists a legacy `INGEST_TOKEN` secret, but no
    queue/resource binding or enqueue route can use it; secret removal requires
    a separate owner-approved credential task.
  - Independent QA found prior candidate `5229f99` / Edge `91b2fc7a-f657-4dd1-a66d-4f3c50ad7b21`
    misclassified grouped Alpha markers as ungrounded. The final fix reuses
    Alpha's canonical grouped-citation parser.
  - Live super-admin IAB created and reloaded a new owner-scoped `cnv_*`
    conversation with a grounded answer, rich source sheet, and no abstention/
    fallback label. Desktop 1382x887 and mobile 320x710 have no horizontal
    overflow; admin/users shows the D1 `super_admin` projection. Per-episode
    `N cited` badges count cited excerpts, not editor moment rows.
  - Source checks pass at 387/387 Edge, 220/220 web unit, 96/96 contracts,
    typecheck, lint, 89-page build, privacy 0/400, and 630-input architecture.
  - PR #48 and PR #77 remain untouched. Production Edge
    `ccd1d952-5be7-41c9-9275-f9d6b3b470a7` and Web
    `3d5a5965-14f3-486a-a608-330d539dec81` are unchanged.
- Remaining:
  - Full signed-out/member A/B/suspended/editor/admin/super-admin matrix on desktop
    and mobile in real IAB.
  - Verify 1382x1180 against this exact candidate.
  - Rollback rehearsal and live branch/tag reconciliation (`v0.3.3-beta.2`
    lineage).
  - Operator Archive-versus-Delete asymmetry and exact operator-delete contract.
- State:
  - `/beta/preview` and fixture/fake-browser data are not acceptance evidence.
  - Preserve Alpha actual Ask WTF interaction as the non-regressable bedrock.
  - Remote delivery uses a clean new `codex/*` branch at the exact final docs
    head. Do not update `beta_0.1`/PR #77 until the remaining gates pass; never
    push or force-push PR #48's branch.

1. Read `README.md`, `PROJECT.md`, `.project/HANDOFF.md`, and
   `docs/AGENT-ONBOARDING.md` before starting work.
2. Treat the Thoughtseed Labs vault as referenced knowledge, never as a
   runtime dependency or a place to copy private notes, transcripts, or
   seed corpora.
3. Preserve the existing tooling and deployment boundaries. Use the
   commands declared in `PROJECT.md` and keep generated output ignored.
4. Keep changes scoped to this repository. Do not edit vault registries,
   native client stores, Paseo, OmniRoute configuration, provider
   credentials, or external deployment state without a separate
   owner-approved task.
5. Never add secrets, `.env` material, native session identifiers, prompt
   or response bodies, or machine-local absolute checkout paths.
6. Record a bounded checkpoint in `.project/HANDOFF.md` when a reviewed
   change is ready for another client to pick up.

## Current project facts for agents

- WTF OS and Ask WTF are the product center. Ask WTF must answer from retrieved
  transcript evidence or fall back truthfully; never claim the model cannot
  hallucinate.
- Production domain: `https://wtfhq.in`.
- Production chat contract: browser/web calls `/api/chat` with
  `messages: [{ role, content }]` and `sourceMode` of `published`, `uncut`, or
  `both`. The response body is streamed/plain text; source metadata is exposed
  through `X-Sources` and fallback state through `X-Fallback`.
- Cloudflare target resources are `wtfmedia-edge`, `wtfmedia-web`,
  `wtfmedia-catalogue`, `WTFMEDIA_STATE`, `wtfmedia-catalogue-v1`,
  `wtfmedia-ops`, `wtfmedia-ingest`, and `wtfmedia-ingest-dlq`.
- Current approved corpus receipt: 55 published transcript assets, 49 approved
  mapped uncut text assets, 55/55 published plus 49/49 uncut KV receipts, and
  11,948 Vectorize records indexed by `source_mode` and `video_id`. D1 verifies
  all 49 mapped uncut assets; mapping is not trusted timeline alignment.
- Deferred sheet exceptions stay out of "fully ingested" claims:
  `WTF is a Battery?`, `WEF - Economics`, `The Foundery`, and the
  `Brain Armstrong` transcript-row mismatch.
- The latest ingest hardening requires a declared available D1 source asset and
  backing R2 object before vector staging. If that receipt is missing, fail
  closed as `source_asset_unavailable`.

### Alpha inference / Beta identity boundary

- Alpha is the sole corpus, ingest, retrieval, inference, grounding, citation,
  timestamp, and enriched-moment authority. Beta must not create, seed, copy,
  or operate a second R2/KV/Vectorize/queue evidence plane.
- Beta adds Clerk identity, edge/D1 admission and RBAC, owner-scoped member and
  operator conversations, persisted messages/history, lifecycle controls, and
  capability-scoped administration. It may persist only the validated public
  answer/source/moment projection returned by Alpha.
- The staging Beta edge calls Alpha's existing public `/api/chat` contract
  through the explicitly named `WTFMEDIA_ALPHA_WEB` service binding. It sends
  the bounded conversation needed for chat continuity, never Clerk credentials,
  D1 owner identifiers, saved memory, secrets, or internal transcript text.
- Staging has no chat Vectorize, catalogue R2/KV, ingest producer, or ingest
  consumer resource binding. A legacy `INGEST_TOKEN` secret remains attached
  but inert: `/v1/admin/enqueue` is disabled and no queue or ingest resource is
  bound. Do not use, rotate, or delete it without a separate owner-approved
  credential task. Staging D1 remains private because authentication, user
  scoping, sessions/history, and administration are Beta responsibilities.

## Beta single-shell contract

- `/beta` is the authenticated principal landing: members use `/beta/chat` and
  operators use `/beta/workspace` for the control room. Both admitted
  principal kinds use the same accepted Alpha-derived `/beta/chat`
  presentation through typed adapters for their separate owner-scoped stores;
  never restore the older operator `ChatWorkspace` fork or create a third chat
  UI. Canonical Beta Settings are nested below `/beta/settings/*`;
  administrator routes are `/beta/admin/*`.
- The edge principal and capability policy are the only authorization
  authority. Clerk establishes identity; D1 resolves member/operator lifecycle
  and authority. Any operator record takes precedence, an inactive operator
  denies, and profile mirrors, browser role arrays, or navigation visibility
  never grant access.
- `/beta/ops/*` is redirect compatibility only. Keep `/ops/*` and public
  `/chat` as legacy Alpha routes. Do not add a Beta `public_link` fallback or
  render protected content before edge principal admission.
- Retain one verified principal per Clerk identity/session across Beta route
  navigation and recheck each destination against that projection. Do not
  refetch admission merely because the pathname changes or reintroduce the
  full-screen workspace-opening card on every page.
- Member and operator stores remain separate and owner-scoped. Conversation
  routes may expose only the established prefixed UUID; never put Clerk
  subjects, user hashes, D1 owner identifiers, prompts, answers, or session
  identifiers into URLs, browser DTOs, logs, handoffs, or planning artifacts.
- Archive retains a private conversation. Permanent Delete is separately
  confirmed, owner-scoped, privacy-audited, and must not erase separately saved
  preferences or corpus data. Replayed idempotency keys must not resurrect it.
  Member Delete exists; do not claim or render operator Delete until its
  server-side tombstone/lifecycle contract is reviewed and implemented.
- Capability-projected nested Settings must be matched by server page/API
  enforcement. Beta navigation must not expose Readiness, AI Route, YouTube
  Analytics, RAG & Sources, or duplicate Release Mutation. Their direct
  policy-protected routes may remain for later work. Never add ingest to the
  signed-in Beta navigation. AI Route and YouTube Analytics remain deferred
  until separately approved provider integrations exist.
- The admin roster must come from the authenticated D1-backed edge API through
  the paired web service binding. Never ship prefabricated team rows; last-used
  and chat-session metrics remain future work until server contracts exist.
- Local tests do not replace the real staging matrix. Before claiming Beta
  acceptance, use the Codex in-app browser against an owner-authorized staging
  build for signed-out, two-member, suspended/revoked, editor, admin, and
  super-admin personas at desktop and mobile viewports.
- Before staging or production work, use
  `docs/releases/beta-0.1-cloudflare-promotion-map.md` to distinguish web
  `ASSETS`, catalogue R2 objects, D1 authority, derived Vectorize/KV state,
  queues, outstanding migrations, deployed versions, and traffic evidence.

## Beta 0.1 release-evidence boundary

- The host-visible Beta integration is local merge `d3b4590` with parents
  `d4e45b4` and `7ec8298`. The user-reported `3eebf57` object is unavailable in
  this checkout. Neither identity is a deployment claim.
- Treat local test/build results as `VERIFIED-SOURCE` and unreceipted runtime or
  D1 statements as `REPORTED`. Neither can be upgraded into staging or
  production acceptance by narration, reachability, a branch name, or a moving
  worktree.
- Before any replacement staging deployment, commit the runtime and
  release/migration source fixes, select one exact candidate SHA, rerun its
  source checks, and follow
  `.planning/inputs/2026-09-11-beta-0.1-production-readiness-checklist.md` for
  backup/migration, paired bindings, real Clerk/D1 IAB personas, and viewports.
- Production is a distinct owner-authorized operation: it needs production
  Clerk configuration, D1 backup/migration, exact edge/web/domain/traffic,
  smoke, and rollback receipts for that same candidate. Do not reuse staging
  receipts or reported D1 activity.
- Provider/YouTube persistence, scheduled jobs, long-context compaction, and
  full Alpha alignment remain intentionally deferred from the Beta 0.1 exit
  decision. Keep their status honest and do not add implied persistence or
  automation while closing a release gate.

## Beta environment hostname contract

- `https://wtfhq.in` remains public Alpha/current production on
  `wtfmedia-web` → `wtfmedia-edge` until a separately authorized promotion.
- `https://beta-staging.wtfhq.in` is the assigned staging acceptance hostname.
  Attach it as a Custom Domain only to `wtfmedia-web-staging`, which must bind
  only to `wtfmedia-edge-staging`. The staging edge owns the staging Clerk/D1
  identity plane and has one read-only Alpha web service binding for chat; it
  has no separate corpus or ingest binding.
- `https://beta.wtfhq.in` is the assigned production-Beta/client-handoff
  hostname. It requires a dedicated `wtfmedia-web-beta` →
  `wtfmedia-edge-beta` compute pair, explicit identity/persistence bindings, a
  reviewed Alpha chat bridge, and no duplicate corpus or ingest consumer.
- The web Worker is the public ingress; do not expose the edge Worker as the
  client URL. Environment-specific `workers.dev` URLs are diagnostics only and
  never prove Custom Domain, certificate, binding, revision, or auth identity.
- The root of each Beta hostname must resolve or redirect canonically to
  `/beta`. Keep authentication/session cookies host-only so Alpha, staging,
  and production-Beta sessions cannot mix across `*.wtfhq.in`.
- A hostname is not live because it is written here. Require DNS/Custom Domain
  activation, certificate, exact web/edge versions, service binding, Clerk
  authorized-party/redirect presence, real IAB personas, smoke, and rollback
  receipts before calling the environment ready for client handoff.
- Current deployed staging candidate runtime mapping: source
  `748c0e4e8d732b5ecdbd3cda572c8bd67f2a32d6`, Edge version
  `67e93676-8519-4e33-8b7b-83b45fa975a8`, and unchanged Web version
  `cbc25bba-c2a1-436f-8612-11813dbd3946`. The Alpha-overlay and one
  super-admin grounded IAB path are proven; remaining personas, 1382x1180,
  host-only cookie acceptance, rollback, and tag reconciliation remain gates.
  Production Beta remains untouched.

## Pavun/Beta integration precedence

- "Latest Beta" is a layered source description, never a branch alias. Read
  `.planning/inputs/2026-09-11-beta-0.3-lineage-and-surface-authority-audit.md`
  before changing Beta chat, routing, or release metadata. In particular,
  `v0.3.3-beta.2`, `release/beta`, `beta_0.1`, the Pavun57 RAG branch, and the
  staging candidate are distinct objects.

- The owner's shorthand `pavun` maps to repository submitter `Pavun57`, author of
  PR #48 (`rag/alpha-answer-accuracy`) and PR #49
  (`feat/chat-ui-session-memory`). Treat those as priority inputs only on the
  surfaces named below; do not choose an entire branch wholesale.
- Current Beta convergence work wins for visual/UI composition, AppShell and
  AppRail, the hamburger/navigation pill, root and authenticated landing flow,
  canonical `/beta`/`/ops` routes, Clerk entry/return routing, principal
  admission, RBAC, admin, and scoped Settings. Never revert those surfaces to
  an older UI while integrating Pavun work.
- The canonical Alpha Ask WTF implementation governs chat orchestration,
  inference, retrieval, reranking, grounding/citations, answer accuracy,
  moments, and request budgets. PR #48 remains source-lineage input, not a
  separate Beta inference authority.
- Resolve shared files symbol-by-symbol. Current UI/auth/RBAC symbols win;
  the canonical Alpha chat contract wins for inference and evidence. Existing
  security, provenance, privacy, and data-integrity gates remain mandatory and
  may require a minimal, documented adaptation rather than a blind patch
  application.
- The accepted signed-in chat presentation is shared by member and operator
  principals through typed adapters for their distinct server stores. Preserve
  that presentation and owner/RBAC boundary; do not reintroduce a role-based
  UI fork or start a third chat UI.
- Canonical `/beta/settings` owns Account, Memory, Sessions, and Appearance for
  every principal. Operator release/users/audit are capability-gated additions;
  duplicate workspace memory/session routes only redirect. Memory is immutable
  create/archive preferences, and Sessions may read active plus archived rows.
  Member Delete is tombstone-backed; operator history remains archive-only.
- Git delivery must leave PR #48 and PR #77 untouched while acceptance remains
  incomplete. Publish reviewable work only as a clean new `codex/*` branch at
  the exact final documentation head. After all gates pass, advance PR #77 only
  from the accepted SHA or a separately receipted runtime-equivalent artifact.
  Never force-push or promote a moving branch name instead of an accepted
  hash/artifact.
- Beta has no isolated evidence plane to populate. A persisted `cnv_*` or
  `mcnv_*` turn is grounded only when the validated Alpha response says so;
  Alpha failure or malformed evidence must persist as truthful unavailable or
  ungrounded state. Never copy production corpus data into Beta.
- The canonical decision map is
  `.planning/inputs/2026-09-11-pavun-beta-integration-precedence.md`.

## Boundaries

Merging to `main` does not by itself prove Cloudflare production is running the
same source commit. Verify production separately with Wrangler deployment
receipts and live API probes. Do not deploy, rotate secrets, mutate DNS,
enqueue live ingest, or broaden the corpus unless the user explicitly asks for
that action in the current task.

This packet is active for repository work, but relocation, registry writes,
session migration, provider changes, and production cutovers remain
manifest-gated.

<!-- temperance:project-rail:start -->
## Temperance project rail

This repository is registered with **Temperance Engine** as a project rail.
Host runtime (models, OmniRoute, OpenCode plugins) lives under `~/.temperance_engine`
and `~/.config/opencode`; this repo owns planning and acceptance.

| Concern | Authority |
|---|---|
| Models / failover / budgets | Host OmniRoute + temperance combos |
| Planning spine | `.planning/` (GSD) + `temperance-next-wave` |
| Acceptance | `ISA.md` when present |
| Handoff (if present) | `.project/HANDOFF.md` |
| Parallel execute | `noesis-execute` / `temperance-batch` |

### Auto next-wave

When an agent session starts in this cwd, enrich injects `dispatch: NEXT-WAVE …`.
**Do not wait** for the user to say "temperance dispatch" or "proceed".

```bash
temperance-next-wave --cwd .
temperance-project-init --cwd . --check
temperance-batch --foreground --tasks .planning/next-wave-tasks.json --concurrency 4 --worktree
```

Manifest: `.temperance/project.json` (schema temperance.project.v1)
<!-- temperance:project-rail:end -->
