# Requirements: WTF Media — One Brain Re-foundation

**Defined:** 2026-08-19

**Core Value:** An operator can move from any episode, question, or decision to
its source asset, exact evidence, current owner, workflow state, and next action
without losing provenance.

## Execution Authorization

All ten requirement families are accepted for the v1.0 roadmap. Only the
requirements assigned to **Phase 1** and **Phase 2** may be executed first.
Phases 3–8 remain planned, not implementation-authorized, until Phases 1–2 pass
their acceptance gates and the owner explicitly proceeds.

The generated moodboard and flow board are Phase 1 design inputs. Exact routes,
permissions, components, and phase boundaries are governed by `DESIGN.md`,
`docs/design/APP-FLOW.md`, and `docs/design/COMPONENT-INVENTORY.md`.

## v1.0 Requirements

### Compatibility (`COMP`)

- [ ] **COMP-01**: A public visitor can continue using `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` throughout the migration.
- [ ] **COMP-02**: A public visitor's supported bookmarks, query parameters, filters, and episode deep links retain their meaning after route files move.
- [ ] **COMP-03**: A public Ask WTF client receives compatible request validation, streaming behavior, citation/source fields, status codes, required headers, and safe error shapes.
- [ ] **COMP-04**: An anonymous response exposes only allowlisted published fields and never enumerates internal tasks, owners, leads, budgets, briefs, health, or production state.
- [ ] **COMP-05**: A public user sees a read-only `/connections` projection that shares evidence-domain truth without sharing operator permissions or interaction state.
- [ ] **COMP-06**: A maintainer can remove a legacy public consumer only after contract, browser, accessibility, visual, privacy, performance, and rollback evidence proves its replacement.

### Design System (`DSYS`)

- [ ] **DSYS-01**: A component consumes repository-owned semantic tokens for canvas, surface, foreground, editorial, live, attention, knowledge, information, and production roles instead of raw color values.
- [ ] **DSYS-02**: A user sees the shipping WTF wordmark, committed palette, Bricolage Grotesque, Fraunces, Poppins, cream/ink dominance, tactile depth, and editorial voice preserved across migrated surfaces.
- [ ] **DSYS-03**: A user sees orange only as a provisional production-state token whose foreground pairing has passed contrast and design approval.
- [ ] **DSYS-04**: A keyboard user can operate every shipped control, overlay, selection widget, filter, table, and navigation pattern without pointer-only behavior.
- [ ] **DSYS-05**: A user can distinguish unknown, unavailable, stale, partial, empty, permission-denied, error, offline, unmapped, conflicted, and measured-zero states without relying on color alone.
- [ ] **DSYS-06**: A keyboard user always receives a visible high-contrast focus indicator and focus returns predictably after overlays close or routes change.
- [ ] **DSYS-07**: A user requesting reduced motion receives static or shortened alternatives for marquees, sparkles, drawers, transitions, charts, and other nonessential movement.
- [ ] **DSYS-08**: A user can complete each shipped workflow at 320, 768, and 1440 CSS-pixel viewport widths without hidden actions or horizontal page overflow.
- [ ] **DSYS-09**: A screen-reader user receives a semantic alternative containing equivalent meaning whenever a canvas graph, chart, timeline, or spatial board is shown.
- [ ] **DSYS-10**: A maintainer can trace each shipped component from tokens through primitives and patterns to a named consuming workflow, with deterministic stories and complete state fixtures.

### Authorization and Operator Shell (`AUTH`)

- [ ] **AUTH-01**: An approved operator can sign in through the owner-selected organization identity provider and enter `/ops` without creating a local password system.
- [ ] **AUTH-02**: An anonymous or expired session fails closed before protected data, RSC payloads, search results, prefetches, errors, or exports disclose internal entity existence.
- [ ] **AUTH-03**: An owner can approve a role-by-resource-by-action-by-record-by-field capability matrix before operator data is enabled.
- [ ] **AUTH-04**: An operator receives only records, actions, and fields allowed by server-side capability checks at every query, handler, and mutation boundary.
- [ ] **AUTH-05**: An operator sees current workspace, organization scope, system status, navigation, and dominant next action in a persistent operator shell.
- [ ] **AUTH-06**: A public and operator request use separate allowlisted DTOs, cache namespaces, search projections, and safe-error policies over shared domain services.
- [ ] **AUTH-07**: An operator whose session expires or is revoked loses protected client state and returns through a focus-safe, non-leaking recovery flow.
- [ ] **AUTH-08**: An authorized operator can view a truthful empty or unavailable Control Room before canonical workflow records exist, with no invented totals or health claims.

