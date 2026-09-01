# Roadmap: WTF Media — One Brain Re-foundation

## Overview

WTF Media v1.0 moves from a protected public catalogue to an evidence-native
podcast operating system without sacrificing the public product that already
works. Repository phases are dependency-safe execution slices. The client
build specification's “Phase 1” and “Phase 2” remain delivery tracks spanning
multiple repository phases; their numbers are not interchangeable.

The sequence preserves the already-planned compatibility and component proof
harness, establishes a deny-by-default platform and operator boundary, then
adds episode ingestion and provenance, exact-moment retrieval, research briefs,
production scheduling, read-only source adapters, analytics/reporting, clip
intelligence, and migration closure.

## Execution Authorization

- **Implementation-authorized now:** Phase 1 and Phase 2 only. Phase 1 has 23
  committed plans and is ready to execute. Phase 2 remains authorized but
  depends on Phase 1 acceptance and its recorded prerequisite decisions.

- **Planned and inactive:** Phases 3–10. None may enter implementation until
  Phases 1–2 pass their acceptance gates and the owner explicitly authorizes
  the next work.

- **Completed bounded release exception (owner-approved 2026-08-31):** the
  episode-scoped published/uncut/both Ask WTF retrieval slice and its approved
  49-item uncut activation are live and verified. This is evidence for a
  bounded Phase 3/4 slice, not acceptance of the complete phases below.

- Reconciliation of the client specification changes planning scope only. It
  does not authorize dependency installation, implementation, deployment,
  domains, accounts, provider spend, source access, or external-service writes.

- **Additive release-safe planning overlay (owner-authorized locally):** the
  `03-00` entry gate and its audit fleet add sequencing and compatibility
  controls in front of the preserved Phase 3 plans. Existing research,
  requirements, phase plans, and historical receipts remain retained; this
  overlay does not replace or delete them. Phase 3 implementation remains
  inactive until the gate and its owner decisions pass.

## Client Delivery Tracks

| Client track | Repository phases | Acceptance spine |
|---|---|---|
| Client Phase 1 — Podcast Brain | Phase 2 platform/auth + Phase 3 ingestion/provenance + Phase 4 exact-moment search, dual playback, and YouTube performance | Authenticated WTF-only use; every supplied episode visibly indexed; ten reconciled episodes within two seconds; editorial top-three retrieval at least 80% with median below three seconds; both YouTube channels refreshed daily; three editors adopt the tool and discovery drops below two minutes |
| Client Phase 2 — AI agent layer | Phase 5 research briefs + Phase 6 production calendar + Phase 7 source adapters + Phase 8 analytics/reporting + Phase 9 clip intelligence | Cited briefs save meaningful desk-research time; cross-platform reporting is daily and automated; production planning uses the canonical calendar; weekly reporting runs unattended; editorial accepts at least five of ten clip candidates |

The source's Weeks 1–3 and Weeks 3–7 labels are planning estimates, not accepted
delivery promises. Estimation must be rerun after the deployment, identity,
source-access, language, evaluation, and workflow blockers below are resolved.

## Blocking Client Inputs and Decisions

