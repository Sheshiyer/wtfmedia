# Project handoff

## Phase 2 Planning Checkpoint (2026-08-26)

**Status:** EXECUTING — Plans 02-01 through 02-11 complete

**Evidence:**
- The approved `02-UI-SPEC.md` remains the visual and interaction contract at commit `5f5f1ad`.
- The superseded umbrella `02-PLAN.md` was replaced by 12 executable plans (`02-01` through `02-12`) across eight dependency-ordered waves.
- Static validation covers all 15 Phase 2 requirement IDs, all 26 locked context decisions, 24 executable tasks, and 35 uniquely owned threat definitions.
- Plan 02-01 established the immutable 35-threat ledger, empty fail-closed aggregate schema, and privacy-safe command-bound evidence fragments (`f4853e3`, `5be9f74`, `6278dad`).
- `cd web && npm run verify:phase1` passed after the stale completed-state test contract was reconciled (`2c080e0`); no Phase 1 behavior changed.
- Plan 02-02 applied and listed the portable D1 migrations locally with Wrangler 4.95.0; the approved roster, typed audit envelope, and symbolic environment contract are checkpointed (`f49efed`, `ae4d5b6`, `196eec5`, `5fbccee`).
- Plans 02-03 and 02-04 established verified Cloudflare Access + fresh D1 authority, closed policy navigation, and atomic super-admin transfer (`f06105c`, `0306b3a`, `c28c679`).
- Plan 02-05 added action-specific, append-only audit encoding; authorized fixed CSV export; and local/staging/production retention purges using an audited D1 batch (`ea316ef`, `6a4c0c4`). Local Cloudflare tests passed (18/18) and T-02-13 through T-02-15 have persisted passing receipts.
- Plans 02-06 and 02-07 established the edge-to-origin signed-context boundary, request-scoped policy projection, and non-leaking recovery/sign-out lifecycle (`25990ba`, `ae75f5e`).
- Plan 02-08 implemented the protected Control Room, role-projected responsive shell, truthful inactive status, and a recovery route outside the protected layout (`19a9156`, `bee5b28`). Local type checks, 320/768/1440 browser checks, and T-02-22 through T-02-24 passed.
- Plan 02-09 added a D1-backed invitation approval allowlist. Only the active `super_admin` can approve an address; an administrator can consume a pending approval to activate the invited `admin` or `editor`, and each action is audited (`774c3ad`, `7da776c`).
- Plan 02-10 added privacy-safe audit-ledger filtering and fixed CSV export. The operator UI exposes only approved DTO fields, while local filter validation rejects unknown inputs (`00ab446`, `6c0b321`).
- Plan 02-11 added the deterministic local Phase 2 verifier, CI gate, staged-evidence gate, and operations runbook. Local verification passed; staging and final release modes intentionally require separately supplied evidence (`7296f63`, `d4909e2`).
- Plan 02-12 now has local fail-closed staging preflight and production-smoke runners. They reject incomplete or ambiguous targets before a receipt is written or request is sent (`bb5d51c`).
- Plan `02-12` is non-autonomous: owner-approved staging evidence and a separately authorized, exact-host, read-only production smoke remain blocking gates.
- No deployment, migration, provider credential change, production write, registry mutation, or cutover occurred.

**Next Action:**
For Plan 02-12, supply the exact staging hostname and the approved target list (Access application/policy, D1 database, Worker route, cache namespace, and required secret names), then approve the resulting staging evidence packet. A later production smoke requires separate exact-host, read-only authorization.

## Phase 1 Completion Checkpoint (2026-08-25)

**Status:** COMPLETE

**Evidence:**
- 23/23 plans executed (T-01-01 through T-01-70 all passed)
- 72/72 threat definitions in final aggregate (`web/tests/security/phase1-threat-results.json`)
- Unqualified `cd web && npm run verify:phase1` exit 0 with all 12 sections green
- Owner approved visual baselines (5 decisions, 2026-08-25)
- Migrated UI variant active (`publicUiVariant()` default = migrated)
- Legacy rollback path retained and tested (38/38 tests pass)
- 17 approved snapshots promoted to `web/tests/visual/public-routes.spec.ts-snapshots/`