### Provenance (`PROV`)

- [ ] **PROV-01**: An operator can identify an episode by a stable internal ID that does not change when a platform video, title, upload, or metadata record changes.
- [ ] **PROV-02**: An operator can inspect all known external identities for an episode and see unresolved duplicates, merges, splits, and authority conflicts.
- [ ] **PROV-03**: An operator can inspect each source asset's version, content hash, authority, availability, observed time, and reconciliation state.
- [ ] **PROV-04**: An operator can distinguish transcript versions and identify which asset/version produced every passage and citation.
- [ ] **PROV-05**: An operator can navigate clean-cut and published-video time as separate coordinate systems without assuming a universal offset.
- [ ] **PROV-06**: An operator sees timeline mappings as verified, unmapped, stale, partial, or conflicted, and untimed evidence exposes no fabricated timestamp affordance.
- [ ] **PROV-07**: A citation resolves to an episode, asset version, transcript version, source span, and the correct available timeline coordinate.
- [ ] **PROV-08**: A re-ingestion stages a complete evidence version before activation and removes or tombstones obsolete chunks so mixed-version retrieval cannot occur.
- [ ] **PROV-09**: An operator can use one canonical episode workspace to move among identity, assets, transcript, timelines, citations, workflow references, and attributable activity.

### Knowledge (`KNOW`)

- [ ] **KNOW-01**: An operator can select episode, show, or catalogue scope before asking a knowledge question and can see that scope in the response.
- [ ] **KNOW-02**: An operator can distinguish quoted evidence, source metadata, model synthesis, grounding state, and failures as separate response structures.
- [ ] **KNOW-03**: An operator receives an explicit abstention when available evidence cannot support an ownership, role, timestamp, or factual claim.
- [ ] **KNOW-04**: An operator can open a cited source in its available episode, asset, transcript, passage, and timeline context.
- [ ] **KNOW-05**: An operator can save evidence or add it to a dossier without losing scope, citation, asset version, source span, or authoring provenance.
- [ ] **KNOW-06**: A maintainer can evaluate scoped retrieval, grounding, citations, abstention, and unsupported-role claims against an approved golden set before release.

### Production Flow (`FLOW`)

- [ ] **FLOW-01**: An operator can move an episode only through an approved production stage transition and receives a clear reason when a transition is invalid.
- [ ] **FLOW-02**: Every active production stage has exactly one accountable owner or is explicitly marked unowned and actionable.
- [ ] **FLOW-03**: An operator can record and distinguish shoot dates, planned publish dates, and actual publish dates.
- [ ] **FLOW-04**: Board and calendar views project the same canonical workflow record and never maintain competing stage or date truth.
- [ ] **FLOW-05**: An operator can record a blocker with status, owner, affected episode or work item, evidence, and next action.
- [ ] **FLOW-06**: A Control Room count is derived from authorized canonical records and deep-links to the exact contributors behind it.
- [ ] **FLOW-07**: An internal mutation records actor, prior state, new state, time, source, and a defined recovery or correction path.

### Analytics (`ANLY`)

- [ ] **ANLY-01**: An operator sees platform, entity scope, reporting window, and timezone for every displayed metric.
- [ ] **ANLY-02**: An operator sees observed time, refresh time, availability, and last-known-good status for every metric observation.
- [ ] **ANLY-03**: An operator can distinguish measured zero from unavailable, stale, partial, permission-denied, or failed metric data.
- [ ] **ANLY-04**: An operator can inspect calculation lineage for every derived metric or comparison.
- [ ] **ANLY-05**: An operator sees descriptive performance evidence without unsupported causal or predictive claims.

### People (`PEOP`)

- [ ] **PEOP-01**: An operator can distinguish a transcript mention, guest, lead, team member, accountable owner, and generated synthesis as different relationship types.
- [ ] **PEOP-02**: An operator can inspect evidence or authorized human confirmation for every displayed person-role relationship.
- [ ] **PEOP-03**: An operator can distinguish guest history from lead pipeline state without model-generated relationships silently becoming facts.
- [ ] **PEOP-04**: An operator receives only person fields permitted by record- and field-level visibility policy across pages, APIs, search, exports, caches, and errors.
- [ ] **PEOP-05**: An owner can inspect consent, classification, retention, deletion, and legal-hold state when policy requires it.

### Read-only Integrations (`INTG`)

