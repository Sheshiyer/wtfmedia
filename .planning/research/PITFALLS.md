# Domain Pitfalls: v1.0 One Brain Re-foundation

**Project:** WTF Media
**Domain:** Brownfield internal podcast operating system plus repository-owned design system
**Researched:** 2026-08-18
**Overall confidence:** HIGH for repository and primary-document findings; MEDIUM where operator policy, source-system contracts, or workflow taxonomy remain undecided

## Research Boundary

This register covers failure modes introduced while adding authenticated operator workspaces over the shipping public catalogue. The compatibility baseline is `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat`; those routes remain available and behaviorally compatible throughout migration.

Evidence labels used below:

- **Observed:** directly supported by current repository code or project authorities.
- **Primary guidance:** supported by current official documentation or standards.
- **Inference:** a likely failure derived from the proposed architecture; validate during the owning phase.
- **Unknown:** policy or source behavior that the repository does not yet define.

No source-system capability is assumed. Adapter-specific behavior, operator roles, field classifications, workflow stages, analytics refresh guarantees, and timeline-alignment accuracy remain phase decisions.

## Phase Ownership Model

Risk ownership follows the dependency order in `FEATURES.md`. “Continuous” means the phase establishes the gate and every later phase must keep it green.

| Phase | Scope | Non-delegable risk ownership |
|---|---|---|
| **1. Compatibility and component proof harness** | Public contract snapshots, semantic tokens, representative fixtures, Storybook/browser/a11y/visual/performance harness | Public compatibility baseline; fixture privacy; token, focus, motion, responsive, and performance budgets |
| **2. Authenticated shell and policy boundary** | Identity/session, deny-by-default authorization, `/ops`, projection DTOs, safe cache behavior | Authentication, authorization, public/operator data separation, field visibility, session expiry, cache isolation |
| **3. Provenance spine and canonical episode workspace** | Stable episode identity, asset lineage, transcripts, dual timelines, mapping, reconciliation, activity | Canonical identity, ingestion idempotency, asset versioning, timeline truth, citation integrity, catalogue reconciliation |
| **4. Knowledge receipts-to-action** | Scoped Ask WTF, evidence/synthesis separation, saved evidence, dossiers | Retrieval scope, citation resolution, abstention, evidence-object governance, public chat compatibility |
| **5. Production workflow and Control Room activation** | Workflow records, stages, owners, dates, blockers, board/calendar, actionable summaries | Workflow truth, legal transitions, accountable ownership, derived dashboard counts, reversible internal mutations |
| **6. Analytics and People projections** | Metric observations, reporting windows, relationships, field visibility | Availability/freshness truth, calculation lineage, relationship evidence, sensitive-field policy |
| **7. Read-only integration health** | One adapter at a time, health, retries, redaction, record-level coverage | Enforced read-only behavior, stable source keys, idempotency, retry safety, secret/path redaction, source-specific research |
| **8. Migration closure** | Remaining vertical migrations and legacy removal | Complete consumer inventory, no public regression, no orphan styles/components, final quality/security/performance gates |

## Priority Definition

| Priority | Meaning | Release treatment |
|---|---|---|
| **P0 — stop-ship** | Can expose private/operator data, corrupt provenance, perform an unauthorized external action, or break a protected public contract | Owning phase cannot exit; later phases cannot waive it |
| **P1 — high** | Can make the system materially untrustworthy, inaccessible, unoperable, or expensive to repair | Must be prevented in the owning phase and detected continuously |
| **P2 — moderate** | Creates drift, degraded usability, or organizational ambiguity that compounds over time | Must have a named owner and scheduled control before milestone closure |

## Prioritized Risk Register

