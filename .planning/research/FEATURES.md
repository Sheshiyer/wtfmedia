# Feature Landscape: v1.0 One Brain Re-foundation

**Project:** WTF Media
**Domain:** Internal, evidence-native podcast operating system with a protected public catalogue projection
**Researched:** 2026-08-18
**Overall confidence:** HIGH for repository-grounded behavior; MEDIUM where role policy, source-system capability, or evaluation thresholds remain undecided

## Research Boundary

The working public catalogue is the protected baseline, not new milestone scope. Public episode discovery, available transcript reading, cited Ask WTF answers, the connections projection, and the existing WTF brand expression must remain available through `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` while operator capabilities are introduced.

Repository inspection shows why the new scope is a re-foundation rather than a navigation expansion:

- The shipping application has public pages and one root shell, but no authenticated `/ops` route family or operator authorization boundary.
- The current episode contract is a published-catalogue record. It does not yet represent stable internal identity, owners, workflow state, asset lineage, separate production/published dates, or timeline reconciliation.
- Ask WTF already returns source references and omits timestamp labels when timing is unavailable. Operator knowledge work should extend that evidence contract instead of creating a separate uncited assistant.
- Current components carry the real WTF visual language, but dense interactions are bespoke and there is no repository-owned primitive/story/accessibility test layer yet.

**Inference:** the milestone should establish shared domain contracts and policy-separated projections before expanding breadth. A dashboard over disconnected records would reproduce the fragmentation the project is intended to remove.

## Table Stakes

Missing any of these behaviors makes the internal product unsafe, untrustworthy, or incomplete. The “observable proof” column is intentionally phrased for conversion into stable requirements and browser/schema/contract tests.

### 1. Authenticated Shells and Permissions

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Public and operator experiences use visibly distinct shells and navigation. | An anonymous visit shows only catalogue destinations; a signed-in operator sees Control Room, Episodes, Knowledge, Production, Analytics, and People with the active workspace identified. | High | Route compatibility harness, identity/session contract |
| Operator routes are deny-by-default. | An anonymous request to every `/ops` page and operator API receives a sign-in or access-denied response without operational payload, counts, identifiers, or resource-existence clues. | High | Server-side authorization policy |
| Authorization is enforced on every protected server request, not only by hiding controls. | Direct requests using fixtures for each role can access only the same records/actions exposed by the UI; altering a URL or request body never broadens access. | High | Role/action matrix, record visibility rules |
| Operators can understand current identity and scope. | The shell exposes the signed-in identity, active workspace, active episode/show scope where relevant, and a sign-out/session-expired path. | Medium | Authentication implementation |
| Permission-denied and expired-session states are recoverable. | The interface explains what happened, preserves safe return context, and offers sign-in or a permitted destination without leaking protected data. | Medium | State components, redirect contract |
| Public and internal projections share evidence-domain services, not view state or policy. | A public connection/episode response cannot include internal tasks, budgets, leads, briefs, integration health, owners, or draft production state even when the same underlying episode is used internally. | High | Projection-specific DTOs and policy tests |

**Unknown requiring phase decision:** the repository does not yet establish an identity provider or final role taxonomy. Requirements should define protected resources and permitted actions first; provider selection must not substitute for that authorization design.

### 2. Control Room

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| The first viewport answers what is live, due, blocked, unowned, failing, and assigned to the current operator. | Fixture journeys show active episodes, stage counts, next shoots/publishes, blockers, unowned work, assigned work, and system failures without vanity metrics. | High | Canonical workflow records, owners, dates, integration health |
| Every summary is actionable and traceable. | Selecting a count opens the relevant workspace with equivalent URL-backed filters and the contributing records visible. | Medium | Filter contract, deep links, domain queries |
| The dashboard never fabricates completeness. | When a source is absent or stale, the card says unavailable/stale and names the source or refresh state; it does not render zero or a plausible placeholder. | Medium | Availability/freshness model |
| One dominant next action is clear. | A first-click test can identify the current context and primary action within five seconds; secondary utilities do not compete visually. | Medium | Workspace header, action policy |
| Global command search respects scope and permissions. | Search returns permitted episodes, people, and tasks; result groups name their entity type and current scope; inaccessible records are absent rather than disabled teasers. | High | Search index, authorization filters |
| Loading, empty, partial, error, offline/stale, and permission states are designed. | Component and route fixtures render each state with the next valid operator action and without layout-breaking swaps. | Medium | Shared state patterns |

