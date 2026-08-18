# Project Research Summary

**Project:** WTF Media
**Milestone:** v1.0 One Brain Re-foundation
**Domain:** Evidence-native podcast operating system with a protected public catalogue projection
**Researched:** 2026-08-18
**Confidence:** HIGH overall; MEDIUM for provider-specific, policy-specific, and timeline-alignment choices

## Executive Summary

WTF Media should be re-founded as a modular, evidence-native internal operating system, not expanded as a catalogue with more navigation. The protected public experience remains a read-only projection, while authenticated operators gain a separate `/ops` shell organized around one canonical episode-and-evidence spine. The product's defining loop is **receipts become actions**: an operator can move from an episode, question, or blocker to the exact asset, transcript passage, timeline, owner, workflow state, and next action without losing provenance. The shipping WTF identity—wordmark, cream-and-ink foundation, committed palette, Bricolage Grotesque, Fraunces, Poppins, tactile print depth, and irreverent-but-exact voice—is a milestone invariant.

The recommended approach is incremental and contract-first. Retain Next.js 15 App Router, React 19, strict TypeScript, Tailwind 3, Vercel, and the existing Cloudflare RAG boundary. First freeze public behavior and establish the quality harness; then add the semantic design foundation, deny-by-default operator boundary, and a shadow-mode canonical provenance store. Build one complete operator episode workflow before broadening into Knowledge, Production, Analytics, People, or integrations. PostgreSQL, Drizzle, Zod, selective Radix primitives, Phosphor icons, TanStack Table, Storybook, Vitest, Playwright, and axe are the preferred additions, but each enters only in the phase that proves a real vertical slice and owns compatibility tests.

The largest risks are projection leakage, authorization enforced only in UI/layouts, unstable episode identity, false timeline precision, mixed-version retrieval evidence, fabricated operational completeness, and nominally read-only adapters that can mutate external systems. Prevention is architectural: separate allowlisted public and operator DTOs, authorize at every server data/action boundary, use stable internal IDs and versioned assets, make unavailable/stale/partial/conflicted first-class states, stage and atomically activate indexed versions, and expose only read operations through least-privilege adapters. Phases 1–5 are the credible MVP cut; phases 6–8 complete the milestone as bounded, read-only projections and migration closure. Autonomous writes and high-risk financial, identity, publishing, or credential workflows are explicitly v2+.

## Milestone Boundary

### v1.0 includes

- Compatibility protection for `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` throughout migration.
- Separate anonymous public and authenticated operator shells over shared evidence-domain services.
- A repository-owned semantic token, accessible primitive, component-state, and regression-test foundation that preserves the WTF brand.
- Stable internal episode identity, versioned assets and transcripts, dual timelines, honest citations, reconciliation, and activity provenance.
- Scoped operator Knowledge with distinct evidence and synthesis, saved evidence objects, and structured dossiers.
- Canonical production workflow records that make Control Room counts actionable and reproducible.
- Bounded Analytics and People projections with explicit availability, reporting windows, evidence, and field-level visibility.
- Read-only integration health introduced one source at a time with permission, idempotency, retry, provenance, privacy, and ownership gates.
- Consumer-by-consumer migration closure with public, accessibility, responsive, visual, privacy, performance, and security proof.

### v1.0 does not authorize

- Breaking, renaming, or silently changing any protected public route or the public chat contract.
- External writes for messaging, task mutation, publishing, scheduling, source-file movement, finance, CRM, contracts, or storage.
- Payment execution, e-signatures, government-ID storage, credential management, or outbound publishing.
- Autonomous clip publication, predictive or causal recommendations, model-inferred people relationships, or generated dossiers presented as fact.
- Abstract-topic or sentiment retrieval without a labelled evaluation set and approved thresholds.
- Real-time collaborative editing, a full speculative component catalogue, a framework rewrite, or a big-bang public-data cutover.
- Provider, deployment, registry, session, relocation, or external infrastructure changes from planning alone.

## Key Findings

### Stack Decisions

The stack research supports an evolution of the shipping modular monolith. Framework churn would add migration risk without solving the actual problems, which are authorization, provenance, evidence governance, accessibility, and operational truth.