| ID | Priority | Risk and consequence | Earliest warning signs | Prevention | Detection / proof | Owning phase and no-go trigger |
|---|---|---|---|---|---|---|
| **R-01** | P0 | **Public/operator projection leakage.** Internal tasks, owners, budgets, leads, drafts, integration health, identifiers, or existence clues escape through HTML/RSC payloads, APIs, search, counts, errors, exports, prefetches, caches, or source panels. | Shared “episode DTO” gains optional internal fields; public and ops queries return the same object; anonymous errors differ for existent versus nonexistent records; internal results appear disabled rather than absent. | Separate public and operator DTO constructors, policy-bound queries, cache namespaces, search indexes/view models, and error contracts. Return only minimum fields. | Anonymous snapshots of HTML, RSC/network responses, headers, search suggestions, errors, and exports; role × record × field tests; cache-hit tests across two identities. | **Phase 2; continuous.** No-go if any anonymous surface reveals an operator field or resource existence. |
| **R-02** | P0 | **Authentication is mistaken for authorization.** Any signed-in user can enumerate or mutate records outside their role, scope, or field entitlement. | Authorization appears only in navigation/layout code; handlers accept user/role/tenant/owner IDs from the client; a role matrix is postponed until after auth-provider setup. | Approve a role × resource × action × record × field matrix first; deny by default; enforce secure checks in the server-only data-access layer, Route Handlers, and every Server Function. | Direct-request tests for every role/action, ID tampering, expired/revoked sessions, horizontal/vertical privilege escalation, and missing-policy cases. | **Phase 2; continuous.** No-go until the matrix has an accountable owner and all protected entry points fail closed. |
| **R-03** | P0 | **Private material contaminates fixtures, stories, logs, telemetry, errors, or generated planning artifacts.** Repository history or browser payloads retain source text, protected links, session identifiers, credentials, or infrastructure paths. | A developer proposes “real transcript samples” for stories; third-party payloads are logged wholesale; snapshots contain URLs/tokens; error details echo upstream paths or request bodies. | Use synthetic, real-shaped fixtures; allowlist DTO/log fields; redact at adapter boundaries; keep secrets server-only; add bounded privacy and bundle scans before fixtures enter the repository. | Secret scan, URL/path pattern scan, bundle inspection, log-schema tests, snapshot review, and negative fixtures containing sentinel secrets. | **Phase 1 establishes; Phases 2–8 enforce.** No-go on any protected material in commit-visible artifacts or browser bundles. |
| **R-04** | P0 | **Protected public routes or `/api/chat` change during route-group migration.** Bookmarks, query strings, source links, status/error behavior, headers, or cited answer consumption break even if pages still return 200. | Tests assert only status codes; `/chat` is silently renamed; moving layouts changes navigation/reload behavior; chat response fields or `X-Sources`, `X-Model`, `X-Fallback`, content type, cache policy, or errors change without versioning. | Freeze request/response and browser-journey contracts before moving files. Keep `/chat` canonical; add any future alias only with tested redirect/alias semantics. Treat route groups as source organization, not permission or compatibility proof. | Deep-link, refresh, back/forward, supported-query, content/header/error snapshot, citation-link, and browser streaming/consumption tests for `/`, `/episodes`, `/connections`, `/chat`, `/api/chat`. | **Phase 1 establishes; every phase and Phase 8 gate.** No-go if any protected route/API contract changes without an approved compatible replacement. |
| **R-05** | P0 | **Canonical episode identity is borrowed from a platform key.** Reuploads, missing public videos, metadata edits, or multi-platform assets create duplicate episodes and split downstream workflow history. | Domain tables use `video_id` as the primary key; adapters upsert episodes independently; a public URL change creates a new workspace; records cannot represent an unpublished episode. | Generate stable internal episode IDs; model external references and asset versions separately; define merge/split/reconciliation rules and uniqueness constraints before workspace breadth. | Re-ingest fixtures for changed metadata, absent/replaced public IDs, reuploads, and conflicting source records; referential-integrity and reconciliation reports. | **Phase 3.** No-go until one episode can survive public-ID change without losing assets, evidence, workflow, or activity. |
| **R-06** | P0 | **Clean-cut and published-video timing is collapsed into one guessed offset.** Inserts, removals, intros, revisions, and clip edits produce false second-level citations. | Schema has one `timestamp`; mapping stores one numeric offset; the UI shows a play link for untimed/unmapped/conflicted/stale passages; asset replacement does not invalidate mappings. | Model source asset, asset version, source timeline, mapping segments, verification state, method, and reviewer. Make unmapped/conflicted/stale states first-class and remove timed affordances when not verified. | Real-shaped edit fixtures covering insert/delete/reorder/drift; mapping property tests; asset-version invalidation; citation contract tests for verified and untimed sources. | **Phase 3 spike and gate.** No-go if any timed citation lacks a verified source/version mapping or if replacement assets retain stale mappings. |
| **R-07** | P0 | **Re-ingestion leaves mixed or obsolete evidence.** Current edge ingestion skips an unchanged content hash and upserts deterministic chunk IDs, but the index metadata does not expose the content hash/version and a shorter changed transcript can leave old tail vectors unless deletion/reconciliation is added. | Chunk counts grow after replacement; queries retrieve text absent from the current transcript; changed content shares IDs with an older version; hash state says complete after partial/mixed indexing. | Version indexed entities by source asset/content hash; stage then atomically activate a version; delete or tombstone obsolete chunks; record expected/actual counts and ingestion outcome; preserve the last known-good version on failure. | Re-ingest unchanged, longer, shorter, interrupted, and reordered fixtures; query for removed sentinel text; compare expected IDs/count/hash; repair/reconciliation command. | **Phase 3.** No-go until repeated and changed ingestion proves no duplicates, stale tail chunks, or partially activated versions. |
| **R-08** | P1 | **Evidence, synthesis, and scope blur in Knowledge.** An answer looks authoritative but searches the wrong corpus, cites the wrong asset, or saves invisible chat state as institutional knowledge. | Scope exists only in prompt text; evidence and generated prose share one field/container; save stores a conversation blob; source opening loses episode/asset/timeline context. | Put scope, source references, evidence spans, synthesis, grounding state, and downstream links in the response/object schema. Persist only explicit evidence/dossier records with creator and provenance. | Golden RAG/abstention tests, scope-tampering tests, source-open journeys, evidence-object schema checks, and dossier claim sampling. | **Phase 4.** No-go if a grounded claim cannot resolve in context or unsupported ownership/role claims pass evaluation. |
| **R-09** | P1 | **Control Room becomes a second source of truth.** Dashboard cards store manual totals or calculate across inconsistent stage/date labels. | Count fields appear in dashboard tables; cards ship before workflow records; a summary cannot list its contributors; board and calendar disagree. | Define workflow/state transitions first; derive summaries from canonical queries; make every count deep-link to equivalent URL filters; render unavailable until source records exist. | Count-to-record reconciliation, board/calendar parity, filtered-deep-link tests, invalid-transition fixtures, and “no contributor, no count” schema assertions. | **Phase 5.** No-go if any actionable summary cannot reproduce its contributing records. |
| **R-10** | P1 | **Unavailable, stale, partial, offline, permission-denied, error, empty, and zero collapse into one state.** Operators act on fabricated completeness or cannot tell what remains safe. | `value \|\| 0`; generic “offline”; a green workspace-level badge despite missing record coverage; catch-all 503/error copy; empty and permission-denied use the same component. | Define a typed availability/failure state machine per source and record, including observation time, reporting window, last success, failed boundary, safe remainder, retry, and owner. | State fixtures for all seven design states plus measured zero; transition tests; copy/schema assertions; partial multi-source failure journeys. | **Phase 1 creates components; Phases 4–7 own domain semantics.** No-go if missing data renders as zero/healthy or errors hide the failed boundary. |
| **R-11** | P0 | **A transcript mention or model label becomes a people relationship.** Unsupported guest/lead/employer/owner claims and sensitive contact data leak into summaries, search, exports, or public projections. | Relationship rows are generated directly from NER/LLM output; “mentioned” and “guest” share an enum; contact fields appear in a general person DTO; unavailable people appear in search teasers. | Separate mention, evidence, operator-confirmed relationship, role, and generated synthesis. Classify fields; enforce record- and field-level authorization; require evidence or authorized confirmation for relationship changes. | Role fixtures across HTML/API/search/export/error paths; false-positive mention corpus; provenance sampling; public DTO diff. | **Phase 6, with policy foundations in Phase 2.** No-go until role and sensitive-field taxonomies are approved and inference cannot promote relationship state. |
| **R-12** | P0 | **“Read-only” adapters still cause external mutations.** A badge or disabled button masks a client that can send, publish, move, acknowledge, schedule, or update. Retries amplify the side effect. | One broad SDK client is shared for reads and writes; outbound scopes remain configured; GET-like UI calls POST endpoints; adapter tests mock only happy reads. | Create a server-side operation allowlist and least-privilege credentials; omit write methods from the adapter interface; use safe methods where the source contract supports them; separately approve every consequential write with rollback. | Contract tests attempt every disallowed operation and crafted request; credential-scope review; outbound request recording; canary source account where available. | **Phase 7.** No-go if code or credentials can perform an unapproved external mutation, even when the UI hides it. |
| **R-13** | P1 | **Adapters dictate the canonical model or retries duplicate observations.** Source-specific fields, IDs, rate limits, and failure semantics spread through domain code. | Domain records contain provider payload blobs; adapter IDs become episode/person IDs; retries create new metrics/tasks/assets; “configured” is treated as healthy. | Normalize through a versioned adapter contract; preserve raw payloads outside domain/browser surfaces under retention policy; use stable observation keys; record permission mode, attempt, success, retry, coverage, and source version. | Adapter contract fixtures for auth/connectivity/rate-limit/malformed/partial responses; duplicate-delivery tests; domain-schema diff; record-level coverage audit. | **Phase 7, one source at a time.** No-go without current source-specific research and retry/idempotency fixtures for that adapter. |
| **R-14** | P1 | **Accessible primitive is treated as accessible product.** A headless library can manage a dialog while labels, table semantics, URL continuity, focus after navigation, announcements, and complete journeys remain broken. | “Radix handles accessibility” closes review; stories test isolated open/close only; custom `asChild` wrappers drop refs/props; serious axe findings are deferred. | Keep repository-owned semantic contracts; forward refs/props correctly; pair stories with keyboard/browser journeys, semantic queries, axe, reduced motion, and moderated first-click checks. | Tab/Shift+Tab/Escape/focus-return tests, accessible-name checks, live-region tests, whole-route axe, screen-reader smoke tests, and 320/768/1440 journeys. | **Phase 1 establishes; each consuming phase enforces.** No-go on serious axe findings, lost focus, unlabeled controls, or keyboard-inoperable core actions. |
| **R-15** | P1 | **Pointer-only and perpetual motion survive migration.** The current canvas uses pointer events and a continuous animation frame; the drawer closes on Escape but has no dialog semantics/focus containment; global marquee/sparkle/cursor animation has no reduced-motion rule. | Instructions say “drag/hover/click”; canvas is the only representation; internal shell mounts the custom cursor; animation continues offscreen or under reduced motion; focus remains behind a drawer. | Provide semantic list/table equivalents; use tested dialog/drawer primitives; keep custom cursor and looping brand motion public-only; pause hidden/offscreen work; honor reduced motion and preserve essential information statically. | Keyboard-only and reduced-motion browser runs; focus/inertness assertions; semantic-equivalence checks; animation-frame/performance profiling; screen-reader traversal. | **Phase 1 component gate; Phase 8 migration gate.** No-go if any core fact/action is canvas-, hover-, drag-, color-, or motion-only. |
| **R-16** | P1 | **Semantic tokens coexist indefinitely with hard-coded/global role styles.** A second palette and generic component-kit defaults replace or dilute the WTF identity. | New components use raw hex or `bg-white`; `.card`, `.pill`, and `.chip` remain active beside token variants; status colors vary by workspace; a full pre-styled kit lands before a vertical proof. | Separate raw brand values from semantic roles; lint new code; document variants/states; migrate consumer by consumer; install only selected headless packages in the phase that proves them. | Token lint, contrast matrix, computed-style and visual snapshots, raw-color inventory trend, consumer graph for legacy classes. | **Phase 1 establishes; Phase 8 closes.** No-go if a competing palette/default visual layer appears or legacy removal precedes its last consumer. |
| **R-17** | P1 | **Storybook becomes the only test surface, or stories contain unrealistic data.** Isolated components pass while route layouts, RSC/client boundaries, auth, caching, streaming, focus continuity, and adapters fail. | CI has story snapshots but no route/API/browser tests; server pages are mocked into stories; all fixtures are happy-path and fully populated; a11y is configured as warnings only. | Use stories for serializable leaf components and state matrices; add schema/contract tests, route-level browser journeys, API tests, visual snapshots, axe, and performance checks. Keep fixtures synthetic but adversarial. | CI coverage matrix mapped to ISA; mutation/negative fixtures; tests execute outside dependency directories; verify each gate fails when its sentinel defect is introduced. | **Phase 1 creates the harness; Phase 8 proves completeness.** No-go if a requirement has only an isolated story or non-blocking warning. |
| **R-18** | P1 | **The internal OS becomes a monolithic client bundle or dynamic root.** Dense tables, transcript state, chat streaming, graph animation, and auth checks increase hydration/LCP and can slow the public catalogue. | `"use client"` rises into shells/domain pages; the root layout reads session/dynamic APIs; heavy graph/table libraries load on unrelated routes; one state store owns filters, transcript, streaming, overlays, and navigation. | Keep domain loading and layout in Server Components; use leaf client islands; isolate auth to the ops boundary; lazy-load heavy interactions; virtualize only after measurement; set route-specific bundle/LCP budgets. | Bundle analyzer, per-route JS diff, Lighthouse CI, LCP/interaction budgets, React profiling, public-versus-ops regression comparison, low-end/mobile runs. | **Phase 1 establishes budgets; every phase enforces.** No-go if ops work regresses protected public performance or exceeds the approved route budget. |
| **R-19** | P0 | **Big-bang route, CSS, or component migration destroys bisectability.** Shared layout/global changes break all public routes while legacy code is removed before replacement proof. | A phase touches every route; old and new shells cannot coexist; global class deletion and route movement occur together; migration PRs lack per-consumer inventory. | Migrate vertical behaviors behind explicit seams; keep old consumers until replacements pass; one component family/route at a time; make compatibility tests mandatory after every slice. | Consumer inventory, scoped diffs, route matrix in CI, visual baseline comparison, unused-style analysis, rollback rehearsal. | **Phases 1–8; Phase 8 closes.** No-go for any slice that cannot identify affected consumers or independently roll back. |
| **R-20** | P1 | **No human owns policy, schema, or source truth.** Teams resolve ambiguity differently and the code silently invents roles, stages, date meanings, metrics, or retry behavior. | “Temporary” enums proliferate; no approver is named for role/stage changes; adapter failures have no accountable owner; design exceptions bypass a maintainer. | Name policy owner, provenance/schema steward, public-contract custodian, design-system maintainer, domain workflow owner, integration owner, and quality gatekeeper. Record decision and escalation paths. | Ownership ledger review at phase entry; schema/policy change approval; orphaned-state and unresolved-decision reports; post-release alert routing test. | **Phase 1 establishes governance; relevant owner signs each gate.** No-go when a release-critical rule or failed integration has no accountable owner. |
| **R-21** | P0 | **User-specific data is cached or prefetched across identities.** Static rendering, shared caches, router state, or CDN configuration serve one operator’s fields to another user or the public. | Protected data enters cached functions without identity/policy in the key; an ops page becomes static; cache headers are public; logout/back navigation shows prior operator content. | Keep protected reads server-only and authorization-aware; use private/no-store behavior where required; separate public and ops cache keys; avoid caching full privileged DTOs; invalidate session-scoped client state on logout. | Two-user cache-poison tests, anonymous-after-auth navigation, header assertions, prefetch inspection, CDN/cache configuration review. | **Phase 2; continuous.** No-go if any protected response is publicly cacheable or reusable across unauthorized identities. |
| **R-22** | P1 | **Error handling either leaks internals or erases operable distinctions.** Current public chat deliberately maps several upstream failures to a safe 503; internal workflows additionally need typed boundaries without exposing raw payloads. | Raw exception messages reach browser/logs; all failures become “something went wrong”; retries cannot distinguish auth, rate-limit, malformed data, retrieval, generation, or source-open failure. | Maintain separate public-safe and operator-safe error DTOs; type boundary/cause/retryability/last-good state/owner; redact internals; preserve the existing public error contract unless versioned. | Error-contract fixtures, sentinel-secret injection, log review, operator recovery journeys, public API snapshots. | **Phase 2 error foundation; Phases 4 and 7 specialize.** No-go on sensitive detail leakage or un-actionable operator failure states. |
| **R-23** | P2 | **Shareable context disappears into local component state.** Filters, active episode, transcript timeline, tab, pagination, and Ask scope reset on refresh/back or open the wrong projection. | State is only `useState`; links omit filters/scope; opening/closing the current drawer loses list position/focus; public and ops graph filters share a store. | Define URL-state contracts per projection; keep public/ops stores separate; preserve safe return context and focus; validate parameters server-side against permission. | Refresh/back/deep-link tests, invalid/unauthorized parameter tests, cross-projection state isolation, focus restoration. | **Phase 1 pattern; consuming phases 3–6.** No-go for a core workflow that cannot survive refresh/back safely. |
| **R-24** | P2 | **Metrics and status aggregation become expensive or misleading at scale.** Naive joins over transcripts, assets, events, people, and observations slow the Control Room and amplify stale data. | Dashboard query count grows per card/row; N+1 source fetches; client downloads full transcripts for summaries; expensive graph/table work starts on initial public render. | Query from canonical indexed projections; precompute only versioned, provenance-bearing summaries; paginate/limit domain reads; load transcript/media detail on demand; measure before virtualizing. | Query plans/counts, fixture scale tests, route timing, memory/bundle profiles, freshness reconciliation between projection and source records. | **Phases 5–7; budget established in Phase 1.** No-go when summary performance requires dropping provenance or freshness fields. |

