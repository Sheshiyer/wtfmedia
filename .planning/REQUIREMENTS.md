# Requirements: WTF Media — One Brain Re-foundation

**Defined:** 2026-08-19
**Reconciled:** 2026-08-20 against the owner-approved client Phase 1/2 build specification (v2.0)

**Core Value:** An operator can move from any episode, question, or decision to
its source asset, exact evidence, current owner, workflow state, and next action
without losing provenance.

## Execution Authorization

All twelve requirement families are accepted for the v1.0 roadmap. Only the
requirements assigned to **Phase 1** and **Phase 2** may be executed first.
Phases 3–10 remain planned, not implementation-authorized, until Phases 1–2 pass
their acceptance gates and the owner explicitly proceeds.

Client-facing “Phase 1” and “Phase 2” are delivery tracks, not aliases for the
repository's numbered execution phases. Client Phase 1 closes across repository
Phases 2–4 after the Phase 1 proof harness; client Phase 2 closes across
repository Phases 5–9. The source document's unresolved items remain blocking
inputs and do not authorize guessed architecture, accounts, services, or spend.

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
- [ ] **AUTH-05**: An authenticated operator sees the current environment, workspace, organization scope, effective role, authorized navigation, live-derived service status, and one dominant setup action in a persistent `/ops` shell.
- [ ] **AUTH-06**: A public and operator request use separate allowlisted DTOs, cache namespaces, search projections, and safe-error policies over shared domain services.
- [ ] **AUTH-07**: An operator whose session expires or is revoked loses protected client state and returns through a focus-safe, non-leaking recovery flow.
- [ ] **AUTH-08**: An authorized operator can view a truthful empty or unavailable Control Room before canonical workflow records exist; missing systems appear as explicit unknown, offline, unavailable, or permission-denied states, never fabricated health claims or misleading zero values.
- [ ] **AUTH-09**: An admin can invite, deactivate, and assign `admin` or `editor` roles to approved WTF-only accounts, while exactly one active `super_admin` can transfer that seat through an atomic audited handoff that never leaves zero or multiple active super administrators; later roles remain non-privileged shells until activated.
- [ ] **AUTH-10**: An authorized reviewer can trace authentication outcomes, expiry/logout, protected searches, views, exports, operator/role/settings changes, purges, and super-admin handoffs to an actor, effective role, time, action, entity, outcome, environment, and correlation ID through append-only allowlisted audit metadata that excludes tokens, raw queries, prompts, responses, and private payloads; production retains 365 days, staging 30 days, local data is ephemeral, only `super_admin` and `admin` may view/export, and no expired record is silently archived.

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
- [ ] **PROV-10**: An admin can idempotently ingest the approved episode inventory from both YouTube channels with video identity, IP, channel, language, guest, content bucket, dates, duration, thumbnail, description, and chapter metadata.
- [ ] **PROV-11**: An admin can ingest WTF-supplied uncut assets through an asynchronous job whose indexed, pending, failed, and unavailable states are visible without exposing private paths.
- [ ] **PROV-12**: A transcript is stored as source-bound segments containing start, end, speaker, text, and language evidence, with the uncut ASR transcript primary and published-video timing separately represented.
- [ ] **PROV-13**: Per-episode transcript alignment converts between uncut and published-video coordinates within two seconds for ten owner-approved evaluation episodes.
- [ ] **PROV-14**: An editor can open YouTube and Uncut players at the same reconciled moment, switch sources without losing that moment, copy either timestamp, and receive an honest unavailable state when a source is missing.

### Knowledge (`KNOW`)