| Decision | Technology or capability | Recommendation and rationale |
|---|---|---|
| **Preserve** | Next.js `15.5.19`, React/React DOM `19.0.0`, TypeScript `5.7.3` strict mode | The existing App Router boundary supports route groups, Server Components, Route Handlers, and a server-only DAL; do not combine the re-foundation with a framework-major migration. |
| **Preserve** | Tailwind `3.4.17` plus CSS custom properties | Move raw values incrementally into semantic tokens and Tailwind aliases; do not introduce a token compiler or competing visual layer. |
| **Preserve** | Vercel public/browser boundary and Cloudflare edge RAG | Keep `/api/chat` as the protected server-to-server compatibility adapter; internal operational records do not belong in the RAG Worker. |
| **Preserve** | Current committed public catalogue and transcript projections | Wrap them behind public repository interfaces and keep them live until shadow-read parity proves a canonical replacement. |
| **Add, gated** | Organization-owned OAuth/OIDC plus stable auth library | Define permissions first. Prefer stable `next-auth@4.24.15` only if it fits the approved provider; do not adopt the beta major or local password auth. |
| **Add** | `server-only@0.0.1` and a centralized authorization/DAL layer | Prevent client imports of secrets and require capability checks plus minimal DTOs at every protected data/action boundary. |
| **Add, provider-gated** | Managed PostgreSQL, `drizzle-orm@0.45.2`, `pg@8.23.0`, `drizzle-kit@0.31.10` | Relational constraints and reviewed migrations fit canonical IDs, versioned evidence, workflow, people, metrics, reconciliation, and audit. Provider, region, pooling, backups, residency, and recovery require owner approval. |
| **Add** | `zod@4.4.3` | Validate auth claims, inputs, adapter observations, reconciliation inputs, and output contracts; never coerce missing data to zero. |
| **Add vertically** | `radix-ui@1.6.7` and `@phosphor-icons/react@2.1.10` | Use only proven primitive subpaths beneath repository-owned WTF wrappers; preserve custom brand glyphs and visual authorship. |
| **Add after spike** | `@tanstack/react-table@8.21.3` | Use as a headless state engine for the first dense table while WTF owns semantics, accessibility, URL state, responsive alternatives, and styling. |
| **Add as proof foundation** | ESLint 9, Storybook 10.5.9 Next/Vite, Vitest 4.1.10, Playwright 1.62.1, axe 4.13.0 | Cover static, domain/schema, component-state, route/API, auth, keyboard, viewport, reduced-motion, visual, and full-page accessibility behavior. |
| **Defer until measured** | Virtualization, Lighthouse CI, MSW, database sessions, RLS, charting, command-palette packages | Add only when production-shaped evidence or policy creates the need; ordinary semantic markup, direct fixtures, DAL authorization, and repository-owned visuals come first. |
| **Avoid** | Next 16/React/TypeScript major migration, Tailwind major migration, microservices, new retrieval stack | These expand the blast radius without advancing the milestone's core value. |
| **Avoid** | Auth beta APIs, local password systems, unreviewed schema push, bulk package foundation, full pre-styled kits | They create unstable security, migration, and brand boundaries. |
| **Avoid** | Browser-side credentials, raw provider payload persistence, write-capable first adapters | They violate privacy, projection, and read-only constraints. |

**Version gates:** align local, CI, and deployment on one Node major before test-tool installation; Node 22 is the evidence-aligned preference, but the actual deployment major must be verified. Refresh and pin dependency versions in the owning implementation phase, not in this planning artifact.

### Feature Table Stakes

These are release requirements, not optional polish:

- **Protected projection split:** anonymous catalogue and authenticated `/ops` experiences have different shells, navigation, DTOs, caches, search projections, and interaction state.
- **Deny-by-default authorization:** every protected query, Route Handler, and Server Function checks principal, capability, entity scope, and field visibility; hidden UI is never proof.
- **Truthful Control Room:** live, due, blocked, unowned, failing, and assigned work derive from canonical records; every count deep-links to its contributors.
- **Canonical episode workspace:** one stable internal episode ID joins external identities, assets, transcript versions, citations, clips, owners, workflow, performance, and activity.
- **Dual-timeline evidence:** clean-cut and published-video time are separate, versioned coordinate systems with verified, unmapped, conflicted, and stale mapping states.
- **Governed Knowledge:** search scope is explicit; quoted evidence, source metadata, model synthesis, abstention, and failures are structurally distinct; saves create explicit evidence or dossier records.
- **Shared production truth:** board and calendar project the same workflow record; active stages have one accountable owner; shoot and publish dates remain distinct.
- **Analytics provenance:** every value has platform, scope, reporting window, observed/refresh time, availability, and calculation lineage where derived.
- **People evidence and privacy:** mention, guest, lead, team member, owner, and generated synthesis remain separate; sensitive fields are omitted from unauthorized surfaces.
- **Read-only integration health:** permission mode, source coverage, attempt/success times, retry state, and owner are visible without credentials, private paths, or raw payloads.
- **Accessible WTF migration:** semantic tokens, state-complete components, visible focus, keyboard operation, reduced motion, semantic alternatives, responsive behavior, and route-level proof are blocking gates.
- **Uncertainty is explicit:** unknown, unavailable, stale, partial, empty, permission-denied, error, unmapped, conflicted, and measured zero remain distinct states.

### Differentiators