## Critical Pitfall Notes

### 1. Route separation is not a security boundary

Moving files into `(public)` and `(ops)` creates separate layouts without changing URL paths, but it does not authorize data. Next.js documents that authorization belongs close to the data source, with minimal DTOs, and that layout-only checks do not protect nested entry points or Server Functions. The project must therefore prove policy at queries and handlers, then test layouts as user experience rather than as the sole control.

Repository-specific concern: the current application has one root layout, no identity/session code, and publicly renders provider/model/index details. Reusing that layout for `/ops` would couple navigation, cursor/motion behavior, public copy, and potentially operator data. Reading session state in the global root can also make the protected public surface unnecessarily dynamic.

### 2. “Shared evidence” must not mean “shared response object”

Domain entities may be shared; projection DTOs, caches, search results, interaction stores, and errors may not. Leakage often occurs through secondary surfaces after the visible page appears correct. Tests must inspect RSC/network payloads, prefetches, counts, headers, source panels, error differences, and exported data—not only DOM text.

### 3. Provenance requires versioned entities and activities, not source URLs alone

The current public episode record describes published catalogue metadata and uses `video_id` throughout UI and transcript lookup. The corpus manifest records 55 episodes and 43 with timestamp sidecars, but the milestone must reconcile a broader planning inventory without treating either count as silent truth. A canonical record needs stable internal identity plus versioned external references, assets, transcripts, mappings, ingestion activities, and responsible actors.