**Scoping note:** ship the shell and truthful health/empty states before the full dashboard. Real operational counts become releaseable only after the provenance and workflow records that produce them exist.

### 3. Canonical Episode Workspace and Provenance

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Every episode has one stable internal identity while retaining public identifiers when present. | Re-ingestion and metadata edits resolve to the same episode record; the public video identifier can change or be absent without creating a second internal episode. | High | Identity/reconciliation rules |
| The workspace joins overview, assets, transcript, clips, brief, performance, and activity without duplicating episode truth. | Each tab/section resolves to the same episode ID and preserves list/filter return context. | High | Canonical episode schema, route contract |
| Asset lineage is explicit. | Source, clean cut, published video, audio, thumbnail, and derived assets show type, source system, readiness, last observed state, and parent asset where applicable. | High | Asset schema, read-only adapters |
| Clean-cut and published-video time are separate first-class timelines. | A transcript passage or clip shows which timeline it belongs to; switching timelines never silently reuses the other timestamp. | High | Asset-specific transcript/timing records |
| Timeline mappings carry reconciliation state. | A mapped moment shows verified/unmapped/conflicted/stale status and mapping provenance; unresolved mappings do not offer a false jump link. | Very High | Alignment algorithm or editorial sidecar, versioning |
| Citations remain honest. | Timed citations open only when the selected source has verified timing; untimed evidence remains openable in context without a guessed query parameter. | High | Citation contract, timestamp sidecars |
| Transcript navigation preserves evidence context. | Search results show speaker and surrounding text; opening a result keeps source asset and timeline visible; selection can become a scoped Ask query, evidence object, or clip candidate. | High | Transcript reader, selection model |
| Ingestion and reconciliation are repeatable. | Reprocessing unchanged input preserves content hashes and does not duplicate records; a reconciliation report lists unmatched, conflicting, and missing catalogue/operator records. | High | Idempotent ingestion, canonical keys |
| Activity history explains operational change. | Operators can see actor, time, changed field/state, reason or source, and outcome for material episode/workflow updates. | High | Audit event model |

### 4. Knowledge, Ask WTF, and Dossiers

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Retrieval scope is persistent and visible. | Ask WTF always shows whether it is searching one episode, one show/IP, or the permitted catalogue, and the operator can change scope before asking. | Medium | Scoped retrieval API, shell context |
| Evidence and synthesis are visually and structurally distinct. | Quoted/source material and generated explanation use different labels/containers in both the response schema and rendered conversation. | Medium | Response schema, ConversationThread |
| Sources stay inspectable while reading. | Every grounded claim’s citation opens the episode, asset, transcript context, and verified moment when available without losing the answer. | High | Provenance spine, source panel |
| Saving creates an explicit evidence object. | A save action produces a named record with source, passage/moment, creator, created time, scope, and downstream references; no “memory” exists only inside chat history. | High | Evidence-object schema, permissions |
| Research dossiers preserve the WTF editorial method. | A dossier validates the Snacks, Appetizers, Main Course, and Desserts sections; each claim or excerpt can resolve to evidence or be marked as an operator-authored hypothesis. | Medium | Dossier schema, evidence linking |
| Failures name the broken boundary. | Retrieval, generation, source-opening, and permission failures have distinct messages and recovery actions. | Medium | Typed error contract |
| Derived topic/sentiment search is evaluation-gated. | The feature is unavailable until a labelled set and approved precision threshold exist; results expose why they matched and never imply certainty from an unverified model label. | Very High | Labelled eval set, retrieval evaluation |