- **Receipts become actions:** a passage can become an Ask scope, saved evidence, dossier reference, clip candidate, or workflow action without losing its episode, asset, timeline, and source span.
- **Dual-timeline truth:** internal editing can use the clean cut while public citations remain honest to the published asset.
- **One episode, many projections:** production, knowledge, analytics, people, and public discovery share canonical identity without sharing policy or view state.
- **Uncertainty as interface state:** the product earns trust by showing what it does not know rather than generating plausible completeness.
- **Evidence-native dossiers:** the WTF editorial method remains structured, source-linked, and visibly distinct from operator hypotheses.
- **Operational deep links:** every summary is an entry point to the exact records behind it.
- **Policy-separated narratives:** public theme discovery and internal operational knowledge share evidence while preserving exposure boundaries.
- **WTF density:** dependable daily software retains the wordmark, type, palette, print texture, editorial voice, and playful public expression without generic kit styling.
- **Failure with provenance:** operators can see the failed boundary, last good observation, affected scope, retry state, and owner without seeing secrets.

### Deferred Capabilities

Defer to v2+ or separately approved phases: outbound adapter actions; finance, payment, contract, identity-document, or credential workflows; autonomous clip generation/publication; automated enrichment or outreach; predictive analytics; real-time collaboration; abstract-topic and sentiment search without evaluations; public provider diagnostics; and any public `/ask` replacement that lacks a tested `/chat` compatibility path.

## Target Architecture

Use a modular monolith for the Next.js application and retain the existing Cloudflare RAG Worker as the already-proven separate evidence service.

```text
anonymous browser                         authenticated operator
       │                                           │
       ▼                                           ▼
PublicShell + allowlisted DTOs          OperatorShell + capability DTOs
       │                                           │
       └──────────────┬────────────────────────────┘
                      ▼
       server-only application/DAL boundary
       public queries · operator queries · commands
       authorization · projection mappers · availability
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 canonical relational store      evidence query service
 episode/assets/workflow/         citations/passages/scoped RAG
 people/metrics/audit             existing edge RAG adapter
          │                       │
          └───────────┬───────────┘
                      ▼
 read-only observations · reconciliation · health · retry
```

### Major component boundaries

1. **Neutral document root** — owns fonts, metadata defaults, and token loading; it must not carry public-only motion/navigation or protected session data.
2. **Public projection** — preserves the shipping routes and exposes only allowlisted published catalogue, theme, transcript, citation, and Ask WTF fields.
3. **Operator projection** — authenticated `/ops` workspaces return capability-specific minimal DTOs and never serialize canonical records directly to clients.
4. **Server-only application layer** — centralizes session checks, capabilities, repositories, commands, projection mapping, sanitized failures, and cache policy.
5. **Canonical domain store** — owns stable episode identity, external identities, assets, transcript versions, timeline maps, workflow, evidence, people, metrics, reconciliation, and audit metadata.
6. **Evidence query service** — adapts the protected public RAG and future versioned operator-scoped retrieval without changing `/api/chat` silently.
7. **Read-only adapters and reconciliation** — validate normalized observations, deduplicate, retain health, surface conflicts, and never blind-overwrite canonical truth.
8. **Repository-owned UI layers** — one-way dependency from semantic tokens to accessible primitives to reusable patterns to domain components to projection shells.
9. **Proof system** — domain/schema tests, stories and component interactions, route/API/browser journeys, axe, deterministic screenshots, privacy scans, bundle checks, and measured performance budgets.

### Dependency Order

```text
public compatibility contracts
  ├─> vertical public migration
  └─> public/operator shell separation

permission model ─> identity/session ─> server authorization ─> OperatorShell

semantic tokens + test harness ─> primitives ─> patterns ─> domain components

stable episode identity ─> assets/transcripts ─> dual timelines ─> citations
        └─> reconciliation ─> canonical episode workspace

provenance spine ─> governed Knowledge ─> production workflow ─> truthful Control Room
        └─────────> Analytics/People projections ─> read-only adapters

all migrated consumers + all gates green ─> legacy removal
```

Two foundations may proceed in parallel after contracts are frozen: the visual/test foundation and the shadow provenance domain. They converge at the first authenticated episode workspace. Provider-specific integration cannot precede the internal domain contracts it feeds.

## Critical Pitfalls and Prevention Gates