**Next Action:**
Run `$gsd-plan-phase 2` to replace the superseded umbrella draft with
executable plans (02-01 onward) using the completed Phase 2 context.

## Phase 2 Prerequisite Decisions (RESOLVED 2026-08-25)

1. **Deployment architecture** — Existing Vercel public application plus the existing Cloudflare edge estate — Resolved
2. **Authentication** — Cloudflare Zero Trust Access — Resolved by owner clarification on 2026-08-25; supersedes the unpersisted Clerk decision
3. **Database** — Cloudflare D1 for operator and audit persistence — Resolved by owner clarification on 2026-08-25
4. **Application roles** — `super_admin` (single transferable ownership seat), `admin` (operational administration), and `editor` (read + limited write) — Resolved
5. **Capability matrix** — Deny-by-default; editor: episodes/connections/chat/analytics read, chat write; no user management — Resolved
6. **Protected operator boundary** — A Cloudflare-controlled operator endpoint will enforce Access and route to the existing Vercel application — Resolved by owner clarification on 2026-08-25
7. **Temporary Cloudflare account authority** — The personal `9d9d` Wrangler account may own Phase 2 Cloudflare resources for now — Resolved by owner clarification on 2026-08-25
8. **Account portability** — Repository-owned schema, migrations, binding names, policy, and verification must remain portable; credentials and numeric account identifiers stay outside source control — Required Phase 2 constraint
9. **Final account migration** — Port the Cloudflare resources from `9d9d` to the final owner account later — Deferred to a separate owner-approved migration task
10. **Identity-to-operator mapping** — Cloudflare Access authenticates the normalized email; D1 must contain a matching active operator with a recognized `super_admin`, `admin`, or `editor` role. Missing, inactive, or unknown-role records are denied — Resolved by owner confirmation on 2026-08-25 and extended on 2026-08-26
11. **Expiry, revocation, and deactivation recovery** — Immediately discard protected client state, reveal no protected data in the recovery screen, retain only a validated intended `/ops` destination, and recheck both Access authentication and D1 authorization before restoring access — Resolved by owner confirmation on 2026-08-25
12. **Authoritative session and sign-out** — The verified Cloudflare Access token is the only authentication session; WTF issues no separate authentication cookie. Every protected server request rechecks the active D1 role. Sign-out clears protected client state and proceeds through Cloudflare Access logout — Resolved by owner confirmation on 2026-08-26
13. **Capability enforcement** — One shared deny-by-default server policy governs pages, APIs, queries, exports, record/field projection, errors, and cache boundaries. UI visibility mirrors policy but never grants authority; unknown combinations deny without revealing protected details — Resolved by owner confirmation on 2026-08-26
14. **Bootstrap super administrator** — `sheshnarayan.iyer@gmail.com`, the current personal `9d9d` account owner, holds the single temporary `super_admin` seat. It may be handed off later through an atomic, audited transfer that never leaves zero or multiple active super administrators — Resolved by owner direction on 2026-08-26
15. **Initial visible-roster access mapping** — Aditi Raj is `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia are `editor`; the 9d9d owner email remains `super_admin` — Resolved by owner confirmation on 2026-08-26
16. **Append-only audit policy** — D1 records authentication outcomes, expiry/logout, protected searches/views/exports, operator and role changes, settings changes, and super-admin handoffs using allowlisted metadata plus correlation IDs. Tokens, raw queries, prompts, responses, and private payloads are prohibited — Resolved by owner confirmation on 2026-08-26
17. **Audit retention and visibility** — Production retains audit records for 365 days; staging retains them for 30 days; local audit data is ephemeral. Only `super_admin` and `admin` may view or export records. Every export and automated purge is audited, and expired records are deleted without silent archival — Resolved by owner confirmation on 2026-08-26
18. **Environment and data isolation** — Local, staging, and production use separate D1 databases, Cloudflare Access applications/policies, secrets, and cache namespaces. Production data is never copied to lower environments. Repository-owned migrations promote forward through environments, and preview deployments receive no protected backend unless explicitly bound — Resolved by owner confirmation on 2026-08-26
19. **Truthful initial Control Room shell** — The first authenticated `/ops` release shows the current environment, workspace, effective operator role, authorized navigation, live-derived service status, and one dominant setup action. Missing systems render explicit unknown, offline, unavailable, or permission-denied states; they never fabricate health or substitute misleading zeroes — Resolved by owner confirmation on 2026-08-26
20. **Fail-closed production release gate** — Production remains blocked until staging proves the complete anonymous/expired/inactive/editor/admin/`super_admin` authorization matrix; Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and responsive behavior; and rollback plus runbook rehearsal. Deterministic checks block CI, the owner approves the staging evidence packet, the production smoke test is read-only, and every failed or unknown gate blocks release — Resolved by owner confirmation on 2026-08-26

**Superseded draft warnings:** The untracked `web/lib/auth/session.ts` creates
an unsigned JSON `wtf_session` cookie. The draft D1 schema omits `super_admin`,
accepts unrestricted JSON audit metadata, and hard-codes 90-day retention.
These conflict with Decisions 12, 14, 16, and 17 and are not approved
implementation authority. Executable Phase 2 plans must replace them.

## Phase 2 Owner-Supplied Roster Evidence (2026-08-26)

The owner supplied a cropped messaging screenshot. The table records only the
six visible entries; it does not claim the screenshot contains the complete
team. Job titles remain distinct from application authorization roles.

| Person | Email | Supplied job title | Phase 2 application role |
|---|---|---|---|
| 9d9d account owner | `sheshnarayan.iyer@gmail.com` | Temporary infrastructure owner | `super_admin` |
| Aditi Raj | `aditi@allthingswtf.com` | Production Manager | `admin` |
| Sai Date | `sai@allthingswtf.com` | Senior Designer | `editor` |
| Naisthika Rathod | `naisthika@allthingswtf.com` | Production Associate | `editor` |
| Amal Vinayan | `amal@allthingswtf.com` | Motion designer | `editor` |
| Akash Pandey | `akash@allthingswtf.com` | Post production manager | `editor` |
| Yash Majithia | `yash.majithia@nksqr.com` | Unknown — not visible in supplied screenshot | `editor` |

## Phases 3–10 Status

**Authorization:** Planned / inactive. Phases 3–10 remain planned but inactive until Phases 1–2 are accepted and explicit owner authorization is recorded for the next phase.

## Technical Notes

**Variant selector:** `publicUiVariant()` in `web/lib/public/public-ui-variant.ts`. Default: `migrated`. Legacy rollback: `WTF_PUBLIC_UI_VARIANT=legacy`. Server-only; never serialized to client.

**Performance budgets:** Approved in `web/tests/performance/phase1-budgets.json` (Plan 01-07). 11 metrics. Enforcement: `web/scripts/capture-phase1-performance.mjs --check`. LHCI collection: `npm run test:performance` runs `lhci collect && lhci upload` (no assert phase).

**Visual baselines:** 17 approved snapshots (4 routes × 3 viewports × 4 states). Stability loop in `captureVisual()` ensures deterministic captures. Broken-image alt text handled via CSS `img { color: transparent }` in visual tests.

**Aggregate verifier:** `web/scripts/verify-phase1.mjs` runs 12-section fail-fast sequence. `web/scripts/lib/phase1-threat-results.mjs` validates fragments with correction-ledger tolerance. `web/scripts/merge-phase1-threat-results.mjs` produces final 72-definition aggregate. CI gate: `.github/workflows/phase1.yml` runs `npm run verify:phase1`.

## Checkpoint

- Status: `draft-held`
- Portfolio: `thoughtseed`
- Repository: `wtfmedia`
- Registry WorkObject: `branch:wtfmedia`
- GitHub: `Sheshiyer/wtfmedia`

This packet was drafted by the packet-authoring tool from registry and
repository evidence. It has not been reviewed by a human and is not
committed.

## Completed

- Registry WorkObject matched via `sourceInventory`.
- Packet drafted: all six files present.
- 1 field(s) flagged for review — see `.project/CONTEXT.md`.
- Chat-model fallback repair deployed to Vercel production on 2026-08-11:
  each NVIDIA model must emit a first token within 12 seconds; otherwise the
  route tries Llama 3.3 70B and then Llama 3.1 8B before returning a safe 503.
  `npm run build --prefix web` passed before deployment.
- Live production probe against `https://wtfmedia.vercel.app/api/chat` returned
  HTTP 200, `X-Fallback: true`, and `X-Model: meta/llama-3.1-8b-instruct`,
  confirming that recovery works when the primary does not answer in time.