### 5. Production

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Board and calendar are projections of the same episode workflow record. | Moving or editing an authorized workflow fixture changes both views without duplicate events or stages. | High | Workflow/state model |
| Every active stage has one accountable owner, due state, blocker state, and source record. | A stage cannot enter “active” without an owner; unowned legacy records appear in an explicit reconciliation queue instead of being silently assigned. | High | People identity, workflow validation |
| Shoot and publish dates remain semantically distinct. | Calendar, filters, and episode overview label the date type; changing one never overwrites the other. | Medium | Episode date schema |
| Brief and clip work begins from evidence. | A selected passage/moment can create a draft clip candidate or brief reference containing the originating episode, asset, timeline, and source span. | High | Evidence objects, provenance spine |
| Workflow mutations are attributable and reversible where feasible. | Authorized changes create activity events and expose prior/current state; destructive actions require explicit confirmation and a defined recovery path. | High | Audit model, mutation policy |
| External systems remain evidence feeds in v1.0. | Integration-derived status is visibly read-only; no control sends a message, publishes media, moves a source asset, or mutates an external task. | Medium | Adapter permission modes |

### 6. Analytics Provenance

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Every metric names platform, reporting window, last refresh, availability, and episode/show scope. | A metric cannot render without these fields or an explicit unavailable state. | High | Metric observation schema, adapters |
| Missing, stale, partial, and zero are different states. | Fixtures render each state distinctly; an absent platform response never becomes `0`, and stale data remains labelled with its last successful refresh. | Medium | Availability/freshness semantics |
| Comparisons are explicit. | Trend UI names both periods/baselines and calculation method; an arrow never appears without the comparable values. | Medium | Comparison contract |
| Derived metrics retain calculation provenance. | Operators can inspect the inputs, transformation/version, and reporting window behind a derived value. | High | Metric lineage model |
| Performance connects back to the episode and decisions it can inform. | From a metric, an operator can open the contributing episode/platform record; unsupported causal claims are not generated from correlation alone. | High | Canonical episode links, evidence policy |

### 7. People

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Guest, lead, team member, owner, and transcript mention are distinct relationships. | A transcript mention alone never creates a guest, lead, employer, or owner assertion; changing relationship type requires authorized evidence or operator confirmation. | High | Person/relationship schema |
| Relationship summaries show their evidence. | Episode appearances, outreach state, and derived summaries link to the contributing records and identify operator-authored notes versus generated synthesis. | High | Evidence objects, activity events |
| Lead state is singular and accountable. | Each active lead has one current pipeline stage, owner, last activity, and next action; stage changes are audited. | High | Role policy, workflow model |
| Sensitive fields obey field- and record-level visibility. | Role fixtures confirm that hidden contact or sensitive fields are omitted from HTML, API payloads, exports, search results, and error details. | Very High | Authorization matrix, data classification |

### 8. Integration Health

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Every adapter reports permission mode, health, last successful sync, last attempt, next retry, and accountable owner. | The integration screen renders these fields from adapter state and does not infer “healthy” from configuration presence alone. | High | Adapter contract, health store |
| Read-only is enforced, not merely labelled. | Contract tests reject outbound/mutating operations for first-phase adapters even when a caller submits a crafted request. | High | Server-side allowlist, adapter tests |
| Failure is recoverable and scoped. | Operators can distinguish authentication, connectivity, rate limit, malformed data, and partial-ingest failures; a retry does not duplicate previously accepted data. | High | Typed errors, idempotency, retry policy |
| Health does not disclose sensitive infrastructure. | Responses and UI omit credentials, private paths, internal hostnames, raw third-party payloads, and protected identifiers. | Medium | Redaction contract, secret scanning |
| Partial source coverage is visible at record level. | An episode/asset shows which integrations supplied evidence and which are unavailable, rather than promoting workspace-level health to record-level completeness. | High | Per-record provenance |

### 9. Accessible WTF Design-System Migration