| Risk | Prevention gate | Detection | Phase owner |
|---|---|---|---|
| **Public/operator projection leakage** | Separate allowlisted DTO constructors, policy-bound queries, cache/search namespaces, and safe errors; return minimum fields only. | Anonymous and cross-role scans of HTML, RSC/API payloads, prefetches, search, errors, exports, and two-identity cache hits. | Phase 2 establishes; continuous through Phase 8. |
| **Authentication mistaken for authorization** | Approve a role × resource × action × record × field matrix before provider UI; deny by default in DAL, handlers, and actions. | Direct request, ID-tampering, expiry/revocation, and privilege-escalation tests. | Phase 2. |
| **Protected route or `/api/chat` drift** | Freeze URLs, queries, deep links, body/streaming behavior, headers, errors, cache policy, and citations before moving source. | Contract snapshots plus real browser journeys before and after every slice. | Phase 1 establishes; Phase 8 closes. |
| **Private material enters committed or browser-visible artifacts** | Use synthetic real-shaped fixtures, allowlisted logs/DTOs, server-only secrets, and redaction at adapter boundaries. | Bounded secret, URL, path, private-phrase, snapshot, bundle, and sentinel scans. | Phase 1 establishes; every phase enforces. |
| **Platform ID becomes canonical episode identity** | Stable opaque internal IDs, unique external identities, explicit merge/split and reconciliation rules. | Re-import fixtures with absent/replaced IDs, reuploads, edits, and conflicts. | Phase 3. |
| **Timeline collapse creates false citations** | Coordinates always name an asset/version; mappings are segmented and stateful; unmapped evidence has no timed affordance. | Insert/delete/reorder/drift fixtures, invalidation tests, and citation contract tests. | Phase 3 spike and gate. |
| **Re-ingestion leaves stale or mixed evidence** | Version by asset/content hash, stage then atomically activate, remove/tombstone obsolete chunks, preserve last known good on failure. | Unchanged, shorter, longer, interrupted, reordered, and removed-sentinel ingestion tests. | Phase 3. |
| **Knowledge blurs evidence, synthesis, and scope** | Put scope, sources, evidence spans, synthesis, grounding, and downstream links in typed schemas; save explicit evidence objects only. | Golden grounding/abstention evaluations, scope tampering, source-open journeys, dossier sampling. | Phase 4. |
| **Control Room becomes another source of truth** | Encode workflow and legal transitions first; derive summaries; require contributor deep links; show unavailable until real records exist. | Count-to-record reconciliation, board/calendar parity, invalid transition fixtures. | Phase 5. |
| **Unavailable becomes zero or healthy** | Shared typed state vocabulary with observation time, reporting window, last success, failed boundary, retry, and owner. | Fixtures and transitions covering all states plus measured zero. | Phase 1 component contract; Phases 4–7 semantics. |
| **Model output creates people relationships** | Separate mention, evidence, operator-confirmed role, and synthesis; apply field- and record-level authorization. | False-positive corpus and role tests across HTML, APIs, search, export, cache, and errors. | Phase 2 policy; Phase 6 domain. |
| **Read-only adapters can still mutate** | Omit write methods, enforce a server operation allowlist, use least-privilege credentials, and require separate approval for any write. | Crafted mutation attempts, credential-scope review, outbound request recording, duplicate-delivery tests. | Phase 7, per source. |
| **Accessible primitives create false confidence** | Keep semantic contracts in WTF wrappers and test complete journeys, not only component open/close behavior. | Keyboard, focus, accessible-name, live-region, axe, screen-reader smoke, reduced-motion, and viewport tests. | Phase 1 establishes; every consuming phase. |
| **Big-bang migration destroys rollback** | Migrate one vertical consumer slice at a time; keep old readers/styles until replacement proof and consumer inventory are complete. | Scoped diffs, route matrix, snapshots, consumer graph, and rollback rehearsal. | Phases 1–8. |

Each gate needs an accountable role: public contract custodian, authorization/privacy owner, provenance/schema steward, workflow domain owner, design-system maintainer, per-source integration owner, and quality gatekeeper. One person may hold multiple roles, but the decision rights and artifacts remain distinct.

## Implications for Roadmap

The roadmap should use eight phases. This is the smallest ordering that respects compatibility, policy, domain, and evidence dependencies while keeping each phase independently verifiable.

### Phase 1: Compatibility and Component Proof Harness

**Rationale:** Existing behavior is the migration oracle. No route, layout, component, package, or store change is safe until public and quality contracts are executable.
**Delivers:** Public route/API/browser snapshots; pinned runtime/toolchain; semantic tokens; focus/motion/state rules; synthetic fixtures; initial Storybook/Vitest/Playwright/axe/visual harness; one migrated real component.
**Features:** Protected public continuity, accessible WTF foundation, complete availability-state vocabulary.
**Avoids:** Route drift, fixture privacy leaks, generic kit styling, inaccessible primitives, public performance regression, and big-bang migration.
**Exit gate:** All five protected contracts are captured; fixtures are privacy-safe; keyboard, focus, reduced motion, 320/768/1440, axe, visual, and measurable performance baselines run as blocking checks.

### Phase 2: Authenticated Shell and Policy Boundary