- Released `wtfmedia-web` v0.0.2 to production on 2026-08-11. The catalogue now
  contains 55 episodes and 1,933 embedding chunks. Both newly synced episode
  IDs are present on `/episodes` and appear in live `/api/chat` source headers.
- Released `wtfmedia-web` v0.0.3 to production on 2026-08-11. Connections now
  rebuild for all 55 episodes using a bounded NVIDIA curation attempt and a
  deterministic fallback when the provider returns malformed output.
- Released `wtfmedia-web` v0.0.4 to `https://wtfmedia.vercel.app` on
  2026-08-11 (deployment `dpl_2uASTwWVVtbTYoFZumYwrMkZVqdW`). Removed the
  unavailable Crew mode and its
  localhost-only route, the simulated online-user count, and the unrelated
  drawing playground. The public UI now presents only the production-backed
  retrieval path and current 55-episode / 1,933-chunk totals.
- Released `wtfmedia-web` v0.0.5 to `https://wtfmedia.vercel.app` on
  2026-08-11 (deployment `dpl_Gefto4o1NstkUdvWBch7k2fBMrXZ`) to prevent
  unsupported corpus-wide people or
  company counts, and ownership/role claims, from being generated from a
  six-excerpt semantic retrieval result. Connections are now described only as
  recurring themes and ideas, not a verified people/company index.
