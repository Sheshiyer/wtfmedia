# Tasks — WTF Media Temperance Parallel Dispatch (Turn 2+)

**Source:** DEEP-PASS-REVIEW-2026-08-21.md  
**Current Position:** Phase 01 Plan 01-04 (harness configuration)  
**Approval:** Refreshed 2026-08-21 — human approved NEXT-WAVE  
**Contract:** Turn 1 (deep pass) complete. Turn 2 = materialize artifacts. Turn 3+ = execute waves (te-swarm-s then te-dispatch-paid).

## Wave 0 Gaps (L1/L2 pre-flight — te-build)

- [ ] **L1** — Confirm dirty-worktree compatibility baseline. Record exact source authority. No unrelated mutations.  
  Acceptance: git diff --check clean on planning surface; source fingerprints match.  
  Owner: te-swarm-s / te-build  
  ID: T-REV-02

- [ ] **L2** — Package legitimacy human checkpoint. Install exact dev dependencies + Chromium only after approval. Record receipts.  
  Acceptance: `npm ls --depth=0` matches approved pins; Playwright Chromium present; no lifecycle-script approvals.  
  Owner: te-swarm-s / te-build  
  ID: T-REV-03

## Phase 01 Plan 01-04 — Deterministic Proof Harness (te-dispatch-paid)

- [ ] **01-04** — Execute Plan 01-04: ESLint, Vitest (unit/contracts/Storybook projects), Storybook (main/preview + deterministic fixtures + a11y), Playwright (production-like public routes, 320/768/1440), LHCI (CLI-only via correction ledger), privacy scanner (minimal offline for 01-04). One passing browser smoke story.  
  Acceptance: All non-watch configs; smoke passes; digest evidence for LHCI + privacy; viewports covered.  
  Files: web/eslint.config.mjs, web/vitest.config.ts, web/.storybook/*, web/stories/fixtures/public.ts, web/stories/HarnessSmoke.stories.tsx, web/playwright.config.ts, web/lighthouserc.cjs, web/tests/privacy/scan.mjs, web/tests/security/phase1-threat-results/01-04.json  
  Owner: te-dispatch-paid  
  ID: T-REV-04

## Review & Planning Artifacts (Turn 2 — te-build)

- [x] **DEEP-PASS** — Materialize .planning/DEEP-PASS-REVIEW-2026-08-21.md (already written in Turn 1)  
  ID: T-REV-00 (meta)

- [ ] **NEXT-WAVE refresh** — Update .planning/NEXT-WAVE.json and .planning/ORCHESTRATION.json with fresh approval (2026-08-21).  
  Status: Done (this file set)  
  ID: T-REV-01

- [ ] **tasks.md** — Human-readable task list from DEEP-PASS task graph.  
  Owner: te-build  
  ID: T-REV-09a

- [ ] **tasks.json** — Machine-readable task list for orchestrators.  
  Owner: te-build  
  ID: T-REV-09b

- [ ] **STATE.md update** — Advance stopped_at after review; record approval refresh.  
  Owner: te-plan  
  ID: T-REV-08

## Dual-Source Provenance Mapping (no implementation — Phases 3-4 prep)

- [ ] **PROV dual-source note** — Add or update a note (e.g. .planning/PROV-DUAL-SOURCE.md or in REQUIREMENTS) cross-referencing the Excel sheet requirement to PROV-05, PROV-10, PROV-12, PROV-13, PROV-14. Record the toggle contract, separate coordinate systems, alignment within 2s, honest unavailable states. No new executable requirements.  
  Owner: te-plan (documentation)  
  ID: T-REV-05

## Infrastructure & Data Verification (te-swarm-s parallel slices)

- [ ] **CF 9d9d inventory** — Verify Worker, Vectorize, R2, KV, Queue, DLQ presence and basic health. Confirm 55-episode corpus. Confirm proxy path (no browser CF creds).  
  ID: T-REV-06

- [ ] **Visual planning artifacts** — Confirm DESIGN.md, APP-FLOW.md, COMPONENT-INVENTORY.md committed; visuals/ moodboard + app-flow PNGs listed; no drift from GSD plans.  
  ID: T-REV-07

- [ ] **Phase boundary audit** — Confirm no Phase 2+ implementation leaked (no real /ops data, no canonical episode records, no auth wiring).  
  ID: T-REV-11

- [ ] **Timestamp coverage** — Verify 43/55 claim against corpus-manifest.json and sample vectors or R2 sidecars.  
  ID: T-REV-15

## Dispatch & Receipts

- [ ] **Dispatch receipt template** — Create .planning/dispatch/01-04-receipt.json with plan, combo, concurrency, source fingerprints, approval id.  
  ID: T-REV-13

- [ ] **Char cap discrepancy note** — Record 1,500 (docs) vs 2,000 (code) in research surface for later resolution.  
  ID: T-REV-14

- [ ] **Skill gap scan** — For transcript alignment / multi-source provenance (future Phases 3-4). Use local skill-clusters first. Record gaps + resolve path.  
  ID: T-REV-10

- [ ] **HANDOFF reconciliation** — Resolve or defer items flagged in .project/HANDOFF.md (logo asset source, deployment architecture decision, etc.).  
  Owner: human  
  ID: T-REV-12

## Later (after 01-04 acceptance)

- Resume full Phase 1 wave execution per preserved 23-plan sequence.
- Phase 2 readiness decisions (deployment, identity, roster, capability matrix).
- Explicit owner gate before Phases 3+ (dual timelines, knowledge, production, etc.).

---

**Execution Order Guidance (per PAI + GSD):**
1. Human re-approval (done).
2. te-build swarm: L1 + L2 + artifact materialization (tasks.md, tasks.json, STATE update).
3. te-dispatch-paid: Plan 01-04.
4. Verification receipts.
5. Update NEXT-WAVE for next option (01-04 or full wave).
6. Only after Phase 1 acceptance + owner signal: move to Phase 2 decisions or dual-source prep work (still planning only).

**Do Not (v1.0 invariants):**
- Install full component kits before vertical proof.
- Create real operator data or canonical records before Phase 2 acceptance.
- Mutate CF beyond shadow verification.
- Rewrite preserved 01-*-PLAN.md files.
- Begin dual-source UI or ingestion changes before Phases 3-4 gate.

**Reporting Receipts Required:** dispatch, task, verification for each wave.
