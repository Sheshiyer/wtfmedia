# Roadmap: WTF Media — One Brain Re-foundation

## Overview

WTF Media v1.0 moves from a protected public catalogue to an evidence-native
podcast operating system without sacrificing the public product that already
works. The sequence first establishes an executable compatibility and component
proof harness, then adds a deny-by-default authenticated operator shell, and
only then expands through canonical episode provenance, governed Knowledge,
production, analytics, people, read-only integrations, and consumer-by-consumer
migration closure. All ten approved requirement families are v1.0 scope.

## Execution Authorization

- **Implementation-authorized now:** Phase 1 and Phase 2 only. Work begins with
  Phase 1; Phase 2 remains authorized but depends on Phase 1 acceptance.
- **Planned and inactive:** Phases 3–8. None may enter implementation until
  Phases 1–2 pass their acceptance gates and the owner explicitly authorizes
  the next work.
- This cut is testable in each phase's `Execution authorization` field and in
  the progress table. A phase marked `Planned / inactive` is not executable.

## Milestone Invariants

- `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` remain protected
  compatibility contracts until an explicitly tested replacement or redirect
  supersedes them.
- Public and operator experiences remain separate projections over shared
  evidence. They do not share authorization policy, serialized DTOs, cache
  namespaces, search projections, safe-error policy, or interaction state.
- The public compatibility, accessibility, visual, privacy, security,
  performance, and rollback gates established in Phase 1 remain blocking exit
  gates for every later phase. This persistence does not duplicate requirement
  ownership: every requirement is mapped to exactly one phase below.
- Missing data remains visibly unknown, unavailable, stale, partial, empty,
  permission-denied, error, offline, unmapped, conflicted, or measured-zero; it
  never silently becomes a fabricated total or healthy state.

## Phases

- [ ] **Phase 1: Compatibility + Component Proof Harness** - Turn the approved design inputs and current public behavior into executable migration proof through one real public component.
- [ ] **Phase 2: Authenticated Shell + Policy Boundary** - Give approved operators a deny-by-default shell with a truthful empty or unavailable Control Room.
- [ ] **Phase 3: Provenance Spine + Canonical Episode Workspace** - Make one stable episode record the navigable source of asset, transcript, timeline, citation, and activity truth.
- [ ] **Phase 4: Knowledge Receipts-to-Action** - Let operators turn scoped, grounded evidence into saved evidence and dossiers without losing provenance.
- [ ] **Phase 5: Production Workflow + Control Room** - Make production state canonical, accountable, auditable, and reproducible from Control Room summaries.
- [ ] **Phase 6: Analytics + People** - Expose descriptive metrics and person relationships with explicit evidence, availability, lineage, and visibility policy.
- [ ] **Phase 7: Read-only Integrations** - Ingest source observations through approved, operable adapters that cannot mutate external systems.
- [ ] **Phase 8: Migration Closure** - Retire remaining legacy consumers only after replacement, rollback, and milestone-wide proof are accepted.

## Phase Details

### Phase 1: Compatibility + Component Proof Harness
**Goal**: Maintainers can migrate one real public component against executable compatibility and quality evidence while users retain the recognizable, accessible WTF public experience.
**Depends on**: Nothing (first phase)
**Execution authorization**: Authorized now; ready for discussion and planning
**Design inputs**: Approved moodboard, application flow, component inventory, and design authority
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05, DSYS-06, DSYS-07, DSYS-08, DSYS-09, DSYS-10, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. A public visitor can use `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` with supported bookmarks, queries, deep links, streaming, citations, headers, errors, and published-only fields intact.
  2. A public visitor sees a read-only connections projection that uses shared evidence truth without exposing operator permissions, state, tasks, owners, leads, budgets, briefs, health, or production data.
  3. A user can use at least one real migrated public component that preserves the WTF wordmark, typography, palette, tactile depth, and voice through repository-owned semantic tokens; only primitives consumed by that migration ship.
  4. Keyboard, focus, reduced-motion, semantic-alternative, state-distinction, and 320/768/1440 viewport behavior are observable in the migrated workflow without color-only meaning or horizontal page overflow.
  5. A maintainer can run one documented proof harness that blocks regressions in lint, types, build, component and route behavior, accessibility, visual identity, privacy, bundle and route performance, RAG latency, and protected public contracts using deterministic privacy-safe fixtures.