- Deployed the isolated Cloudflare shadow RAG Worker `wtfmedia-edge` on
  2026-08-11. Dedicated account resources are `wtfmedia-catalogue-v1`
  (Vectorize, 1,024-d cosine), `WTFMEDIA_STATE` (KV),
  `wtfmedia-catalogue` (R2), `wtfmedia-ingest` (Queue), and
  `wtfmedia-ingest-dlq` (DLQ). The Worker is not connected to the Vercel UI.
- Verified a two-episode pilot from R2 through Queue, Workers AI, and
  Vectorize. `POST /v1/chat` at the Worker shadow endpoint returned HTTP 200
  with grounded sources for a pilot question. Infrastructure details and
  cutover gates are in `docs/CLOUDFLARE-INFRASTRUCTURE.md`.
- Released `wtfmedia-web` v0.1.0 to production on 2026-08-11 (deployment
  `dpl_B3h7PAkP7d72HZhuV27PX5rattWJ`). The Vercel
  `/api/chat` route now preserves its browser contract while proxying
  server-to-server to `wtfmedia-edge`; no Cloudflare account credential is
  sent to the browser. The full 55-episode corpus has been uploaded to R2 and
  queued for idempotent ingestion; Vectorize throttling was resolved by
  single-consumer queue delivery, eight-vector batches, and bounded backoff.
- Released `wtfmedia-web` v0.1.1 to production on 2026-08-11 (deployment
  `dpl_9rzb7RUSxizn42agcLC7A9nMtYr3`). Added the 55-record provenance manifest,
  restored timestamps for the 43 caption-backed episodes, and added production
  evaluation coverage for citation grounding, ownership abstention, and
  timestamp honesty. Direct Worker chat is now denied without the server-only
  Vercel/Worker shared secret (HTTP 401).