**Rationale:** Identity without a resource/action/field policy is unsafe; protected data cannot precede enforceable authorization and cache separation.
**Delivers:** Approved capability matrix; identity/session selection; `/ops` shell; deny-by-default DAL, handler, and action checks; projection-specific DTOs; safe session expiry, errors, cache, search, and state boundaries; truthful empty Control Room.
**Features:** Public/operator split, operator identity/scope, protected search foundation, recoverable permission states.
**Avoids:** Projection leakage, layout-only auth, cross-user caching, entity-existence leaks, and public exposure of internal diagnostics.
**Exit gate:** Anonymous and insufficient-role probes fail closed across every tested surface, while protected state is cleared on logout/expiry and public behavior remains green.

### Phase 3: Provenance Spine and Canonical Episode Workspace

**Rationale:** Episode identity, asset lineage, transcript versions, and timeline truth must exist before workspaces, dashboards, or integrations can share reliable records.
**Delivers:** Approved relational provider and migrations; stable episode/external identity model; assets; transcript versions; timeline maps; citations; reconciliation; activity; shadow import; one end-to-end episode workspace.
**Features:** Canonical episode, dual timelines, honest timestamps, idempotent ingestion, reconciliation, evidence-context navigation.
**Avoids:** Platform-key identity, false offsets, mixed index versions, stale chunks, blind cutover, and private public-directory evidence.
**Exit gate:** One episode survives ID and metadata change; mapped/unmapped/conflicted/stale cases work; shorter/longer/interrupted retries leave exactly one consistent active evidence version; public readers remain unchanged.

### Phase 4: Knowledge Receipts-to-Action

**Rationale:** Governed operator knowledge depends on canonical evidence and must use a separate authenticated contract rather than stretching the public chat API.
**Delivers:** Explicit episode/show/catalogue scope; distinct evidence/synthesis/source/grounding schema; in-context source opening; saved evidence; structured dossiers; evaluated operator retrieval extension.
**Features:** Receipts become actions, evidence-native dossiers, scoped Ask WTF, inspectable sources, typed failures.
**Avoids:** Invisible chat memory, wrong-scope answers, false ownership/role claims, source-context loss, and `/api/chat` drift.
**Exit gate:** A transcript selection becomes a saved evidence object and dossier reference without losing provenance; citation and 100% unsupported ownership/role abstention gates pass; public chat remains compatible.

### Phase 5: Production Workflow and Control Room Activation

**Rationale:** A truthful dashboard is a projection of approved workflow records, owners, dates, blockers, and health—not a store of manually maintained totals.
**Delivers:** Operator-approved stage machine; accountable ownership; separate shoot/publish dates; board/calendar parity; blockers; clip/brief references; attributable internal mutations; actionable Control Room summaries.
**Features:** Canonical production workflow, operational deep links, owners and next actions, receipts-to-production continuity.
**Avoids:** Dashboard-first modelling, unowned active work, duplicate board/calendar truth, fake counts, and irreversible silent mutations.
**Exit gate:** Every count reproduces its contributing authorized records; every active stage has an owner; board/calendar agree; actions produce auditable prior/current state and defined recovery.

### Phase 6: Analytics and People Projections

**Rationale:** Metrics and relationships can be trustworthy only after canonical episodes, permissions, workflow, availability, and evidence objects exist.
**Delivers:** Metric observation/window/freshness/lineage contracts; explicit measured-zero behavior; evidence-backed person roles; guest/lead separation; field-level visibility; descriptive Analytics and People workspaces.
**Features:** Analytics provenance, evidence-backed people relationships, uncertainty states, sensitive-field omission.
**Avoids:** Missing-as-zero, unnamed comparisons, causal claims from correlation, model-inferred relationships, and sensitive-field leakage.
**Exit gate:** Every metric carries source/window/availability; every relationship carries evidence or authorized confirmation; unauthorized sensitive fields are absent from all response surfaces.

### Phase 7: Read-Only Integration Health

**Rationale:** Adapters must feed established domain contracts; source-specific payloads, scopes, and retry behavior must never define canonical records.
**Delivers:** One source adapter at a time; normalized observations; stable external keys; content-hash dedupe; permission mode; health; attempt/success/retry; record-level coverage; reconciliation; redacted errors; named owner.
**Features:** Failure with provenance, read-only source evidence, operable integration health.
**Avoids:** Hidden write capability, retry duplication, raw payload persistence, credentials/path leakage, and configured-equals-healthy assumptions.
**Exit gate:** Crafted writes fail, least-privilege scope is verified, duplicate/timeout/partial/retry fixtures are idempotent, and last-known-good remains distinct from current failure.

### Phase 8: Migration Closure