**Inference from current ingestion:** content-hash equality prevents exact repeat work, but changed data requires stronger activation and deletion semantics. Upserting `videoId:chunkIndex` IDs alone does not prove that every active vector belongs to the same transcript version. Phase 3 should explicitly test a shorter replacement and interrupted re-index.

### 4. Accessibility debt is already visible at the migration seam

The current transcript drawer locks body scroll and handles Escape, but does not expose dialog semantics, initial focus, focus containment, inert background behavior, or focus restoration. The current canvas is operated through pointer events and continuously requests animation frames. The global stylesheet hides the native cursor on fine pointers, uses `transition: all`, and defines looping marquee/twinkle/float motion without a reduced-motion override.

Selective headless primitives are appropriate foundations, but composition can still drop required props or refs. Accessibility approval must happen at whole-journey level: open a transcript, navigate evidence, change scope, recover from an error, and return to the contributing record using keyboard and assistive semantics.

### 5. Public chat compatibility is more than response text

The browser currently POSTs message history to `/api/chat`, reads a text response body, decodes source metadata from `X-Sources`, and reads `X-Model` and `X-Fallback`. The route also uses mixed plain-text 400 responses and JSON 503 responses. Phase 1 should snapshot this exact behavior before the Knowledge phase changes response schemas. A richer internal response can be introduced behind a separate operator contract while `/api/chat` remains compatible.