- Released `wtfmedia-web` v0.1.3 to production on 2026-08-11 (deployment
  `dpl_CHR5zYqgFEngizFu8Uy2Nb46kgM1`). Removed automatic starter prompts after
  they conflicted with the grounding policy; the empty state now shows a
  non-submitting, source-answerable example instead.

## Next action

Review this draft packet, resolve any items flagged in the review summary,
commit the six files as a single repository change, and move
`packet_status` to `reviewed-held`. A relocation manifest approval and a
live-apply approval both remain separate, later steps.

Monitor the Cloudflare-backed production route as the full 55-episode queue
drains. Next hardening work is a source/provenance manifest, measured timestamp
coverage, golden RAG evaluations, and WAF/Turnstile plus richer telemetry.

Connections curation is now resilient to malformed or unavailable NVIDIA model
responses. The model remains preferred for canonicalization; the deterministic
fallback keeps the graph current when curation cannot be normalized.

## Verification

```bash
not-applicable
cd video && npm run lint
git status --short
```

No registry, capsule, relocation, session, or Paseo mutation was performed.
The owner-authorized Cloudflare shadow resources and Worker deployment above
are the only external infrastructure mutations in this checkpoint.

## 2026-08-25 Plan 01-18 aggregate + rollback + candidate checkpoint

- Plan 01-18 now has passing threat evidence for T-01-55, T-01-56, and T-01-57.
- Task 1 (rollback rehearsal): Both legacy and migrated variants pass all 19 tests per variant (38 total) across all 4 protected routes; protected data files (episodes.json, connections.json, vectors.json) verified unchanged via SHA-256.
- Task 2 (aggregate verifier + CI): `web/scripts/verify-phase1.mjs` implements a static 12-section fail-fast sequence; `web/scripts/lib/phase1-threat-results.mjs` provides read-only fragment validation with correction-ledger support and legacy fragment tolerance; `.github/workflows/phase1.yml` runs `npm run verify:phase1` on Ubuntu/Node 22 with Playwright Chromium.
- Task 3 (candidate review packet): `web/tests/visual/phase1-candidate.json` assembled with 17 visual candidates across 4 routes, 3 viewports (320/768/1440), and 4 states (default, drawer-open, empty, response); candidate check-merge validates 62 results from 20 completed plans; privacy scan reports 0 violations across 138 files.
- Threat ledger: 72 total definitions, 62 non-exempt, 10 exempted (T-01-55 through T-01-64).
- No commit, deployment, owner visual approval, cutover, external-service mutation, registry change, or provider change occurred. The broader dirty worktree remains preserved.

### Next action

Execute Plan 01-19 (owner visual approval). The candidate packet is ready for owner review at 320/768/1440 viewports. Repository Phase 2 remains gated behind complete Phase 1 acceptance.

## 2026-08-24 Plan 01-17 cross-route proof checkpoint

- Plan 01-17 now has passing threat evidence for T-01-52, T-01-53, and T-01-54.
- The Task 2 correction is bound to the exact historical failure; candidate mode produces 17 persistent, ignored PNG/JSON hash pairs without approving baselines.
- The component trace recomputes the migrated protected-route import graph, verifies exports/story states/layer direction/cycles, and blocks any remaining `TBD` validation mapping.
- Contracts passed 67 tests, privacy scanning reported zero violations across 137 files, lint exited zero, and the component-trace suite passed 3 tests.
- Repository-wide typecheck remains blocked by existing errors in `web/tests/accessibility/public-routes.spec.ts:391` and `web/tests/journeys/chat.spec.ts:365`; Plan 01-18 must own or resolve these before aggregate acceptance.
- No commit, deployment, owner visual approval, cutover, external-service mutation, registry change, or provider change occurred. The broader dirty worktree remains preserved.

## 2026-08-18 PAI / Manifest initialization checkpoint