- [ ] **KNOW-01**: An operator can select episode, show, or catalogue scope before asking a knowledge question and can see that scope in the response.
- [ ] **KNOW-02**: An operator can distinguish quoted evidence, source metadata, model synthesis, grounding state, and failures as separate response structures.
- [ ] **KNOW-03**: An operator receives an explicit abstention when available evidence cannot support an ownership, role, timestamp, or factual claim.
- [ ] **KNOW-04**: An operator can open a cited source in its available episode, asset, transcript, passage, and timeline context.
- [ ] **KNOW-05**: An operator can save evidence or add it to a dossier without losing scope, citation, asset version, source span, or authoring provenance.
- [ ] **KNOW-06**: A maintainer can evaluate scoped retrieval, grounding, citations, abstention, and unsupported-role claims against an approved golden set before release.
- [ ] **KNOW-07**: An editor can use hybrid keyword, exact-phrase, and semantic retrieval with episode, IP, guest, channel, date, and language filters, ten-result pagination, highlighted evidence, and explicit low-confidence handling.
- [ ] **KNOW-08**: The owner-approved twenty-query editorial evaluation set places the correct moment in the top three for at least eighty percent of queries with median search latency below three seconds.
- [ ] **KNOW-09**: A researcher can begin with a guest, company, or industry and receive one ordered Snacks, Appetizers, Main Course, and Desserts brief after explicit entity disambiguation when needed.
- [ ] **KNOW-10**: A research brief combines WTF offline notes, prior guest appearances, the WTF corpus, live cited web research, and structured primary data while ranking approved human notes above web synthesis.
- [ ] **KNOW-11**: Every factual brief claim carries a working citation, podcast claims include episode and timestamp, numeric claims receive an independent verification source, and disagreements remain visible.
- [ ] **KNOW-12**: Research execution exposes parallel track status, retry isolation, and a provider-agnostic orchestration boundary; Kimi Agent Swarm remains unselected until the recorded bake-off passes citation, accuracy, latency, and cost gates.
- [ ] **KNOW-13**: A brief is editable, versioned, attached to its episode, and can regenerate one tier without regenerating the others; export remains disabled until the owner selects its target.

### Production Flow (`FLOW`)

- [ ] **FLOW-01**: An operator can move an episode only through an approved production stage transition and receives a clear reason when a transition is invalid.
- [ ] **FLOW-02**: Every active production stage has exactly one accountable owner or is explicitly marked unowned and actionable.
- [ ] **FLOW-03**: An operator can record and distinguish shoot dates, planned publish dates, and actual publish dates.
- [ ] **FLOW-04**: Board and calendar views project the same canonical workflow record and never maintain competing stage or date truth.
- [ ] **FLOW-05**: An operator can record a blocker with status, owner, affected episode or work item, evidence, and next action.
- [ ] **FLOW-06**: A Control Room count is derived from authorized canonical records and deep-links to the exact contributors behind it.
- [ ] **FLOW-07**: An internal mutation records actor, prior state, new state, time, source, and a defined recovery or correction path.
- [ ] **FLOW-08**: Authorized operators can use month, week, and IP-filtered calendar views whose shoot, post, and milestone entries link to canonical episode records and whose notification/synchronization mode is explicitly approved.

### Analytics (`ANLY`)

- [ ] **ANLY-01**: An operator sees platform, entity scope, reporting window, and timezone for every displayed metric.
- [ ] **ANLY-02**: An operator sees observed time, refresh time, availability, and last-known-good status for every metric observation.
- [ ] **ANLY-03**: An operator can distinguish measured zero from unavailable, stale, partial, permission-denied, or failed metric data.
- [ ] **ANLY-04**: An operator can inspect calculation lineage for every derived metric or comparison.
- [ ] **ANLY-05**: An operator sees descriptive performance evidence without unsupported causal or predictive claims.
- [ ] **ANLY-06**: An operator sees daily cached subscriber, view, watch-time, like, comment, per-episode, trend, and record-break observations for both approved YouTube channels without page-load API calls.
- [ ] **ANLY-07**: An operator can compare normalized YouTube, Instagram, and LinkedIn observations by platform, IP, and content bucket after each source adapter is approved.
- [ ] **ANLY-08**: Weekly summaries, monthly rollups, anomaly alerts, and record-break alerts remain viewable in-platform and are delivered only through an owner-approved channel to approved recipients.
- [ ] **ANLY-09**: Monthly AI consumption reporting attributes tokens and cost to user, feature, query, and agent run and alerts before the approved cost ceiling is exceeded.

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
- [ ] **INTG-07**: Approved YouTube Data and Analytics access for both channels is consumed server-side through a scheduled, cached, read-only adapter with observable coverage and failure state.
- [ ] **INTG-08**: Approved Instagram and LinkedIn analytics access is consumed server-side through scheduled, cached, read-only adapters that normalize observations without fabricating unavailable metrics.

### Clip Intelligence (`CLIP`)

- [ ] **CLIP-01**: A clip candidate links its episode span to topic, guest, duration, hook evidence, historical performance features, and source transcript version.
- [ ] **CLIP-02**: A newly ingested episode can produce ten ranked short-form clip candidates, each with start, end, rationale, score, and explicit uncertainty.
- [ ] **CLIP-03**: An editor can record approval or rejection feedback for each candidate and the system preserves that attributable decision for later evaluation.
- [ ] **CLIP-04**: On the owner-approved evaluation set, editorial reviewers judge at least five of ten proposed candidates worth cutting.
- [ ] **CLIP-05**: Clip suggestions are framed as a human-owned shortlist, never a virality guarantee, and remain disabled until automatic-versus-editor-triggered mode is approved.