The public page currently exposes a model picker and model/infrastructure language even though the server route ignores the requested model. Removing that public diagnostic is desirable, but it must be treated as an intentional narrative/UI migration with public journey tests, not bundled into an unrelated API rewrite.

## Phase Go / No-Go Gates

### Phase 1 — Compatibility and component proof harness

**Go only when:**

- Contract fixtures capture URLs, supported query strings, deep links, redirects/aliases, status codes, error bodies, content types, cache headers, chat source/model/fallback headers, and citation links for all protected routes.
- Synthetic real-shaped fixtures cover ready, loading, empty, partial, error, permission-denied, stale/offline, disabled, success, and measured-zero states without protected material.
- Token/contrast, keyboard, focus, reduced-motion, 320/768/1440 viewport, visual, axe, and route performance baselines run in CI.
- Selected package versions are pinned by the implementation phase and proven against React 19/Next.js 15; Storybook is not the only test runner.
- Named custodians exist for public contracts, design system, quality gates, privacy scans, and schema decisions.

**No-go when:** a protected route lacks a behavioral snapshot; fixtures include protected material; serious baseline accessibility defects have no explicit migration owner; or performance has no measurable budget.

### Phase 2 — Authenticated shell and policy boundary

**Go only when:**

- The role × resource × action × record × field matrix is approved and deny-by-default.
- Every protected query, Route Handler, and Server Function performs secure authorization; the shell/layout provides only an additional optimistic UX check.
- Anonymous and cross-role tests inspect DOM, RSC/API payloads, search, errors, headers, exports, prefetches, and caches.
- Session expiry/logout clears protected client state and preserves only safe return context.
- Public and ops DTOs, cache namespaces, search projections, and interaction state are separate.