- Status: bounded local review passed; the repository packet remains
  `draft-held` and no relocation, registry, provider, or deployment authority
  is implied.
- Repository Git identity was restored from the declared `origin/main` history
  without replacing or reverting the existing working tree.
- `ISA.md` now owns acceptance and the active goal; GSD remains the execution
  planning authority under `.planning/`.
- Temperance project, Manifest, and goal receipts were initialized. The live
  bridge is fresh, `active_planner` is `isa`, and project doctor reports zero
  high-severity gaps.
- The current public catalogue is retained as a protected read-only projection
  while the proposed milestone reframes the primary product as an internal,
  evidence-native podcast operating system.
- Private source materials informed bounded requirements synthesis only; raw
  transcripts, embedded source links, and source files were not copied into
  project artifacts.
- Machine-local Manifest and orchestration receipts are ignored. The inherited
  promo task is preserved as historical work but resolves to no executable
  next-wave proposal.
- Independent Cato-style re-audit passed after portability, routing, and goal
  length corrections.
- `DESIGN.md` now records the repository-grounded reference lock, public/internal
  route split, semantic use of the committed palette, typography and motion
  rules, accessible component foundation, current-to-target component map,
  screen contracts, and dependency order for GSD decomposition.
- The design packet added and proved ISC-129 through ISC-134. All 134 ISA IDs
  remain unique; 18 are currently evidenced as complete.
- Live Refero catalogue research was unavailable because the configured
  subscription is inactive. No account was changed; committed WTF brand assets,
  the shipping UI, bundled craft references, and current official component
  documentation form the bounded research set.
- The design audit's route-continuity gap is resolved: `/`, `/episodes`,
  `/connections`, `/chat`, and `/api/chat` are protected compatibility
  contracts, and public/operator connection graphs are separate projections
  over shared evidence. Orange is explicitly a provisional comp-derived token,
  not an addition to the committed `PRODUCT.md` palette.
- The final independent design remediation re-audit passed with no actionable
  blockers; it was read-only and changed no files.

### Next action

Discuss and plan Phase 1, `Compatibility + Component Proof Harness`, against
the approved design packet and roadmap. Phase 2 remains authorized only after
Phase 1 acceptance; Phases 3 through 8 remain planned and inactive. No
implementation, dependency installation, deployment, or external-service change
is authorized by this planning checkpoint.

### Verification

```bash
temperance-project-init --cwd . --check --json
temperance-next-wave --cwd . --json
git check-ignore -v .temperance/project.json .temperance/manifest.json
```

## 2026-08-19 GSD milestone planning checkpoint

- Owner approval finalized `v1.0 One Brain Re-foundation` as an eight-phase
  roadmap in commit `f6654aa`.
- The approved requirements define 70 unique v1.0 IDs across all ten accepted
  families; every ID maps to exactly one phase with zero gaps or duplicates.
- Phase 1 and Phase 2 are the only implementation-authorized phases. Phase 2
  depends on Phase 1 acceptance, and Phases 3 through 8 require a later explicit
  owner authorization gate.
- Phase 1 consumes the approved moodboard, app-flow contract, component
  inventory, and `DESIGN.md`; it must deliver the proof harness plus at least
  one real migrated public component while protecting `/`, `/episodes`,
  `/connections`, `/chat`, and `/api/chat`.
- ISA remains acceptance and goal authority. GSD remains execution-planning
  authority; ISC-10 through ISC-12 are now directly evidenced, bringing ISA
  progress to 18 of 134.
- No Phase 1 code, library installation, deployment, registry mutation,
  provider change, or external integration mutation occurred in this
  checkpoint.
- The superseded 20-second promo plan was preserved under `tasks/archive/` so
  Temperance no longer routes it as active work. The current next-wave proposal
  is bounded to the approved Phase 1–2 roadmap and remains human-approval
  blocked; nothing was dispatched.

### Next action

Run `$gsd-discuss-phase 1` to lock implementation choices and acceptance
evidence before `$gsd-plan-phase 1`.