| Expected behavior | User-observable proof | Complexity | Depends on |
|---|---|---:|---|
| Repository-owned semantic tokens preserve the committed WTF identity. | Components consume purpose-named canvas, foreground, editorial, live, attention, knowledge, and information roles; token tests reject raw competing palette values. | Medium | Token schema, contrast approval |
| Accessible behavior sits beneath custom WTF styling. | Buttons, fields, select/combobox, tabs, menus, dialogs/drawers, toasts, and search meet their documented keyboard, label, focus, dismissal, and announcement contracts while retaining the brand surface. | High | Selective headless primitives, component tests |
| State completeness is a component contract. | Every applicable component story includes ready, loading, empty, partial, error, permission-denied, disabled, success, and stale/offline states. | Medium | Story fixtures, state model |
| Focus is visible and modal focus is contained/restored. | Keyboard journeys never lose visible focus; dialog/drawer focus begins inside, remains contained, closes with Escape where appropriate, and returns logically after close. | High | Primitive layer, browser tests |
| Dense interfaces remain usable across input and viewport modes. | Core journeys pass at 320px, 768px, and 1440px without page-level horizontal scroll; essential controls remain keyboard-operable and pointer targets meet the project’s 44px contract where precision cannot be assumed. | High | Responsive patterns, browser tests |
| Motion is feedback, not ambient noise. | Reduced-motion removes loops/parallax and shortens large transitions; internal status never pulses indefinitely; no essential information depends on animation. | Medium | Motion tokens, media-query tests |
| Visualizations have semantic equivalents. | The connection canvas and any future chart expose the same meaningful records through a navigable list/table alternative. | High | Accessible projection, shared query |
| URL state protects continuity. | Filters, tabs, query scope, and pagination survive refresh/back navigation where context matters. | Medium | URL-state contract |
| Migration is vertical and compatibility-tested. | A component is retired only after all consumers move and public route/API, keyboard, axe, responsive, and visual snapshots pass; each phase adds only primitives needed by its workflow slice. | High | Component inventory, contract suite |

## Differentiators

These are worth preserving as named product requirements because they distinguish One Brain from a generic podcast CMS or SaaS dashboard.

| Differentiator | Value proposition | Observable behavior | Complexity |
|---|---|---|---:|
| **Receipts become actions** | Knowledge work and production work share one evidence chain. | A transcript selection can become an Ask scope, saved evidence, clip candidate, dossier reference, or task without losing episode, asset, timeline, and source span. | Very High |
| **Dual-timeline truth** | Editors can work from clean cut while public citations remain honest to the published video. | Both timelines are visible; mappings are versioned and stateful; unmapped/conflicted moments never masquerade as verified links. | Very High |
| **One episode, many projections** | Episode context survives across production, knowledge, performance, people, and public discovery. | All internal surfaces resolve to the stable episode identity while exposing only policy-appropriate fields. | High |
| **Uncertainty as interface state** | Operators can trust the system because it shows what it does not know. | Unknown, unavailable, stale, partial, unmapped, and conflicted are first-class states instead of zeros, hidden gaps, or invented certainty. | High |
| **Evidence-native dossiers** | The WTF research method stays recognizable and inspectable. | Editorial dossier sections mix linked evidence and explicitly labelled operator hypotheses without blurring them. | Medium |
| **Operational deep links** | The Control Room accelerates work rather than summarizing it. | Counts and alerts open the exact filtered records and preserve return context. | Medium |
| **Policy-separated public and operator narratives** | Shared truth does not create shared exposure. | Public connections remain thematic and read-only; internal knowledge can add saved evidence and operational context without sharing permission or interaction state. | High |
| **WTF density without generic kit styling** | The system can become dependable daily software without losing the loud editorial identity. | Accessible primitives, tabular density, calm internal motion, semantic color, print depth, and the existing wordmark coexist in regression-tested components. | High |
| **Failure with provenance** | Integration problems become operable facts. | Health, failed boundary, last good sync, affected records, retry state, and owner are visible without exposing secrets. | High |

## Deferred Capabilities

Defer these until their dependencies, evaluation, security, or rollback authority exist. Deferral is explicit scope control, not a “coming soon” marketing surface.