**Rationale:** Legacy code and styles can be removed only after every consumer has migrated and both projections have complete evidence.
**Delivers:** Remaining vertical migrations; canonical public projection parity/cutover where approved; semantic connections alternative; legacy consumer removal; final token, route, RAG, accessibility, privacy, security, bundle, responsive, visual, and performance gates.
**Features:** Complete accessible WTF system, protected public projection, maintainable repository boundaries.
**Avoids:** Search-based deletion confidence, orphaned styles, canvas-only meaning, shared public/operator state, and performance/brand regressions.
**Exit gate:** Consumer inventory is zero before deletion; all protected public and operator contracts are blocking and green; rollback seams have been rehearsed.

### Phase Ordering Rationale

- Contracts precede migration because status `200` alone does not preserve routes, headers, citations, query state, focus, streaming, or error behavior.
- Permission policy precedes auth-provider UI because authentication identifies a user but does not grant record, action, or field access.
- Canonical identity and provenance precede broad workspaces because otherwise every module and adapter invents competing keys and truth.
- One timeline-mapping slice precedes ingestion scale because edit alignment, invalidation, and correction are the hardest unresolved data problems.
- Knowledge precedes production because it proves the receipts-to-action evidence object that clips, briefs, and decisions consume.
- Workflow precedes Control Room counts because summaries must be reproducible projections.
- Analytics, People, and integrations follow shared schemas because unavailable, permissions, evidence, and reconciliation are cross-cutting contracts.
- Legacy removal is last because old and new consumers must coexist for comparison and rollback.

## Recommended Requirement Taxonomy and Milestone Cut

Requirements should use stable IDs grouped by durable outcome, not implementation package. Recommended families:

| Prefix | Requirement family | Primary phase |
|---|---|---:|
| `COMP` | Public route, query, deep-link, `/api/chat`, RAG, and projection compatibility | 1, continuous, 8 |
| `DSYS` | Brand tokens, primitives, states, focus, motion, responsive, visual, and semantic alternatives | 1, continuous, 8 |
| `AUTH` | Identity, capabilities, records/actions/fields, sessions, DTOs, caches, search, and non-leaking failures | 2, continuous |
| `PROV` | Stable episode identity, assets, transcript versions, timelines, citations, ingestion, reconciliation, and activity | 3 |
| `KNOW` | Scoped retrieval, evidence/synthesis separation, source opening, saved evidence, dossiers, and evaluations | 4 |
| `FLOW` | Stages, transitions, owners, dates, blockers, board/calendar, activity, and Control Room derivation | 5 |
| `ANLY` | Metric source, reporting window, freshness, availability, comparison, and calculation lineage | 6 |
| `PEOP` | Person role distinctions, evidence, pipeline state, consent/classification, and field visibility | 6 |
| `INTG` | Read-only operation allowlists, observations, source keys, idempotency, health, retry, coverage, and redaction | 7 |
| `QUAL` | Build, type, test, accessibility, privacy, security, bundle, performance, migration, and release evidence | All phases |

Each requirement should map to exactly one roadmap phase and one or more ISA criteria. Cross-cutting invariants such as privacy, compatibility, authorization, accessibility, and unavailable-not-zero belong in `QUAL`/`COMP`/`AUTH` requirements that every relevant phase re-verifies, rather than being duplicated with shifting language.

### Cut lines

- **MVP / first credible operator release: Phases 1–5.** It proves public continuity, an authorized shell, canonical provenance, governed Knowledge, production workflow, and a truthful Control Room through one complete receipts-to-action loop.
- **v1.0 completion: Phases 1–8.** Analytics, People, and integrations remain bounded read-only projections, and the component/public migration closes with all consumers and gates accounted for.
- **v2+ / separate authority:** External writes, high-risk financial/identity/contract capabilities, automation, predictive systems, real-time collaboration, and unproved retrieval classifiers.

## Contradiction Resolution

| Apparent conflict | Resolution for requirements and roadmap |
|---|---|
| Architecture says the persistence vendor is undecided; stack recommends PostgreSQL/Drizzle/`pg`. | Treat relational PostgreSQL semantics and repository-owned migrations as the recommended design. Provider, region, pooling, backup, residency, recovery, and final driver remain a Phase 3 approval gate. |
| Stack names stable package versions; design forbids installing dependencies before an owning phase. | Versions are planning pins, not installation authority. Refresh, pin, install, and verify each dependency only within its owning vertical phase. |
| Design build order puts shells before provenance; feature/pitfall order puts auth before provenance; architecture allows visual and provenance foundations in parallel. | Freeze contracts first. Then run visual/test and shadow provenance foundations in parallel. Complete the permission model and auth boundary before exposing `/ops`; converge all foundations in the first operator episode slice. |
| ISA groups broad Production Operations together; research recommends distinct workflow, Analytics/People, and adapter phases. | Keep ISA acceptance IDs stable, but decompose roadmap execution into Phases 5, 6, and 7 so policy and source-specific research gate each surface. |
| ISA includes abstract-topic and sentiment criteria; feature research defers them without evaluations. | Keep them as evaluation-gated requirements. They do not block the Phase 4 MVP slice unless an approved labelled set and threshold exist; otherwise explicitly defer them from the milestone cut rather than weakening proof. |
| ISA names specific source integrations; project boundary says integrations begin read-only and source capabilities are unknown. | Preserve source-specific criteria as candidate read-only adapters. Do not assert source behavior or schedule an adapter until Phase 7 performs current official contract/scope research and names an owner. |
| Design documents a complete component catalogue; stack warns against bulk foundation work. | The catalogue defines contracts, not an upfront build. Implement only primitives consumed by the current vertical slice; complete the catalogue through migration demand. |
| Current public corpus counts and planning inventory counts differ. | Treat neither as a silent universal total. Phase 3 reconciliation reports the mismatch while the validated public projection remains unchanged; unavailable coverage never becomes zero. |