### Quality and Release Evidence (`QUAL`)

- [ ] **QUAL-01**: A maintainer can run one documented command set that proves lint, type checking, production build, unit tests, and component tests for the owned slice.
- [ ] **QUAL-02**: A maintainer can run blocking contract and browser journeys for every protected public route and `/api/chat` behavior.
- [ ] **QUAL-03**: A maintainer can run keyboard, focus, accessible-name, live-region, reduced-motion, and serious-axe checks for every shipped workflow.
- [ ] **QUAL-04**: A maintainer can compare deterministic 320, 768, and 1440 viewport evidence plus brand-critical visual snapshots before approving a migration.
- [ ] **QUAL-05**: A maintainer can prove synthetic fixtures, bundles, rendered payloads, logs, errors, snapshots, and planning artifacts contain no credentials, private source payloads, embedded private links, or machine-local paths.
- [ ] **QUAL-06**: A maintainer can measure and approve route performance, bundle impact, RAG latency, and interaction regressions against the recorded baseline.
- [ ] **QUAL-07**: A security reviewer can verify anonymous, cross-role, ID-tampering, cache-mixing, session-expiry, and privilege-escalation probes fail closed.
- [ ] **QUAL-08**: A maintainer can rehearse rollback and prove the previous reader, style, or route remains available until replacement evidence is accepted.
- [ ] **QUAL-09**: Structured application, ingestion, search, and agent telemetry records latency, errors, tokens, and cost without storing credentials or prohibited private payloads.
- [ ] **QUAL-10**: Local, staging, and production use separate D1 databases, Cloudflare Access applications and policies, secrets, and cache namespaces; production data is never copied to a lower environment; repository-owned migrations promote forward through environments; preview deployments receive no protected backend unless explicitly bound; and the runbook defines local/environment/ingestion operation plus an explicitly scheduled staging demonstration gate.
- [ ] **QUAL-11**: Search median remains below three seconds, search p95 remains below six seconds, dashboards serve cached data, and ingestion exposes asynchronous status.
- [ ] **QUAL-12**: Guest-confidential material is protected by server-side authorization and managed, rotatable secrets that do not require source changes or repository commits.
- [ ] **QUAL-13**: Production remains blocked until staging deterministically proves the complete anonymous, expired, inactive, `editor`, `admin`, and `super_admin` authorization matrix; Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and 320/768/1440 responsive behavior; and rollback plus runbook rehearsal. These checks block CI, the owner approves the staging evidence packet, the production smoke test is read-only, and every failed or unknown gate blocks release.

### Advanced Intelligence (`AINT`)

- [ ] **AINT-01**: An operator can use abstract-topic or sentiment retrieval only after a labelled evaluation set and thresholds are approved.
- [ ] **AINT-02**: An operator can use predictive recommendations only when evidence, uncertainty, evaluation, and human decision ownership are explicit.

## Future Requirements

### Consequential Automation

- **AUTO-01**: An authorized operator can approve and audit an external write only after a separate source-specific permission, confirmation, idempotency, rollback, and owner gate.
- **AUTO-02**: An authorized operator can publish, schedule, message, mutate tasks, move source files, or update CRM records only in separately approved phases.

### High-risk Workflows

- **RISK-01**: An authorized specialist can execute finance, payment, contract, e-signature, identity-document, credential, or legal-retention workflows only under separately reviewed controls.

### Deferred Intelligence

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