**Plans**: TBD
**UI hint**: yes

### Phase 2: Authenticated Shell + Policy Boundary
**Goal**: Approved operators can enter a useful but truthful `/ops` shell while server-enforced policy prevents protected data or entity existence from crossing the public boundary.
**Depends on**: Phase 1
**Execution authorization**: Authorized now; execution depends on Phase 1 acceptance
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, QUAL-07
**Success Criteria** (what must be TRUE):
  1. An approved operator can sign in through the owner-selected organization identity provider and enter `/ops` without a repository-owned password system.
  2. An owner can inspect and approve a role-by-resource-by-action-by-record-by-field capability matrix before operator records are enabled, and an operator receives only allowed records, actions, and fields.
  3. Anonymous, expired, cross-role, ID-tampering, cache-mixing, and privilege-escalation requests fail closed at server query, handler, and mutation boundaries without revealing protected entity existence.
  4. Public and operator requests use separate allowlisted DTOs, caches, search projections, errors, and client state even when they resolve through shared evidence-domain services.
  5. An operator sees workspace context, organization scope, navigation, system state, and a dominant next action in `/ops`, including a truthful empty or unavailable Control Room; logout, revocation, or expiry clears protected state through a focus-safe recovery flow.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Provenance Spine + Canonical Episode Workspace
**Goal**: Operators can navigate one canonical episode workspace whose identities, assets, transcript evidence, timelines, citations, reconciliation, and activity remain traceable and internally consistent.
**Depends on**: Phase 2 and explicit owner authorization after Phases 1–2 acceptance
**Execution authorization**: Planned / inactive — owner authorization required
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, PROV-05, PROV-06, PROV-07, PROV-08, PROV-09
**Success Criteria** (what must be TRUE):
  1. An operator can identify an episode by a stable internal ID and inspect its external identities, including unresolved duplicate, merge, split, and authority conflicts.
  2. An operator can inspect each source asset's version, content hash, authority, availability, observation time, and reconciliation state.
  3. An operator can distinguish transcript versions and trace every passage and citation to the exact episode, asset version, transcript version, and source span.
  4. An operator can navigate clean-cut and published-video coordinates independently, see verified/unmapped/stale/partial/conflicted mappings, and never receive a fabricated timestamp affordance for untimed evidence.
  5. A re-ingestion activates one complete evidence version without mixed or obsolete chunks, and the operator can move through identity, assets, transcript, timelines, citations, workflow references, reconciliation, and attributable activity in one workspace.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Knowledge Receipts-to-Action
**Goal**: Operators can ask within an explicit evidence scope, inspect grounded answers, and turn cited material into durable evidence or dossier records without provenance loss.
**Depends on**: Phase 3 and explicit owner authorization
**Execution authorization**: Planned / inactive — owner authorization required
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, KNOW-06
**Success Criteria** (what must be TRUE):
  1. An operator can choose episode, show, or catalogue scope before asking and can see the active scope in the response.
  2. An operator can distinguish quoted evidence, source metadata, model synthesis, grounding state, and failure, and receives an explicit abstention for unsupported ownership, role, timestamp, or factual claims.
  3. An operator can open a citation in its available episode, asset, transcript, passage, and timeline context.
  4. An operator can save evidence or add it to a dossier while preserving scope, citation, asset version, source span, and authoring provenance.
  5. A maintainer can run the approved golden evaluation set for scoped retrieval, grounding, citations, abstention, and unsupported-role claims before release.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Production Workflow + Control Room