| Capability | Defer until | What v1.0 does instead |
|---|---|---|
| Outbound messaging, task mutation, publishing, scheduling, or source-file movement | Separate owner-approved write threat model, least-privilege credentials, idempotency, confirmation, audit, and rollback tests | Read-only ingestion plus visible health/retry state |
| Payment execution, e-signature, government-ID storage, and credential management | Separately owned legal/security phases | Store no execution capability or sensitive identity payloads |
| Automated lead enrichment, outreach sequences, or CRM synchronization | Person consent/data-classification rules and write-adapter approval | Explicit people/relationship records with read-only evidence |
| Autonomous clip creation or publication | Verified timeline mapping, human review, media-processing/storage design, and rollback | Evidence-linked clip candidates and statuses |
| Automated dossier generation presented as fact | Source/evidence schema plus quality evaluation and operator approval | Structured dossier with evidence links and labelled hypotheses |
| Abstract-topic and sentiment retrieval | Labelled evaluation set, approved precision/recall thresholds, and explainable match UI | Existing cited retrieval plus explicit episode/show scope |
| Predictive performance or causal recommendations | Sufficient comparable observations, documented model/calculation provenance, and evaluation | Descriptive source-labelled metrics only |
| Real-time collaborative editing/presence | Conflict model, privacy review, and demonstrated operator need | Activity history and explicit ownership |
| Public `/ask` replacement or redesign of the public API contract | Tested alias/redirect and contract-equivalent response behavior | Keep `/chat` and `/api/chat` canonical |
| Public model/provider selection or infrastructure diagnostics | Never for public users; internal diagnostics require a separately permissioned support use case | Hide implementation jargon from the public narrative |
| Building the entire component catalogue up front | A vertical workflow demonstrates each required primitive and its test harness | Add primitives only as migrating screens consume them |

## Anti-Features

| Anti-feature | Why avoid it | Requirement-ready exclusion check |
|---|---|---|
| A single shell with merely hidden operator links | Client hiding is not authorization and risks data leakage. | Anonymous route/API tests prove protected fields and resource existence are omitted. |
| Fourteen equal module cards on a home page | Recreates siloed tools and obscures the dominant action. | Control Room navigation has six primary workspaces; supporting concerns remain contextual. |
| A dashboard populated with mock, inferred, or vanity counts | Produces false operational confidence. | Every displayed count resolves to contributing records and an availability/freshness state. |
| One guessed transcript timeline | Breaks citations and clip decisions when edits change timing. | Clean-cut and published timing remain distinct; unmapped passages have no timed affordance. |
| Invisible chat memory as institutional knowledge | Cannot be governed, cited, shared, or corrected. | Saved knowledge exists only as explicit evidence/dossier records with provenance. |
| Treating a transcript mention as a person relationship | Mentions do not prove role, ownership, employer, guest, or lead status. | Relationship creation requires source evidence or authorized operator confirmation. |
| Missing metrics rendered as zero | Confuses unavailable collection with measured absence. | Fixture tests distinguish unavailable, stale, partial, zero, and populated states. |
| Read-only badges over mutating adapter code | Labels are not a security boundary. | Contract tests reject every unapproved mutating adapter operation. |
| Generic pre-styled dashboard/component kit | Would replace rather than systematize the committed brand. | Visual/token regression rejects a competing palette, generic defaults, and lost wordmark/type/depth rules. |
| Pointer-only canvases, carousels, or drawers | Excludes keyboard and assistive-technology users. | Equivalent semantic views and keyboard/focus journeys are release gates. |
| Perpetual operator motion, custom cursor in ops, or color-only state | Reduces precision and accessibility in daily work. | Operator-shell tests use native cursor, reduced motion, visible focus, and text/icon status cues. |
| Big-bang route or CSS rewrite | Risks breaking current value and makes regressions hard to isolate. | Existing public contracts pass after every vertical migration; legacy styles are removed consumer by consumer. |
| Public exposure of model, provider, health, task, budget, lead, or integration internals | Violates narrative and permission boundaries. | Public schema snapshots and anonymous searches contain none of these fields. |
| Automatic production writes because evidence exists | Evidence and permission are necessary but not sufficient for consequential automation. | No external write path ships without a separately approved phase and rollback proof. |
| Private source material as fixtures or planning examples | Creates privacy and portability risk. | Repository scans reject private filenames, embedded source links, raw private text, secrets, credentials, and machine-local paths. |