Every approved v1.0 requirement maps to exactly one roadmap phase. Cross-phase
compatibility and quality exit gates persist after their owning phase, but
that persistence does not duplicate requirement ownership.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | Phase 1 | Pending |
| COMP-02 | Phase 1 | Pending |
| COMP-03 | Phase 1 | Pending |
| COMP-04 | Phase 1 | Pending |
| COMP-05 | Phase 1 | Pending |
| COMP-06 | Phase 10 | Pending |
| DSYS-01 | Phase 1 | Pending |
| DSYS-02 | Phase 1 | Pending |
| DSYS-03 | Phase 1 | Pending |
| DSYS-04 | Phase 1 | Pending |
| DSYS-05 | Phase 1 | Pending |
| DSYS-06 | Phase 1 | Pending |
| DSYS-07 | Phase 1 | Pending |
| DSYS-08 | Phase 1 | Pending |
| DSYS-09 | Phase 1 | Pending |
| DSYS-10 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| AUTH-09 | Phase 2 | Pending |
| AUTH-10 | Phase 2 | Pending |
| PROV-01 | Phase 3 | Pending |
| PROV-02 | Phase 3 | Pending |
| PROV-03 | Phase 3 | Pending |
| PROV-04 | Phase 3 | Pending |
| PROV-05 | Phase 3 | Pending |
| PROV-06 | Phase 3 | Pending |
| PROV-07 | Phase 3 | Pending |
| PROV-08 | Phase 3 | Pending |
| PROV-09 | Phase 3 | Pending |
| PROV-10 | Phase 3 | Pending |
| PROV-11 | Phase 3 | Pending |
| PROV-12 | Phase 3 | Pending |
| PROV-13 | Phase 3 | Pending |
| PROV-14 | Phase 4 | Pending |
| KNOW-01 | Phase 4 | Pending |
| KNOW-02 | Phase 4 | Pending |
| KNOW-03 | Phase 4 | Pending |
| KNOW-04 | Phase 4 | Pending |
| KNOW-05 | Phase 4 | Pending |
| KNOW-06 | Phase 4 | Pending |
| KNOW-07 | Phase 4 | Pending |
| KNOW-08 | Phase 4 | Pending |
| KNOW-09 | Phase 5 | Pending |
| KNOW-10 | Phase 5 | Pending |
| KNOW-11 | Phase 5 | Pending |
| KNOW-12 | Phase 5 | Pending |
| KNOW-13 | Phase 5 | Pending |
| FLOW-01 | Phase 6 | Pending |
| FLOW-02 | Phase 6 | Pending |
| FLOW-03 | Phase 6 | Pending |
| FLOW-04 | Phase 6 | Pending |
| FLOW-05 | Phase 6 | Pending |
| FLOW-06 | Phase 6 | Pending |
| FLOW-07 | Phase 6 | Pending |
| FLOW-08 | Phase 6 | Pending |
| ANLY-01 | Phase 8 | Pending |
| ANLY-02 | Phase 8 | Pending |
| ANLY-03 | Phase 8 | Pending |
| ANLY-04 | Phase 8 | Pending |
| ANLY-05 | Phase 8 | Pending |
| ANLY-06 | Phase 4 | Pending |
| ANLY-07 | Phase 8 | Pending |
| ANLY-08 | Phase 8 | Pending |
| ANLY-09 | Phase 8 | Pending |
| PEOP-01 | Phase 5 | Pending |
| PEOP-02 | Phase 5 | Pending |
| PEOP-03 | Phase 8 | Pending |
| PEOP-04 | Phase 8 | Pending |
| PEOP-05 | Phase 8 | Pending |
| INTG-01 | Phase 7 | Pending |
| INTG-02 | Phase 7 | Pending |
| INTG-03 | Phase 7 | Pending |
| INTG-04 | Phase 7 | Pending |
| INTG-05 | Phase 7 | Pending |
| INTG-06 | Phase 7 | Pending |
| INTG-07 | Phase 3 | Pending |
| INTG-08 | Phase 7 | Pending |
| CLIP-01 | Phase 9 | Pending |
| CLIP-02 | Phase 9 | Pending |
| CLIP-03 | Phase 9 | Pending |
| CLIP-04 | Phase 9 | Pending |
| CLIP-05 | Phase 9 | Pending |
| QUAL-01 | Phase 1 | Pending |
| QUAL-02 | Phase 1 | Pending |
| QUAL-03 | Phase 1 | Pending |
| QUAL-04 | Phase 1 | Pending |
| QUAL-05 | Phase 1 | Pending |
| QUAL-06 | Phase 1 | Pending |
| QUAL-07 | Phase 2 | Pending |
| QUAL-08 | Phase 10 | Pending |
| QUAL-09 | Phase 2 | Pending |
| QUAL-10 | Phase 2 | Pending |
| QUAL-11 | Phase 4 | Pending |
| QUAL-12 | Phase 2 | Pending |
| QUAL-13 | Phase 2 | Pending |
| AINT-01 | Phase 9 | Pending |
| AINT-02 | Phase 9 | Pending |

**Coverage:**

- v1.0 requirements: 103
- Mapped to phases: 102
- Unmapped: 0 ✓
- Duplicate mappings: 0 ✓
- Requirement families in v1.0 scope: 12/12
- Implementation authorized first: Phase 1 and Phase 2 only
- Planned / inactive: Phases 3–10 until Phases 1–2 acceptance and explicit owner authorization

---
*Requirements defined: 2026-08-19 after owner acceptance of all recommended families and the Phase 1–2 execution cut.*