## Research Flags and Open Decisions

Use `$gsd-plan-phase --research-phase <N>` for Phases 2–7. Phases 1 and 8 use well-documented patterns and repository evidence; targeted version refreshes and migration checks are still required, but broad research-phase work is not.

| Phase | Confidence | Required decision or deeper research |
|---:|---|---|
| **1** | HIGH | Verify deployment Node major; pin exact tool versions; capture actual public query/header/error/cache/performance baselines. Standard patterns—skip broad research. |
| **2** | MEDIUM | Identity provider, invitations, MFA, session lifetime/revocation, user lifecycle, capability and field matrix, data classification, retention, consent, and permission-safe caching. **Research required.** |
| **3** | MEDIUM | PostgreSQL provider/topology, residency, backups/PITR/restore, migration roles, field authority, merge/split policy, timeline alignment/correction UX, mapping thresholds, invalidation, and index replacement semantics. **Research plus spike required.** |
| **4** | MEDIUM | Versioned scoped retrieval contract, latency, gold-set thresholds, topic/sentiment labelled sets, source-opening behavior, and typed operator provenance response. **Research/evaluation design required.** |
| **5** | MEDIUM | Real production stages, legal transitions, ownership, due/blocker meanings, optimistic concurrency, mutation confirmation/recovery, and simultaneous-edit likelihood. **Operator research required.** |
| **6** | MEDIUM | Platform coverage, refresh/retention/comparison rules, metric authority, people consent, sensitive-field classification, deletion/legal-hold/subject-access policy. **Policy/source research required.** |
| **7** | LOW per unselected source; HIGH for shared contract | Current official APIs, safe methods, scopes, rate limits, webhooks/polling, stable keys, retries, retention, contractual restrictions, and named owner for each selected adapter. **Per-adapter research required.** |
| **8** | HIGH | Consumer inventory, parity tolerances, final budgets, and rollback rehearsal derive from prior phases. Standard migration patterns—skip broad research. |

### Gaps to Carry into Requirements

- Owner-approved role, capability, record, action, and field taxonomy.
- Data retention, deletion, legal hold, consent, and subject-access policy for people/contact data.
- Canonical field-authority, merge/split, correction, and conflict-ownership rules.
- Timeline mapping method, review workflow, accuracy threshold, and invalidation granularity.
- Selected relational provider, deployment region, pooling, backup, restore, and disaster-recovery proof.
- Approved workflow stage machine, due/blocker semantics, accountable ownership, and concurrency behavior.
- Approved RAG evaluation datasets and thresholds beyond existing cited retrieval.
- Platform-specific analytics coverage, freshness, comparison, and retention guarantees.
- One source-specific adapter contract, scope review, and owner per Phase 7 slice.
- Moderated first-click, transcript comprehension, dense table efficiency, and keyboard walkthrough plans beyond automated accessibility.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH for preservation, UI, and test choices; MEDIUM for auth/data packages | Baseline is repository-verified and recommendations use primary docs. Identity vendor, database provider, Node deployment major, residency, and final pooling remain open. |
| Features | HIGH for table stakes and differentiators; MEDIUM for policy/source breadth | Project, design, ISA, and shipping behavior agree. Roles, stages, evaluation thresholds, and source capabilities require owner or phase evidence. |
| Architecture | HIGH for topology and boundaries; MEDIUM for unresolved implementations | Public/operator projections, server-only DAL, canonical provenance, DTOs, and adapter/reconciliation boundaries are strongly supported. Persistence product, scoped retrieval, and edit-map generation remain gated. |
| Pitfalls | HIGH for security, privacy, compatibility, accessibility, and provenance risks | Risks derive from repository code and primary guidance. Exact likelihood and cost for timeline correction and source adapters remain uncertain. |

**Overall confidence:** HIGH in the roadmap dependency order and milestone boundary; MEDIUM in provider-specific implementation details.