## 2026-08-19 Phase 1 discussion checkpoint

- Phase 1 discussion is complete across the first proof slice, visual migration
  depth, compatibility policy, and acceptance evidence.
- The first proof slice is `EpisodesBrowser` plus `ScrollRail` and a URL-backed
  accessible public-detail drawer.
- The confirmed Phase 1 boundary visibly redesigns `/`, `/episodes`,
  `/connections`, and `/chat` while preserving their public behavior and the
  complete `/api/chat` contract.
- Compatibility is frozen across URLs, bookmarks, queries, navigation meaning,
  public data semantics, streaming, citations, source fields, headers, statuses,
  and safe errors. `/chat` remains canonical; the public `ModelPicker` is
  removed; `/connections` retains both its graph and an equivalent accessible
  list.
- Acceptance requires one blocking local/CI proof command, reviewed visual
  evidence at 320px, 768px, and 1440px, measured performance budgets, owner
  visual approval, and a documented rollback.
- Canonical context and the audit-only discussion log were committed in
  `08b0ef8`; GSD session state was committed in `2b198a2`.
- The approved Phase 1 roadmap amendment remains applied in the working tree
  and is not included in the discussion-context commits.
- No implementation, dependency installation, deployment, corpus change,
  provider change, registry mutation, or external-service mutation occurred.

### Next action

Run `$gsd-plan-phase 1`. Phase 2 remains queued behind Phase 1 acceptance, and
Phases 3 through 8 remain inactive.

## 2026-08-20 Client Phase 1/2 scope reconciliation checkpoint

- The owner explicitly selected preservation of the 23 committed repository
  Phase 1 plans from `0f80677`; no `01-*-PLAN.md` file was rewritten.
- The client build specification's “Phase 1” and “Phase 2” are now recorded as
  delivery tracks, not aliases for repository phases. Client Phase 1 spans
  repository Phases 2–4 after the proof harness; Client Phase 2 spans Phases
  5–9; migration closure is Phase 10.
- `.planning/REQUIREMENTS.md` now carries 102 unique v1.0 requirements across
  twelve families, including production membership/auditability, both-channel
  and uncut ingestion, segmented transcripts and alignment, hybrid retrieval,
  four-tier cited research, canonical calendar behavior, source adapters,
  automated reporting, cost observability, and evaluated clip intelligence.
- `.planning/ROADMAP.md` records the client acceptance spine, phase-specific
  prerequisites, delivery-track done conditions, and implementation boundary.
  Read-only adapters precede unified analytics; clip intelligence has its own
  human-owned evaluation gate.
- `ISA.md` adds and proves ISC-135 through ISC-140 for delivery-track mapping,
  blocker ownership, requirement coverage, and preservation of Phase 1 plans.
- Repository Phase 1 and Phase 2 remain the only implementation-authorized
  phases. Phases 3–10 remain planned and inactive pending Phases 1–2 acceptance
  and explicit owner authorization.
- No implementation, dependency installation, deployment, domain purchase,
  account change, provider spend, source ingestion, or external-service
  mutation occurred during this reconciliation.

### Next action

Review the reconciled planning diff, then execute the preserved Phase 1 plan
sequence with `$gsd-execute-phase 1` when implementation is explicitly started.
Before planning or executing Phase 2, settle deployment architecture, identity,
team roster, and the capability matrix.

### Verification

```bash
git diff --check -- .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md ISA.md .project/HANDOFF.md
node ~/.codex/get-shit-done/bin/gsd-tools.cjs roadmap analyze
git diff --exit-code 0f80677 -- .planning/phases/01-compatibility-component-proof-harness/01-*-PLAN.md
```

## 2026-08-20 Phase 1/2 execution alignment checkpoint

- Review confirmed that Phase 1 Plans 01-01 and 01-02 are committed and that
  their recorded package and compatibility approvals are internally consistent.