## Feature Dependencies

```text
Public compatibility snapshots ─┬─> incremental public component migration
                                └─> public/operator route-group separation

Identity/session contract ─> authorization policy ─> OperatorShell
                                              ├─────> protected search
                                              ├─────> People field visibility
                                              └─────> read-only integration controls

Semantic tokens + focus/motion rules + story/browser harness
  └─> primitives ─> patterns ─> domain components ─> migrated screens

Canonical episode identity ─> asset lineage ─> transcript source records
  └─> dual timelines ─> mapping/reconciliation ─> honest citations and clips

Provenance spine ─┬─> canonical episode workspace
                  ├─> saved evidence and dossiers
                  ├─> production workflow
                  ├─> analytics lineage
                  ├─> people relationships
                  └─> per-record integration coverage

Workflow + owners + dates + integration health ─> truthful Control Room summaries
```

### Dependency Rules for Roadmapping

| Rule | Rationale |
|---|---|
| Protect public contracts before moving source files. | Next.js route groups do not change URLs, but layouts, caching, auth checks, and response DTOs can still introduce regressions. |
| Define resource/action permissions before selecting auth UI. | Authentication proves identity; it does not decide which episode, person field, or operation is allowed. |
| Establish canonical identity and provenance before building broad workspaces. | Otherwise each module invents incompatible episode/person/asset keys and requires later reconciliation. |
| Prove one timeline mapping vertical slice before scaling ingestion. | Alignment semantics, version invalidation, and editorial correction are the highest-risk data problem. |
| Create workflow records before operational dashboard metrics. | The Control Room must project truth, not become a competing manual summary store. |
| Add primitives through a real workflow, starting with the operator shell and episode workspace. | This validates keyboard, responsive, state, and brand contracts without speculative component breadth. |
| Introduce read-only adapters only after internal schemas accept provenance and partial failure. | Adapter payload shape must not become the canonical domain model. |
| Delete legacy styles/components last. | Compatibility and visual tests need both old and migrated consumers during transition. |

## Complexity Traps

| Trap | What goes wrong | Prevention / phase research flag |
|---|---|---|
| **Authentication mistaken for authorization** | Signed-in users can enumerate records or fields outside their duties. | Produce a role × resource × action × field matrix; deny by default and validate every request. **Deep research required.** |
| **Identity keys borrowed from external platforms** | Reuploads, missing public videos, or changed metadata create duplicate episodes and broken links. | Use stable internal IDs plus versioned external references and reconciliation rules. **Deep research required.** |
| **Timeline alignment treated as a numeric offset** | Cuts, inserts, intros, and revisions make later timestamps drift or conflict. | Model mapping segments and asset versions; prove verified/unmapped/conflicted/stale states on real-shaped fixtures. **Spike required.** |
| **False precision in evidence** | A source has text but not verified timing, yet the UI offers a second-specific link. | Make timing availability a schema invariant and contract-test every citation renderer. |
| **Projection leakage through secondary surfaces** | Counts, search suggestions, errors, caches, exports, or source panels expose protected operations. | Authorization-test every query path and DTO, not only pages. **Security review required.** |
| **Dashboard-first data modelling** | Summary cards become manual stores or calculate from inconsistent status labels. | Derive summaries from canonical workflow queries; keep early cards unavailable until data contracts exist. |
| **State explosion left until polish** | Partial integrations and permission differences produce contradictory or blank screens. | Define the seven state classes in component contracts and fixtures before happy-path implementation. |
| **Monolithic episode client state** | Focus, URL state, streaming, transcript selection, and tab navigation become tightly coupled and fragile. | Keep server-loaded domain data separate from leaf interaction islands; persist shareable state in URLs. |
| **Public API compatibility reduced to status 200** | Streaming behavior, headers, citations, error shape, query links, or caching change unnoticed. | Snapshot request/response contract and browser journey before route-group migration. |
| **Accessible primitive equals accessible product** | Library defaults cannot fix wrong labels, inaccessible data tables, focus loss across navigation, or canvas-only meaning. | Test complete journeys with keyboard, axe, viewport, reduced-motion, and semantic alternatives. |
| **Design tokens introduced without consumer migration rules** | Raw hex values, old globals, and new tokens coexist indefinitely with semantic drift. | Lint new code, migrate by component consumer, and remove old classes only after snapshots pass. |
| **Analytics freshness hidden behind a number** | Operators make decisions from stale or partial observations. | Require observation time, reporting window, last successful sync, and availability on every metric. |
| **People graph inferred from language models** | Mentions become unsupported role or relationship claims and expose sensitive data. | Separate mentions, evidence, operator confirmation, and generated synthesis at schema and UI levels. |
| **Adapter retries without idempotency** | Repeated sync creates duplicate tasks, assets, metrics, or evidence. | Give observations/source records stable external keys and record retry outcomes. **Adapter-specific research required.** |
| **Public and internal graphs share UI state** | A public filter or graph response starts carrying saved/internal annotations. | Share domain queries only; keep view models, caches, permissions, and interaction stores separate. |
| **Offline language without a staleness contract** | “Offline” means different things for browser connectivity, adapter failure, and old data. | Define availability states and transitions per data source before UI implementation. |