**Goal**: Operators can run production from one accountable workflow record while every Control Room summary resolves to the authorized records and actions behind it.
**Depends on**: Phase 4 and explicit owner authorization
**Execution authorization**: Planned / inactive — owner authorization required
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07
**Success Criteria** (what must be TRUE):
  1. An operator can move an episode only through an approved stage transition and receives a clear reason when a transition is invalid.
  2. Every active stage has exactly one accountable owner or is visibly unowned with a valid next action.
  3. An operator can distinguish shoot, planned-publish, and actual-publish dates while board and calendar views remain projections of the same canonical workflow record.
  4. An operator can record a blocker with status, owner, affected record, evidence, and next action.
  5. Every Control Room count deep-links to its exact authorized contributors, and every internal mutation exposes actor, prior state, new state, time, source, and a defined correction or recovery path.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Analytics + People
**Goal**: Operators can inspect performance and people relationships without mistaking missing data, model synthesis, or unauthorized fields for verified fact.
**Depends on**: Phase 5 and explicit owner authorization
**Execution authorization**: Planned / inactive — owner authorization required
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, PEOP-01, PEOP-02, PEOP-03, PEOP-04, PEOP-05
**Success Criteria** (what must be TRUE):
  1. Every displayed metric names its platform, entity scope, reporting window, timezone, observed time, refresh time, availability, and last-known-good state.
  2. An operator can distinguish measured zero from unavailable, stale, partial, permission-denied, or failed metric data.
  3. An operator can inspect calculation lineage for derived metrics and sees descriptive performance evidence without unsupported causal or predictive claims.
  4. An operator can distinguish transcript mentions, guests, leads, team members, accountable owners, and generated synthesis, with evidence or authorized confirmation for every displayed role relationship.
  5. Guest history and lead pipeline remain separate, while record- and field-level policy omits unauthorized person data and exposes consent, classification, retention, deletion, or legal-hold state only when policy requires it.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Read-only Integrations
**Goal**: Operators can trust source observations and adapter health because every approved integration is read-only, idempotent, provenance-preserving, and safely operable.
**Depends on**: Phase 6 and explicit owner authorization
**Execution authorization**: Planned / inactive — owner authorization required
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, INTG-06
**Success Criteria** (what must be TRUE):
  1. An adapter enters planning only after its official API, scopes, limits, stable keys, retention constraints, safe methods, and accountable owner are approved; crafted writes through an enabled adapter fail.
  2. An operator sees normalized observations with source identity, stable external key, observed time, content hash, and reconciliation state.
  3. Duplicate, timeout, partial-response, retry, and replay cases remain idempotent and do not duplicate canonical records.
  4. An operator can inspect permission mode, coverage, last attempt, last success, failure boundary, retry state, owner, and last-known-good data without credentials, private paths, or raw provider payloads appearing in UI or logs.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Migration Closure
**Goal**: Maintainers can remove legacy public consumers only after the accepted replacement proves full compatibility, quality, privacy, performance, and recoverability.
**Depends on**: Phase 7 and explicit owner authorization
**Execution authorization**: Planned / inactive — owner authorization required
**Requirements**: COMP-06, QUAL-08
**Success Criteria** (what must be TRUE):
  1. A maintainer can show that every legacy public consumer has an accepted replacement with contract, browser, accessibility, visual, privacy, security, performance, and consumer-inventory evidence before removal.
  2. Public visitors and clients can still use `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` through the accepted implementation or an explicitly tested replacement or redirect.
  3. A maintainer can rehearse rollback and restore the previous reader, style, or route until replacement evidence is accepted.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution order:** Phase 1 → Phase 2 → owner authorization gate → Phases 3–8 in numeric order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Compatibility + Component Proof Harness | 0/TBD | Ready for discussion/planning | - |
| 2. Authenticated Shell + Policy Boundary | 0/TBD | Authorized / queued after Phase 1 | - |
| 3. Provenance Spine + Canonical Episode Workspace | 0/TBD | Planned / inactive | - |
| 4. Knowledge Receipts-to-Action | 0/TBD | Planned / inactive | - |
| 5. Production Workflow + Control Room | 0/TBD | Planned / inactive | - |
| 6. Analytics + People | 0/TBD | Planned / inactive | - |
| 7. Read-only Integrations | 0/TBD | Planned / inactive | - |
| 8. Migration Closure | 0/TBD | Planned / inactive | - |