**No-go when:** authorization exists only in navigation/layout code; any protected response is public-cacheable; or anonymous users can infer record existence.

### Phase 3 — Provenance spine and canonical episode workspace

**Go only when:**

- Stable internal episode IDs survive absent/replaced public identifiers and conflicting metadata.
- Source, clean-cut, and published assets are versioned; transcript and citation records identify their exact source asset/version.
- Dual-timeline mappings express verified, unmapped, conflicted, and stale states and invalidate on asset replacement.
- Unchanged, longer, shorter, interrupted, and retried ingestion fixtures produce one active consistent version with no stale chunks.
- Reconciliation reports known catalogue/operator mismatches without copying protected source material.

**No-go when:** platform IDs are canonical keys; one offset represents all timeline edits; or a timed link can render without verified timing provenance.

### Phase 4 — Knowledge receipts-to-action

**Go only when:**

- Episode/show/catalogue scope is explicit in request, response, UI, and saved evidence.
- Quoted evidence, source metadata, generated synthesis, abstention, and grounding status are structurally distinct.
- Golden evaluations prove citation grounding and 100% abstention for unsupported ownership/role claims at the approved threshold.
- A saved evidence/dossier record resolves to episode, asset, version, passage/moment, creator, and downstream references.
- `/chat` and `/api/chat` compatibility remains green.

**No-go when:** a chat blob is treated as governed knowledge; source opening loses context; or abstract/sentiment search ships without a labelled evaluation set.

### Phase 5 — Production workflow and Control Room activation

**Go only when:**

- The operator-approved stage taxonomy and legal transitions are encoded; active stages have one accountable owner.
- Board and calendar are projections of the same workflow record; shoot and publish dates stay distinct.
- Every dashboard count deep-links to exactly the contributing records and shows availability/freshness.
- Internal mutations create attributable activity and have defined confirmation/recovery behavior.

**No-go when:** cards store manual totals; summaries precede canonical workflow records; or an active stage can be silently unowned.

### Phase 6 — Analytics and People projections

**Go only when:**

- Every metric includes platform, reporting window, observation/refresh time, availability, scope, and calculation lineage where derived.
- Fixtures distinguish unavailable, stale, partial, measured zero, and populated values.
- Mention, guest, lead, team member, owner, and generated synthesis remain separate concepts.
- Sensitive fields are omitted—not merely hidden—from unauthorized HTML, payloads, search, exports, caches, and errors.

**No-go when:** an absent metric becomes zero; a trend lacks named comparison periods; or a model-derived mention creates a relationship.

### Phase 7 — Read-only integration health

**Go only when:**

- Each adapter has current source-specific contract research and a server-side read allowlist.
- Credentials/scopes cannot perform unapproved writes; crafted mutating requests fail.
- Stable source keys and idempotency tests survive duplicate delivery, timeout, partial ingest, and retry.
- Health exposes permission mode, attempt/success times, next retry, owner, and record-level coverage without paths, raw payloads, credentials, or protected identifiers.
- Last known-good evidence remains distinguishable from current failure.