## Milestone Scoping Recommendation

Prioritize the smallest sequence that proves one complete receipts-to-action loop while keeping the public application intact:

1. **Compatibility and component proof harness**
   - Freeze public route/API/browser snapshots.
   - Add semantic tokens, focus/motion rules, representative fixtures, and only the primitives needed for a shell plus one episode slice.
   - Exit when current public behavior still passes and the new primitives have keyboard/state/visual proof.

2. **Authenticated shell and policy boundary**
   - Establish `/ops`, session behavior, deny-by-default authorization, operator navigation, permission/error states, and a truthful empty Control Room.
   - Exit when anonymous users cannot enumerate operator resources through any tested page or API.

3. **Provenance spine and canonical episode workspace**
   - Establish episode identity, asset lineage, transcript source, dual timelines, mapping state, citations, reconciliation, and activity events.
   - Prove one end-to-end episode with clean-cut and published evidence before scaling breadth.

4. **Knowledge receipts-to-action slice**
   - Add visible Ask scope, evidence/synthesis separation, in-context sources, saved evidence, and structured dossiers.
   - Exit when a transcript selection becomes a governed evidence object and a dossier reference without losing provenance.

5. **Production workflow and Control Room activation**
   - Add board/calendar projections, stages, owners, dates, blockers, clip candidates, and actionable dashboard summaries.
   - Exit when dashboard counts deep-link to the exact contributing workflow records.

6. **Analytics and People projections**
   - Add metric observation/freshness contracts and explicit person relationships with field-level visibility.
   - Defer predictive analytics and automated relationship inference.

7. **Read-only integration health**
   - Add adapters one at a time behind a shared contract for permission mode, provenance, health, retries, redaction, and idempotency.
   - Each adapter owns its source-specific contract research and failure fixtures.

8. **Migration closure**
   - Complete remaining public/internal component migration and remove legacy styles only after every consumer and compatibility test passes.

### MVP Cut Line

The milestone’s credible MVP is phases 1–5: protected public behavior, an authorized operator shell, one canonical episode/provenance spine, evidence-native knowledge, and production records that make the Control Room truthful. Analytics, People, and integrations should enter the same milestone only as bounded read-only projections over those established contracts; broad automation is explicitly deferred.

## Confidence and Open Decisions