| Input or decision | Owner | Blocks |
|---|---|---|
| Deployment architecture | Existing Vercel public application plus the existing Cloudflare edge estate | WTF | Resolved |
| Protected operator hostname and routing boundary | Cloudflare-controlled operator endpoint enforces Access and routes to the existing Vercel application; public traffic remains unchanged | WTF | Resolved |
| Authentication | Cloudflare Zero Trust Access; owner clarification supersedes the unpersisted Clerk decision | WTF | Resolved |
| Operator and audit persistence | Cloudflare D1 | WTF | Resolved |
| Temporary Cloudflare account authority | Personal `9d9d` Wrangler account may own Phase 2 resources; keep repository artifacts portable and all credentials/account identifiers out of source control | WTF | Resolved for Phase 2; final account migration deferred |
| Identity-to-operator mapping | Access-authenticated normalized email must match an active D1 operator with a recognized `super_admin`, `admin`, or `editor` role; missing, inactive, and unknown-role records fail closed | WTF | Resolved |
| Session recovery behavior | Expiry, revocation, or operator deactivation discards protected client state immediately; recovery reveals no protected data, preserves only a validated intended `/ops` destination, and rechecks Access plus D1 before restoring access | WTF | Resolved |
| Authoritative session and sign-out | Verified Cloudflare Access token is the only authentication session; no WTF authentication cookie; every protected server request rechecks active D1 authorization; sign-out clears protected state and uses Access logout | WTF | Resolved |
| Capability enforcement | One shared deny-by-default server policy governs pages, APIs, queries, exports, record/field projections, safe errors, and cache boundaries; UI visibility never grants authority | WTF | Resolved |
| Bootstrap super administrator | Single temporary `super_admin` seat belongs to the current personal 9d9d account owner and may move only through an atomic audited handoff | WTF | Resolved |
| Team roster and application-role mapping | 9d9d owner email is `super_admin`; Aditi Raj is `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia are `editor`; Yash's supplied job title and screenshot completeness remain unknown metadata | WTF | Resolved for visible-roster seeding |
| Audit event coverage and privacy | Append-only D1 ledger covers authentication outcomes, expiry/logout, protected searches/views/exports, operator/role/settings changes, and super-admin handoffs; only allowlisted metadata and correlation IDs are stored, never tokens, raw queries, prompts, responses, or private payloads | WTF | Resolved |
| Audit retention and visibility | 365 days production, 30 days staging, ephemeral local; only `super_admin` and `admin` may view/export; every export and automated purge is audited; no silent archival | WTF | Resolved |
| Environment and data isolation | Separate D1 databases, Access applications/policies, secrets, and cache namespaces for local, staging, and production; never copy production data downward; promote repository-owned migrations forward; previews have no protected backend unless explicitly bound | WTF | Resolved |
| Truthful initial Control Room shell | First authenticated `/ops` release shows current environment, workspace, effective role, authorized navigation, live-derived service status, and one dominant setup action; missing systems use explicit unknown/offline/unavailable/permission-denied states, never fabricated health or misleading zeroes | WTF | Resolved |
| Phase 2 production release gate | Staging proves the full identity/role matrix, lifecycle, isolation, audit, environment, accessibility, responsive, rollback, and runbook surfaces through deterministic CI; owner approves the evidence packet; production smoke is read-only; failed or unknown gates block release | WTF | Resolved |
| Both-channel YouTube Data/Analytics access, approved episode inventory, IP/language/content-bucket tagging | WTF | Phases 3–4 |
| Uncut assets with authoritative episode mapping and storage/access policy | WTF | Phases 3–4 |
| Hindi source/dubbing/search decision | WTF | Phases 3–4 |
| Twenty-query editorial evaluation set with expected moments | WTF editorial | Phase 4 |
| Research workflow walkthrough, approved offline notes, and sample briefs | WTF research | Phase 5 |
| Sonar tier and monthly ceiling; export target; podcast-corpus scope; Kimi bake-off decision | Nikhai + Shesh + WTF | Phase 5 |
| Current calendar and color convention; native-versus-Google synchronization choice | WTF | Phase 6 |
| Instagram and LinkedIn analytics access | WTF | Phases 7–8 |
| Report delivery channel and recipient list | WTF | Phase 8 |
| Historical Shorts performance data and automatic-versus-editor trigger choice | WTF editorial | Phase 9 |

No dependent plan may guess around an unresolved row. It must either stop at
the prerequisite gate or implement an honest unavailable state.

## Delivered bounded release slice — 2026-08-31

The following production behavior is complete and recorded in the canonical
handoff (`.project/HANDOFF.md`):

- `/episodes/[id]` passes the mapped public YouTube `episodeId` into Ask WTF.
- Episode-scoped Vectorize retrieval filters by `video_id` before `topK` and
  fails closed if returned metadata is stale or unrelated.
- Published citations retain YouTube identity and trusted timestamps; uncut
  citations retain hash/asset identity and never inherit published timestamps.
- `published`, `uncut`, and `both` return grounded mapped-episode answers;
  unmapped episodes remain scoped and report uncut unavailability truthfully.
- Approved corpus receipts are 55/55 published and 49/49 mapped uncut in KV,
  11,948 vectors with `source_mode` and `video_id` indexes, queue backlog 0,
  and DLQ baseline 18.
- The final web and edge deployments, rollback recovery, and PR #32–#35
  receipts are recorded without changing the team-owned UI design, auth,
  DNS, secrets, or unrelated infrastructure.

This slice does not satisfy the complete Phase 3/4 criteria. Trusted uncut
timeline alignment, synchronized uncut playback, the ten-episode alignment
evaluation, the twenty-query editorial search evaluation, hybrid search
filters, and daily YouTube performance observations remain open work.

## Milestone Invariants

- `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` remain protected
  compatibility contracts until an explicitly tested replacement or redirect
  supersedes them.

- Public and operator experiences remain separate projections over shared
  evidence. They do not share authorization policy, serialized DTOs, cache
  namespaces, search projections, safe-error policy, or interaction state.

- The public compatibility, accessibility, visual, privacy, security,
  performance, and rollback gates established in Phase 1 remain blocking exit
  gates for every later phase.

- The uncut transcript is the primary complete-context source when supplied;
  published-video timing is a separate coordinate system. No universal offset
  is assumed and no timestamp is fabricated.

- Generated insight, research claims, metrics, and recommendations resolve to
  sources, reporting windows, owners, evaluation evidence, or explicit unknowns.

- External adapters are read-only first. Consequential writes, NotebookLM
  product integration claims, virality guarantees, and autonomous publishing
  remain outside this roadmap without a separately approved change.

- Missing data remains visibly unknown, unavailable, stale, partial, empty,
  permission-denied, error, offline, unmapped, conflicted, or measured-zero.

## Phases

- [ ] **Phase 1: Compatibility + Component Proof Harness** — Preserve the 23-plan proof harness and visibly migrate every protected public route without changing its contract.
- [ ] **Phase 2: Platform Foundation + Authenticated Policy Boundary** — Establish separated environments, managed access, auditability, observability, and a truthful deny-by-default operator shell.
- [ ] **Phase 3: Episode Ingestion + Provenance Spine** — Idempotently ingest both channels and supplied uncut sources into versioned episode, asset, transcript, and timeline truth.
- [ ] **Phase 4: Podcast Brain Search + Dual Playback** — Deliver evaluated exact-moment retrieval, reconciled YouTube/Uncut playback, and daily YouTube performance.
- [ ] **Phase 5: Cited Research Brief Agent** — Produce editable, versioned four-tier briefs from governed human, corpus, web, and structured sources.
- [ ] **Phase 6: Production Calendar + Control Room** — Make production state, dates, blockers, ownership, and calendar projections canonical and auditable.
- [ ] **Phase 7: Read-only Source Adapters** — Establish approved, observable, idempotent Instagram and LinkedIn analytics adapters before unified reporting.
- [ ] **Phase 8: Cross-platform Analytics + Reporting** — Normalize platform evidence and automate approved weekly, monthly, anomaly, and cost reporting.
- [ ] **Phase 9: Evaluated Clip Intelligence** — Produce human-owned, evidence-linked short-form candidate rankings with feedback and explicit uncertainty.
- [ ] **Phase 10: Migration Closure** — Retire remaining legacy consumers only after replacement, rollback, and milestone-wide proof are accepted.

## Phase Details

### Phase 1: Compatibility + Component Proof Harness

**Goal**: Maintainers can visibly migrate `/`, `/episodes`, `/connections`, and `/chat` through the repository-owned WTF design system while preserving their URLs, meaning, data, navigation, accessibility, and behavior, and while preserving the complete `/api/chat` contract.
**Depends on**: Nothing (first phase)
**Execution authorization**: Authorized now; 23 plans preserved and ready to execute
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05, DSYS-06, DSYS-07, DSYS-08, DSYS-09, DSYS-10, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06
**Success Criteria**:

  1. Every protected public route uses the approved semantic visual and interaction system while retaining its URL, navigation meaning, data semantics, and safe states.
  2. Existing bookmarks, queries, selections, streaming, citations, headers, statuses, errors, and the complete `/api/chat` contract remain compatible.
  3. `/connections` preserves graph/list semantic parity without exposing operator data.
  4. The Episodes proof slice delivers `EpisodesBrowser`, `ScrollRail`, and a URL-backed accessible detail drawer before route-wide migration.
  5. One blocking `npm run verify:phase1` command proves code, behavior, accessibility, privacy, visuals, performance, API/RAG compatibility, and rollback with owner-approved evidence.

**Plans**: 23 plans across 21 waves, unchanged from commit `0f80677`

  - **Wave 1**: `01-01` — Capture and approve the dirty-worktree compatibility baseline.
  - **Wave 2**: `01-02` — Validate and approve package legitimacy.
  - **Wave 3**: `01-03` — Install the exact approved harness dependencies.
  - **Wave 4**: `01-04` — Configure the deterministic proof harness.
  - **Wave 5**: `01-05` — Freeze public-route, API, and privacy contracts.
  - **Wave 6**: `01-06` — Measure legacy performance and propose budgets.
  - **Wave 7**: `01-07` — Approve numeric performance budgets.
  - **Wave 8**: `01-21` — Freeze and approve the legacy presentation boundary.
  - **Wave 9**: `01-08` — Establish semantic tokens and global styles; `01-10` — Add the Episodes rollback seam.
  - **Wave 10**: `01-09` — Build accessible primitives; `01-23` — Add URL state, ScrollRail, and Suspense foundations.
  - **Wave 11**: `01-11` — Integrate the Episodes drawer and proof evidence.
  - **Wave 12**: `01-12` — Establish the shared public shell boundary.
  - **Wave 13**: `01-22` — Add scoped migrated-brand motion and signature effects.
  - **Wave 14**: `01-13` — Add Connections rollback and public-projection safeguards.
  - **Wave 15**: `01-14` — Migrate Connections with graph/list parity.
  - **Wave 16**: `01-15` — Migrate Ask WTF while preserving `/api/chat`.
  - **Wave 17**: `01-16` — Migrate the Home route.
  - **Wave 18**: `01-17` — Prove cross-route accessibility, visuals, and component traceability.
  - **Wave 19**: `01-18` — Assemble aggregate verification, CI, rollback, and candidate evidence.
  - **Wave 20**: `01-19` — Obtain owner visual and cutover approval.
  - **Wave 21**: `01-20` — Promote approved evidence, merge threat results, and complete cutover.

**UI hint**: yes

### Phase 2: Platform Foundation + Authenticated Policy Boundary

**Goal**: Approved WTF operators enter a dependable `/ops` shell through managed identity while server-enforced policy, environment separation, audit logs, observability, and secret boundaries fail closed.
**Depends on**: Phase 1 acceptance plus deployment, identity, team-roster, and capability-matrix decisions
**Execution authorization**: Authorized next; dependent decisions must resolve before implementation
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, QUAL-07, QUAL-09, QUAL-10, QUAL-12, QUAL-13
**Success Criteria**:

  1. WTF-only accounts are invite-controlled, deactivatable, and server-authorized; exactly one transferable `super_admin` seat exists, `admin` and `editor` differ, and later roles remain non-privileged shells.
  2. Anonymous, expired, cross-role, tampered, cache-mixed, and escalated requests reveal no protected entity existence.
  3. Public and operator DTOs, caches, projections, errors, and client state remain separate.
  4. Authentication, protected-use, export, purge, and administrative events are attributable through privacy-minimized audit records with approved environment-specific retention and administrative visibility.
  5. Development, staging, and production boundaries plus migration and runbook contracts are explicit before feature data activates.
  6. The first authenticated Control Room exposes only authorized navigation and observed status, makes environment, workspace, and effective role visible, and represents missing systems explicitly without fabricated health or misleading zeroes.
  7. Production remains blocked until deterministic staging checks prove the approved security, lifecycle, isolation, audit, environment, accessibility, responsive, rollback, and runbook matrix; the owner approves the evidence packet; a read-only production smoke test passes; and no gate is failed or unknown.

**Plans**: 12 executable plans across 8 waves

- **Wave 1**: `02-01` — Establish the Phase 2 evidence and threat harness.
- **Wave 2**: `02-02` — Define portable D1 migrations, bootstrap data, and environment contracts.
- **Wave 3**: `02-03`, `02-04`, `02-05` — Implement Access identity, deny-by-default policy, and typed audit foundations.
- **Wave 4**: `02-06` — Compose the protected edge router, projections, audit, and cache isolation.
- **Wave 5**: `02-07` — Replace the unsigned local-session draft with the server-only DAL and recovery lifecycle.
- **Wave 6**: `02-08`, `02-09`, `02-10` — Build the approved Control Room, Operators, and Audit surfaces.
- **Wave 7**: `02-11` — Assemble aggregate authorization, privacy, accessibility, responsive, rollback, runbook, and CI gates.
- **Wave 8**: `02-12` — Run the non-autonomous staging approval and separately authorized read-only production smoke.

**UI hint**: yes

### Phase 3: Episode Ingestion + Provenance Spine

**Goal**: Operators can trust one canonical episode workspace whose source identities, assets, transcript segments, versions, timeline mappings, citations, ingestion jobs, and activity remain internally consistent.
**Depends on**: Phase 2 acceptance, explicit owner authorization, deployment/storage decision, YouTube access, approved inventory, uncut mapping, and Hindi decision
**Execution authorization**: Planned / inactive
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, PROV-05, PROV-06, PROV-07, PROV-08, PROV-09, PROV-10, PROV-11, PROV-12, PROV-13, INTG-07
**Success Criteria**:

**Bounded slice delivered:** approved published and mapped uncut assets are
queryable with episode-scoped provenance metadata. The complete phase remains
open until the canonical operator workspace, version inspection, and trusted
alignment evidence are accepted.

  1. Both approved YouTube channels and supplied uncut assets ingest idempotently through visible asynchronous jobs.
  2. Episode metadata preserves stable identity, IP, channel, language, guests, content bucket, dates, duration, thumbnail, description, and chapters.
  3. Source-bound transcript segments retain timing, speaker, language, text, version, and asset provenance without private-path disclosure.
  4. Per-episode mapping never assumes a universal offset and resolves ten approved evaluation episodes within two seconds in both directions.
  5. Re-ingestion activates a complete version without mixing obsolete chunks or citations.

**Plans**: `03-00` release-safe integration gate plus the six preserved
`03-01`–`03-06` implementation plans. `03-00` is additive and must pass before
any preserved implementation plan is activated; the six plans remain retained
and are not superseded.
**UI hint**: yes

### Phase 4: Podcast Brain Search + Dual Playback

**Goal**: Editors can describe a remembered moment, receive trustworthy ranked evidence, and open the same reconciled moment in YouTube or the supplied uncut source while inspecting daily YouTube performance.
**Depends on**: Phase 3 acceptance, explicit owner authorization, twenty-query evaluation set, and approved search-language policy
**Execution authorization**: Planned / inactive
**Requirements**: PROV-14, KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, KNOW-06, KNOW-07, KNOW-08, ANLY-06, QUAL-11
**Success Criteria**:

**Bounded slice delivered:** mapped episode-scoped `published`, `uncut`, and
`both` Ask WTF retrieval is live with source-aware citations and truthful
unavailable behavior. The complete phase remains open pending evaluated search,
timeline alignment, synchronized playback, and cached YouTube observations.

  1. Hybrid keyword, exact-phrase, and semantic search supports the approved filters, ten-result pagination, highlighted evidence, and honest low-confidence handling.
  2. At least eighty percent of the twenty editorial queries place the correct moment in the top three; median remains below three seconds and p95 below six.
  3. YouTube and Uncut tabs seek to the same reconciled moment, preserve position across switching, copy source-specific timestamps, and degrade honestly.
  4. Both YouTube channels expose cached daily channel and episode observations without page-load API calls.
  5. Three editors adopt the flow and measured clip discovery falls below two minutes before the client track is accepted.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Cited Research Brief Agent

**Goal**: Researchers can turn a guest, company, or industry into one editable, versioned, cited four-tier brief without tool-hopping or losing human-source priority.
**Depends on**: Phase 4 acceptance, explicit owner authorization, research walkthrough, sample notes/briefs, Sonar tier/ceiling, export target, corpus scope, and orchestration bake-off
**Execution authorization**: Planned / inactive
**Requirements**: KNOW-09, KNOW-10, KNOW-11, KNOW-12, KNOW-13, PEOP-01, PEOP-02
**Success Criteria**:

  1. Entity resolution expands guest to company to industry and asks only necessary disambiguation questions.
  2. Snacks, Appetizers, Main Course, and Desserts tracks run with visible isolated status and retry behavior.
  3. Approved offline notes outrank web synthesis; prior appearances and WTF evidence remain timestamp-citable.
  4. Every factual claim is cited, numeric claims receive a second source, disagreements remain visible, and unsupported claims are dropped or flagged.
  5. Three real briefs save at least half a day of desk research and surface five prior appearances per guest where they exist.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Production Calendar + Control Room

**Goal**: Operators can plan and inspect production from one accountable workflow record whose board, calendar, blockers, ownership, and Control Room summaries never diverge.
**Depends on**: Phase 5 acceptance, explicit owner authorization, current calendar, color convention, and synchronization decision
**Execution authorization**: Planned / inactive
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07, FLOW-08
**Success Criteria**:

  1. Approved stage transitions, owners, blockers, and corrections are canonical and auditable.
  2. Shoot, planned-publish, actual-publish, post, and milestone dates remain distinct.
  3. Month, week, and IP-filtered calendar views project the same episode records as the board.
  4. Every Control Room number deep-links to its authorized contributors.
  5. The team can plan a full month without maintaining a competing sheet before client acceptance.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Read-only Source Adapters

**Goal**: Operators can trust source observations and adapter health because approved Instagram and LinkedIn analytics adapters are read-only, idempotent, provenance-preserving, and safely operable.
**Depends on**: Phase 6 acceptance, explicit owner authorization, and approved platform access
**Execution authorization**: Planned / inactive
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, INTG-06, INTG-08
**Success Criteria**:

  1. Each adapter has approved official API, scopes, limits, stable keys, retention, safe methods, owner, and crafted-write denial.
  2. Normalized observations retain source identity, stable external key, observed time, content hash, and reconciliation state.
  3. Duplicate, timeout, partial, retry, and replay paths do not duplicate canonical records.
  4. Health exposes coverage, attempts, success, failures, retries, owner, and last-known-good state without credentials or raw payloads.

**Plans**: TBD
**UI hint**: yes

### Phase 8: Cross-platform Analytics + Reporting

**Goal**: Operators can compare YouTube, Instagram, and LinkedIn evidence and receive approved automated reporting without confusing absence, synthesis, or correlation with verified fact.
**Depends on**: Phase 7 acceptance, explicit owner authorization, historical reporting policy, delivery channel, recipients, and cost ceiling
**Execution authorization**: Planned / inactive
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, ANLY-07, ANLY-08, ANLY-09, PEOP-03, PEOP-04, PEOP-05
**Success Criteria**:

  1. Every metric names platform, entity, window, timezone, observation, refresh, availability, and last-known-good state.
  2. Unified views filter by IP and content bucket while preserving calculation lineage and measured-zero semantics.
  3. Weekly summaries, monthly rollups, anomaly alerts, and record-break alerts remain in-platform and use only approved delivery channels.
  4. AI consumption reports attribute usage and cost to user, feature, query, and agent run and alert before ceiling breach.
  5. Weekly reporting arrives without manual assembly for three consecutive weeks.

**Plans**: TBD
**UI hint**: yes

### Phase 9: Evaluated Clip Intelligence

**Goal**: Editors receive a trustworthy shortlist of evidence-linked short-form moments whose rankings, uncertainty, and feedback remain human-owned and measurable.
**Depends on**: Phase 8 acceptance, explicit owner authorization, historical Shorts data, labelled evaluation set, and trigger-mode decision
**Execution authorization**: Planned / inactive
**Requirements**: AINT-01, AINT-02, CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05
**Success Criteria**:

  1. Each candidate retains source episode, transcript version, span, topic, guest, duration, hook evidence, rationale, score, and uncertainty.
  2. A newly ingested episode produces ten ranked candidates only through the approved trigger mode.
  3. Editor approval/rejection remains attributable and reusable for evaluation.
  4. Editorial reviewers judge at least five of ten candidates worth cutting on the approved set.
  5. Product copy describes a human-owned shortlist and never promises virality.

**Plans**: TBD
**UI hint**: yes

### Phase 10: Migration Closure

**Goal**: Maintainers can remove legacy public consumers only after the accepted replacement proves full compatibility, quality, privacy, performance, and recoverability.
**Depends on**: Phase 9 and explicit owner authorization
**Execution authorization**: Planned / inactive
**Requirements**: COMP-06, QUAL-08
**Success Criteria**:

  1. Every legacy consumer has accepted contract, browser, accessibility, visual, privacy, security, performance, and inventory evidence before removal.
  2. Protected public routes and `/api/chat` remain available through accepted implementations or tested replacements.
  3. Rollback can restore the previous reader, style, or route until replacement evidence is accepted.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution order:** Phase 1 → Phase 2 → owner authorization gate → Phases 3–10 in numeric order.

| Phase | Plans Complete | Status | Completed |
|---|---:|---|---|
| 1. Compatibility + Component Proof Harness | 23/23 | Complete | ✓ |
| 2. Platform Foundation + Authenticated Policy Boundary | 0/TBD | Authorized / queued after Phase 1 and prerequisite decisions | - |
| 3. Episode Ingestion + Provenance Spine | 0/TBD | Planned / inactive | - |
| 4. Podcast Brain Search + Dual Playback | 0/TBD | Planned / inactive | - |
| 5. Cited Research Brief Agent | 0/TBD | Planned / inactive | - |
| 6. Production Calendar + Control Room | 0/TBD | Planned / inactive | - |
| 7. Read-only Source Adapters | 0/TBD | Planned / inactive | - |
| 8. Cross-platform Analytics + Reporting | 0/TBD | Planned / inactive | - |
| 9. Evaluated Clip Intelligence | 0/TBD | Planned / inactive | - |
| 10. Migration Closure | 0/TBD | Planned / inactive | - |