**No-go when:** “read-only” is only a UI label; retries can duplicate records; or configured credentials are equated with healthy/complete data.

### Phase 8 — Migration closure

**Go only when:**

- `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` pass route/API/browser/a11y/responsive/visual/performance contracts.
- The component consumer inventory shows zero remaining consumers before each legacy class/component is removed.
- Public and ops graph/state/cache projections remain separate.
- Token lint reports no competing palette; reduced-motion and native-cursor ops behavior are verified.
- Core route axe, keyboard, focus, viewport, privacy, secret, bundle, and Lighthouse gates are blocking and green.

**No-go when:** legacy removal is based on search confidence alone; Storybook substitutes for route proof; or the public baseline regresses.

## Organizational Failure Modes and Required Owners

| Required owner | Decision rights | Earliest organizational warning | Required artifact / detection |
|---|---|---|---|
| **Public contract custodian** | Approves compatible changes to protected routes and `/api/chat` | A route/API change has no named reviewer | Versioned contract snapshots and compatibility decision record |
| **Authorization and privacy owner** | Approves roles, actions, fields, record visibility, logging/redaction | Provider selection begins before policy; “internal” is treated as sufficient classification | Role/action/field matrix, data classification, threat review, anonymous/cross-role test report |
| **Provenance/schema steward** | Owns canonical IDs, asset/timeline versions, reconciliation, schema evolution | Each module introduces its own episode/person/status key | Versioned schema, migration/reconciliation report, integrity dashboard |
| **Workflow domain owner** | Approves stages, transitions, owners, dates, blockers, and recovery | Engineers invent `todo/doing/done` or auto-assign legacy records | Operator-approved state machine and fixture sign-off |
| **Design-system maintainer** | Owns semantic tokens, primitive contracts, exceptions, migration inventory | Raw colors and one-off primitives increase after foundation | Token/consumer lint report and documented exception expiry |
| **Integration owner per source** | Owns permission mode, health, rate limits, retry, escalation | One shared “integrations team” has no source accountability | Source contract, credential-scope review, failure runbook, named alert destination |
| **Quality gatekeeper** | Owns CI blocking thresholds and release evidence | Axe/performance/visual failures become warnings | ISA-to-test matrix and signed phase gate report |

If one person holds several roles, the artifacts and decision rights still remain distinct. “The team” is not an accountable owner.

## Phase-Specific Research Flags

| Phase | Required deeper research | Why current confidence is limited |
|---|---|---|
| **2** | Identity/session provider compatibility; operator role, record, and field policy; cache behavior under the selected deployment | The repository currently has no auth implementation or final role taxonomy |
| **3** | Timeline-alignment spike, editorial correction UX, asset-version invalidation, index replacement semantics | Required behavior is clear; accuracy and correction cost are not |
| **4** | Labelled evaluation set and approved thresholds for topic/sentiment retrieval | Current cited retrieval does not validate those broader classifiers |
| **5** | Real production stage taxonomy, legal transitions, ownership, due/blocker semantics | Generic workflow labels would be an unsupported invention |
| **6** | Platform refresh/retention/comparison semantics; people consent and data classification | Source coverage and sensitive-field policy are unknown |
| **7** | Official API/scopes/rate limits/webhook/retry behavior for each selected source | Shared adapter rules cannot establish source-specific capabilities |

## Source Ledger

### Repository Evidence

| Source | Finding used | Confidence |
|---|---|---|
| `.planning/PROJECT.md` | Milestone boundary, protected routes, read-only adapter rule, evidence/privacy/accessibility invariants | HIGH |
| `DESIGN.md` | Route architecture, state completeness, component/migration contracts, semantic tokens, motion and responsive rules | HIGH |
| `ISA.md` | Atomic acceptance criteria and anti-criteria for permissions, provenance, knowledge, operations, quality, privacy, and compatibility | HIGH |
| `PRODUCT.md` | Shipping public promise, voice, committed palette/type/texture, and anti-generic constraints | HIGH |
| `.planning/research/FEATURES.md` | Eight-phase dependency order, feature gates, anti-features, and unresolved policy/source decisions | HIGH |
| `web/app/layout.tsx` | One current root/public shell, globally mounted custom cursor, and public infrastructure/model copy | HIGH |
| `web/lib/episodes.ts` and repository catalogue manifests | Current published episode contract is keyed around public video metadata; repository reports 55 episodes and 43 timestamp-backed episodes | HIGH |
| `web/components/EpisodesBrowser.tsx` | Video-ID transcript lookup, bespoke drawer, client-side transcript loading, and missing modal focus semantics | HIGH |
| `web/components/ConnectionGraph.tsx` and `web/components/DragRow.tsx` | Pointer-first canvas/drag behavior and continuous animation work requiring semantic and keyboard alternatives | HIGH |
| `web/app/chat/page.tsx` and `web/app/api/chat/route.ts` | Existing `/chat` query behavior, source-header decoding, public model UI, text response, headers, and error contract | HIGH |
| `cloudflare/src/index.ts` | Content-hash skip, deterministic vector IDs, retry flow, verified-timestamp behavior, server secret boundary, and index replacement risk | HIGH for observed code; MEDIUM for inferred stale-tail consequence until a destructive replacement fixture proves it |
| `web/app/globals.css`, `web/tailwind.config.ts`, and `web/package.json` | Hard-coded/global style roles, `transition: all`, perpetual motion with no reduced-motion rule, and no repository UI/story test scripts | HIGH |