- [ ] **INTG-01**: An operator can verify that an enabled source adapter exposes only an approved read-operation allowlist and cannot perform a crafted write.
- [ ] **INTG-02**: An operator sees normalized observations that retain source identity, stable external key, observed time, content hash, and reconciliation state.
- [ ] **INTG-03**: A duplicate, timeout, partial response, retry, or replay produces idempotent observations without duplicating canonical records.
- [ ] **INTG-04**: An operator sees permission mode, coverage, last attempt, last success, failure boundary, retry state, and accountable owner for each adapter.
- [ ] **INTG-05**: An operator can distinguish current failure from last-known-good data without credentials, private paths, or raw provider payloads appearing in the UI or logs.
- [ ] **INTG-06**: A source adapter cannot enter the roadmap until its current official API, scopes, limits, stable keys, retention constraints, safe methods, and owner are approved.

### Quality and Release Evidence (`QUAL`)

- [ ] **QUAL-01**: A maintainer can run one documented command set that proves lint, type checking, production build, unit tests, and component tests for the owned slice.
- [ ] **QUAL-02**: A maintainer can run blocking contract and browser journeys for every protected public route and `/api/chat` behavior.
- [ ] **QUAL-03**: A maintainer can run keyboard, focus, accessible-name, live-region, reduced-motion, and serious-axe checks for every shipped workflow.
- [ ] **QUAL-04**: A maintainer can compare deterministic 320, 768, and 1440 viewport evidence plus brand-critical visual snapshots before approving a migration.
- [ ] **QUAL-05**: A maintainer can prove synthetic fixtures, bundles, rendered payloads, logs, errors, snapshots, and planning artifacts contain no credentials, private source payloads, embedded private links, or machine-local paths.
- [ ] **QUAL-06**: A maintainer can measure and approve route performance, bundle impact, RAG latency, and interaction regressions against the recorded baseline.
- [ ] **QUAL-07**: A security reviewer can verify anonymous, cross-role, ID-tampering, cache-mixing, session-expiry, and privilege-escalation probes fail closed.
- [ ] **QUAL-08**: A maintainer can rehearse rollback and prove the previous reader, style, or route remains available until replacement evidence is accepted.

## Future Requirements

### Consequential Automation

- **AUTO-01**: An authorized operator can approve and audit an external write only after a separate source-specific permission, confirmation, idempotency, rollback, and owner gate.
- **AUTO-02**: An authorized operator can publish, schedule, message, mutate tasks, move source files, or update CRM records only in separately approved phases.

### High-risk Workflows

- **RISK-01**: An authorized specialist can execute finance, payment, contract, e-signature, identity-document, credential, or legal-retention workflows only under separately reviewed controls.

### Advanced Intelligence

- **AINT-01**: An operator can use abstract-topic or sentiment retrieval only after a labelled evaluation set and thresholds are approved.
- **AINT-02**: An operator can use predictive recommendations only when evidence, uncertainty, evaluation, and human decision ownership are explicit.
- **AINT-03**: Multiple operators can collaborate in real time only after conflict, attribution, and concurrency behavior are separately designed.

## Out of Scope

| Capability | Reason |
|---|---|
| Breaking or renaming protected public routes | The current public projection remains validated product value |
| Framework-major or Tailwind-major rewrite | It expands migration risk without advancing provenance or operator truth |
| Full pre-styled component kit | It would replace visual authorship and create a bulk migration surface |
| Microservices or replacement retrieval stack | The modular monolith and existing edge RAG boundary are sufficient for v1.0 |
| Browser-side credentials or raw provider payload persistence | Violates privacy, least privilege, and projection separation |
| Autonomous external writes in v1.0 | Evidence and read-only reconciliation must precede consequential automation |
| Generated people relationships presented as fact | Human roles require evidence or authorized confirmation |
| Missing data rendered as zero or healthy | Uncertainty and failure are product states, not empty decoration |

## Traceability

Roadmap traceability is populated after requirement approval. Every v1.0
requirement must map to exactly one phase; each roadmap phase must cite its
covered IDs and observable success criteria.

| Requirement family | Requirement count | Roadmap status |
|---|---:|---|
| COMP | 6 | Pending |
| DSYS | 10 | Pending |
| AUTH | 8 | Pending |
| PROV | 9 | Pending |
| KNOW | 6 | Pending |
| FLOW | 7 | Pending |
| ANLY | 5 | Pending |
| PEOP | 5 | Pending |
| INTG | 6 | Pending |
| QUAL | 8 | Pending |

**Coverage:**

- v1.0 requirements: 70
- Mapped to phases: 0
- Unmapped: 70 — expected until roadmap generation
- Implementation authorized now: Phase 1 and Phase 2 only

---
*Requirements defined: 2026-08-19 after owner acceptance of all recommended families and the Phase 1–2 execution cut.*