| Area | Confidence | Basis / unresolved decision |
|---|---|---|
| Public versus operator behavior | HIGH | Explicit in project, design, ISA, and shipping route inventory |
| Canonical episode and dual timelines | HIGH for required behavior; MEDIUM for implementation complexity | Acceptance criteria are explicit; alignment method and editorial correction workflow need a spike |
| Control Room and production | HIGH | Screen contracts and provenance principle agree; exact workflow stage taxonomy remains open |
| Knowledge and dossiers | HIGH | Existing citation behavior plus explicit dossier contract; topic/sentiment thresholds remain open |
| Analytics provenance | HIGH for behavior; MEDIUM for source coverage | Availability semantics are explicit; adapter/platform fields and refresh guarantees require source-specific research |
| People permissions | HIGH for separation; MEDIUM for roles | Guest/lead distinction is explicit; role taxonomy, consent, and field classification are undecided |
| Integration health | HIGH for read-only contract; MEDIUM per adapter | Safety boundary is explicit; source APIs, rate limits, and identity keys need phase research |
| Accessible design migration | HIGH | Repository design authority, current component inspection, W3C, Radix, and Next.js primary guidance agree |

## Source Ledger

### Repository Evidence

| Source | Used for | Confidence |
|---|---|---|
| `.planning/PROJECT.md` | Milestone boundary, active/out-of-scope capabilities, protected routes, evidence and accessibility constraints | HIGH |
| `DESIGN.md` | Public/operator information architecture, screen/component/state contracts, migration order, brand and accessibility rules | HIGH |
| `ISA.md` | Atomic acceptance surface for permissions, provenance, knowledge, operations, integrations, and quality | HIGH |
| `PRODUCT.md` | Public promise, voice, palette, typography, texture, and anti-generic constraints | HIGH |
| `web/app/layout.tsx` and current route inventory | Shipping single public shell and compatibility surface | HIGH |
| `web/lib/episodes.ts` | Current published-episode contract and gaps relative to canonical operator records | HIGH |
| `web/components/EpisodesBrowser.tsx` | Current transcript/timestamp interaction and bespoke drawer migration risks | HIGH |
| `web/app/chat/page.tsx` and `web/app/api/chat/route.ts` | Current Ask WTF request/source/error behavior that migration must protect | HIGH |
| `web/components/ConnectionGraph.tsx` | Current pointer/canvas behavior motivating an equivalent semantic projection | HIGH |
| `web/app/globals.css` and `web/package.json` | Existing brand implementation, global component classes, and absence of the planned primitive/story/test layer | HIGH |

### Current Primary Guidance

| Source | Relevant conclusion | Confidence |
|---|---|---|
| [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Deny by default, least privilege, and permission validation on every request support the operator/public boundary requirements. | HIGH |
| [W3C WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Modal focus must enter the dialog, remain contained, support Escape, and return logically after close. | HIGH |
| [W3C WAI-ARIA patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) | Tabs, grids, menus, dialogs, and other composite widgets require explicit semantic and keyboard contracts. | HIGH |
| [WCAG 2.2: Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | Keyboard-operable controls require a persistent visible focus indicator. | HIGH |
| [WCAG 2.2: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | Pointer targets need minimum size/spacing; the project’s 44px control rule is a stricter product contract. | HIGH |
| [WCAG 2.2: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) | Responsive designs must preserve content and operation without two-dimensional page scrolling in ordinary layouts. | HIGH |
| [Next.js route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) | Route groups can separate layouts without changing public URLs, but conflicting paths and multi-layout navigation require migration tests. | HIGH |
| [Radix Primitives accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) and [Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | Selective headless primitives can supply focus/keyboard behavior beneath custom styling; composition still requires project-level tests. Verified through current Context7-indexed official docs. | HIGH |

## What Might Be Missing

- The exact operator roles, field classifications, and per-action permissions need a dedicated authorization workshop before implementation planning.
- The real workflow stage taxonomy and legal state transitions must be validated with operators; generic “todo/doing/done” stages would be an unsupported assumption.
- Clean-cut/published alignment may require human correction, not just automation. A spike should test edit patterns and version invalidation before schema lock.
- Each source adapter needs current official API/contract research when its phase begins; this research defines the shared read-only behavior but does not assert unsupported source capabilities.
- Analytics refresh guarantees, retention, and comparison baselines are unknown until source coverage is inventoried.
- Accessibility automation will not prove usability of transcript, table, command-search, and dense workflow journeys; keyboard and moderated first-click checks remain necessary.