### Current Primary Authoritative Guidance

| Source | Safeguard supported | Confidence |
|---|---|---|
| [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication) | Centralize secure authorization close to data access, return minimal DTOs, and do not rely on top-level/layout-only checks | HIGH |
| [Next.js Data Security guide](https://nextjs.org/docs/app/guides/data-security) | Keep sensitive access server-only; treat Server Functions as public endpoints requiring authorization; audit server/client boundaries | HIGH |
| [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) | Route groups do not alter URL paths; conflicting paths and multiple-root-layout navigation are migration hazards | HIGH; verified through current Context7-indexed official docs |
| [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) | Preserve Server Component boundaries, inspect client bundles, and make dynamic rendering intentional | HIGH |
| [Next.js Self-hosting and caching guidance](https://nextjs.org/docs/app/guides/self-hosting) | User-specific dynamic pages require private/no-store cache behavior; deployment/cache coordination can affect isolation | HIGH |
| [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Deny by default, least privilege, and validate permissions on every request | HIGH |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | Exclude or redact session values, tokens, credentials, sensitive personal data, and primary secrets from logs | HIGH |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/) | Provenance chains distinguish entities, activities, agents, derivations, revisions, sources, and responsibility | HIGH |
| [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Modal focus enters the dialog, remains contained, supports Escape, and returns to a logical element | HIGH for guidance; APG is informative rather than normative |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Keyboard, focus, reflow, contrast, status-message, and motion requirements are release constraints | HIGH |
| [W3C reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) | Suppress nonessential motion when reduced motion is requested | HIGH |
| [Radix composition and Dialog documentation](https://www.radix-ui.com/primitives/docs/guides/composition) | Accessible primitive behavior still depends on correct composition, prop/ref forwarding, labels, and project-level tests | HIGH; verified through current Context7-indexed official docs |
| [Storybook interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing) | Stories can exercise component interactions but complement rather than replace route, API, security, and performance proof | HIGH; current official page opened, with the design-targeted v9 material also checked through Context7 |
| [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | Safe methods are defined as essentially read-only; idempotency and safe semantics inform adapter allowlists and retry design | HIGH |

## Confidence and Unknowns

| Area | Confidence | Remaining unknown |
|---|---|---|
| Public compatibility and migration risk | HIGH | Exact supported query/header/error snapshots must be generated in Phase 1 |
| Authorization/privacy failure modes | HIGH | Final identity provider, operator roles, field classification, retention, and consent policy |
| Canonical identity/provenance | HIGH for need; MEDIUM for implementation | Merge/split policy, authoritative source precedence, schema store, correction workflow |
| Dual timelines | HIGH for risk; MEDIUM for solution | Alignment method, accuracy threshold, review cost, and invalidation granularity |
| Knowledge | HIGH for scope/citation safeguards | Approved topic/sentiment evaluation set and thresholds |
| Production/Control Room | HIGH for derivation principle | Real stage taxonomy and legal state transitions |
| Analytics/People | HIGH for truth/privacy controls | Source refresh guarantees, comparison baselines, sensitive fields, consent rules |
| Integrations | HIGH for shared safety contract; LOW per unselected source | Exact API capabilities, scopes, rate limits, webhook semantics, and retry guarantees require per-adapter research |
| Design/accessibility migration | HIGH | Final package versions must be pinned and tested in the owning phase |

## What Might Have Been Missed

- Data retention, deletion, legal hold, and subject-access policy are not defined. Phase 2/6 must decide whether any people/contact data may be stored before it is modeled.
- Multi-operator concurrent editing is deferred, but even single-record mutations need optimistic concurrency/version checks to avoid lost updates. Phase 5 should add this if real simultaneous editing is plausible.
- Backup/restore and disaster-recovery behavior for canonical provenance records is not specified. Selecting persistent storage must include restore proof before it becomes the system of record.
- The public chat source header is workable at current bounded source counts, but richer internal provenance should not be expanded indefinitely in headers; Phase 4 should design a separate typed operator response contract.
- Automated accessibility cannot validate transcript comprehension, dense table efficiency, or whether operators can identify context and next action within five seconds. Moderated first-click and keyboard walkthroughs remain necessary.
- Source adapters may have contractual or regulatory limits beyond technical scopes. Phase 7 must include owner/legal review where a selected source requires it.