- The owner approved the minimal exact pre-existing pin amendment to
  `@types/node@22.12.0`; Vite 8.2.1 peer resolution completed without
  `--legacy-peer-deps` or an audit remediation.
- Plan 01-03 Task 1 passed its immutable exact-pin and non-watch-script gate.
  The approved Chromium installation completed without approving lifecycle
  scripts. Npm's reported advisories and denied transitive scripts were not
  remediated or approved.
- Plan 01-03 Task 2 failed closed because its immutable probe uses
  `require.resolve("@lhci/cli")`, while the approved package is CLI-only. Do
  not rewrite the preserved plan in place; create and approve a bounded
  correction plan that verifies the executable instead.
- GitHub Project `WTF Media — Phase 1 + 2 Execution` now mirrors only the
  authorized repository Phase 1 and Phase 2 work, their explicit decision
  gates, and the Plan 01-03 correction. Repository Phases 3–10 were not made
  executable on GitHub.
- The newly supplied logo was reviewed as a brand direction reference. Before
  its migrated-shell work begins, an owner-approved repository asset source and
  an explicit reconciliation with the existing wordmark constraint are still
  required; no external asset was copied into the repository.

### Next action

Plan the bounded correction to the Phase 01-03 LHCI probe, then resume Phase 1
from that correction. Phase 2 remains limited to its deployment, identity,
team-roster, capability-matrix, and field-policy readiness decisions.

### Verification

```bash
cd web && npm ls --depth=0
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1
git diff --check
```

## 2026-08-20 Plan 01-03 LHCI correction completion checkpoint

- Owner-approved GitHub issue `#6` is resolved without changing any preserved
  `01-*-PLAN.md` definition or the mirrored validation ledger.
- `web/tests/security/phase1-threat-corrections/01-03-lhci-cli.json` is a
  strictly allowlisted correction record for only `T-01-07` and `T-01-08`. It
  binds each immutable command ID and SHA-256 digest to the exact failed,
  privacy-safe result before recording the approved executable CLI probe.
- `web/scripts/run-phase1-threat.mjs` accepts only that correction file,
  approval reference, two threat IDs, original binding, and replacement command
  digest. Unknown files, IDs, approval drift, command drift, or altered
  superseded evidence fail closed.
- Plan 01-03 Task 2 reran the actual `lhci` executable, recorded passing
  replacement evidence for both threats, and retained the original failed
  evidence inside the correction ledger. Task 1 was rerun and remains passed.
- The twelve approved package pins and the exact `@types/node@22.12.0`
  compatibility amendment remain installed; no lifecycle-script approval,
  peer-dependency bypass, audit remediation, deployment, or client-scope work
  occurred.

### Next action

Execute Plan 01-04 harness configuration only after its owned scope is reviewed.
Phase 2 remains limited to its recorded readiness decisions until Phase 1 is
accepted.

### Verification

```bash
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 2
npm --prefix web ls --depth=0
git diff --check
```

## 2026-08-20 Plan 01-04 privacy-harness correction checkpoint

- The Phase 1 execution record shows that Plan 01-04 Task 2's immutable
  `T-01-09` command invokes `npm run test:privacy -- --check`, while the
  scanner was first assigned to Plan 01-05, which depends on Plan 01-04.
- The owner resumed Phase 1 planning after this evidence. Commit `4d57e30`
  adds the smallest scoped correction: Plan 01-04 now owns the minimal
  offline scanner required by its existing command; Plan 01-05 still extends
  that scanner to the complete public-projection and generated-artifact scope.
- The 23-plan sequence, all immutable threat definitions, and the mirrored
  validation ledger remain intact. No external service, deployment, registry,
  credential, or Phase 2 work was changed.

### Next action

Resume `$gsd-execute-phase 1` at Plan 01-04. The implementation must create
the bounded scanner, rerun the threat runner, and retain only privacy-safe
digest evidence.

### Verification

```bash
git show --check --stat 4d57e30
node web/scripts/run-phase1-threat.mjs --plan 01-04 --task 2
```