## Traceability Matrix

| Synthesis decision | Research report authority | Project authority / primary support |
|---|---|---|
| Preserve shipping stack and public RAG boundary | [STACK.md](./STACK.md), [ARCHITECTURE.md](./ARCHITECTURE.md) | `.planning/PROJECT.md`, `DESIGN.md`, `ISA.md`; Next.js route/data-security guidance |
| Preserve public routes and `/api/chat` behavior | All four reports | `.planning/PROJECT.md`, `DESIGN.md` sections 5/13/18–22, ISA ISC-13–24 and ISC-111–118 |
| Separate public and operator projections | [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md) | `DESIGN.md` product architecture; ISA ISC-13–24 and ISC-123–125; OWASP authorization guidance |
| Episode/provenance spine precedes workspace breadth | [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md) | `.planning/PROJECT.md` core value; `DESIGN.md` episode contract; ISA ISC-71–82; W3C PROV-O |
| Dual timelines and honest citations | [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md) | `DESIGN.md` transcript contract; ISA ISC-75–81 and ISC-126 |
| Unavailable/stale/partial never become zero | All four reports | `.planning/PROJECT.md` evidence constraint; `DESIGN.md` state completeness; ISA analytics and anti-criteria |
| Selective accessible primitives under WTF-owned styling | [STACK.md](./STACK.md), [FEATURES.md](./FEATURES.md), [PITFALLS.md](./PITFALLS.md) | `DESIGN.md` component foundation; ISA ISC-25–58; Radix, WCAG, WAI-ARIA, Storybook, and Playwright guidance |
| External integrations remain read-only first | [FEATURES.md](./FEATURES.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [PITFALLS.md](./PITFALLS.md) | `.planning/PROJECT.md` operations constraint; ISA ISC-103–110; RFC 9110 safe/idempotent semantics |
| Eight-phase roadmap and Phase 1–5 MVP cut | [FEATURES.md](./FEATURES.md), [PITFALLS.md](./PITFALLS.md), refined by [STACK.md](./STACK.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) | `DESIGN.md` dependency order; ISA feature dependencies |

## Sources

### Research reports

- [Technology Stack Research](./STACK.md) — preservation/addition decisions, package gates, versions, test pyramid, and dependency order.
- [Feature Landscape](./FEATURES.md) — table stakes, differentiators, deferred capabilities, anti-features, dependencies, and MVP cut.
- [Architecture Research](./ARCHITECTURE.md) — target topology, canonical domain, projections, state ownership, flows, migration seams, and risks.
- [Domain Pitfalls](./PITFALLS.md) — priority register, phase ownership, go/no-go gates, required owners, research flags, and missed risks.

### Repository authorities

- `.planning/PROJECT.md` — milestone scope, core value, protected routes, active requirements, and constraints.
- `DESIGN.md` — product narrative, WTF visual system, route split, component contracts, screen states, accessibility, and migration order.
- `ISA.md` — acceptance authority, stable criteria, anti-criteria, test strategy, and feature dependencies.
- `PRODUCT.md` and current application/Worker source cited inside the four reports — shipping brand, route, catalogue, chat, citation, and deployment behavior.

### Primary external guidance

- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [data security](https://nextjs.org/docs/app/guides/data-security), [route groups/project structure](https://nextjs.org/docs/app/getting-started/project-structure), and [`use client`](https://nextjs.org/docs/app/api-reference/directives/use-client) — server authorization, minimal DTOs, route organization, and client boundaries.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) — deny-by-default authorization, least privilege, and sensitive-data exclusion.
- [W3C PROV-O](https://www.w3.org/TR/prov-o/) — entities, activities, agents, derivation, revision, and responsibility in provenance chains.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI-ARIA patterns](https://www.w3.org/WAI/ARIA/apg/patterns/), and [reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) — keyboard, focus, semantics, reflow, status, and motion requirements.
- [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction), [TanStack Table](https://tanstack.com/table/latest), [Storybook testing](https://storybook.js.org/docs/writing-tests), [Playwright](https://playwright.dev/docs/intro), and [axe for Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) — headless behavior and layered component/route proof.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql), and [Zod 4](https://zod.dev/packages/zod) — relational integrity, repository-owned migrations, and runtime boundary validation.
- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — safe and idempotent operation semantics for adapter allowlists and retries.

## Privacy Statement

This synthesis contains only bounded conclusions, repository authorities, public documentation, and implementation guidance. It reproduces no private source filename, machine-local checkout path, raw meeting or transcript text, private document link, prompt or response body, native session identifier, secret, credential, or provider token. Private source materials informed earlier bounded requirements research only and are neither copied here nor made runtime dependencies.

---
*Research completed: 2026-08-18*
*Ready for requirements and roadmap: yes*
