---
phase: 01-compatibility-component-proof-harness
plan: "17"
subsystem: testing
tags: [playwright, accessibility, visual-candidates, component-trace, threat-ledger]
requires:
  - phase: 01-compatibility-component-proof-harness
    provides: migrated public routes through Plan 01-16
provides:
  - phase-wide accessibility and deterministic unapproved visual-candidate evidence
  - exact migrated-route component reachability and layer-direction manifest
  - concrete requirement-to-plan/task/wave/threat validation mappings
affects: [01-18, aggregate-verification, visual-review, owner-approval]
tech-stack:
  added: []
  patterns: [bounded stable-capture hashing, route-recomputed component trace]
key-files:
  created:
    - web/tests/component-trace.json
    - web/tests/unit/component-trace.test.ts
  modified:
    - web/tests/visual/public-routes.spec.ts
    - web/playwright.config.ts
    - web/tests/security/phase1-threat-corrections/01-17.json
    - web/tests/security/phase1-threat-results/01-17.json
    - .planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md
key-decisions:
  - "Candidate captures remain explicitly unapproved and persist outside Playwright's cleaned test-results directory."
  - "Connections candidates use the existing reduced-motion static-layout branch before capture."
  - "Component trace scope is recomputed from the four migrated protected-route entry points rather than the aspirational inventory."
patterns-established:
  - "Candidate stability: require two consecutive identical SHA-256 image hashes within a bounded retry schedule."
  - "Trace integrity: compare the manifest to a recursively discovered route import graph and reject upward layers or cycles."
requirements-completed: [COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05, DSYS-06, DSYS-07, DSYS-08, DSYS-09, DSYS-10, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06]
duration: 45min
completed: 2026-08-24
---

# Phase 1 Plan 17: Cross-route Proof Summary

**Accessibility, deterministic unapproved visual candidates, and route-recomputed component trace now close the cross-route proof gap.**

## Performance

- **Duration:** 45 min
- **Completed:** 2026-08-24T22:36:32+05:30
- **Tasks:** 3
- **Owned files created/modified:** 8

## Accomplishments

- T-01-53 and T-01-54 pass the exact Task 2 threat runner after 21 accessibility tests and 17 stable visual candidates.
- T-01-52 passes with a real component-trace manifest/test instead of Vitest's previous pass-with-no-tests false green.
- All validation requirement rows now carry concrete task, plan, wave, and threat ownership while final completion flags remain false.
- Candidate review output contains 17 privacy-safe PNGs and 17 matching JSON hash records under the ignored `web/.phase1-visual-candidates/` directory.

## Task Commits

No commits were created. The repository contains a substantial pre-existing dirty worktree, so this checkpoint leaves staging and commit ownership to the reviewing client.

## Files Created/Modified

- `web/tests/visual/public-routes.spec.ts` — candidate mode, bounded stable capture, persistent hash records, and reduced-motion Connections capture.
- `web/playwright.config.ts` — propagates the CLI candidate flag into worker metadata.
- `web/tests/security/phase1-threat-corrections/01-17.json` — binds the correction to the exact recorded superseded failure.
- `web/tests/security/phase1-threat-results/01-17.json` — records T-01-52/T-01-53/T-01-54 passing evidence.
- `web/tests/component-trace.json` — exact migrated component/story/state/consumer trace.
- `web/tests/unit/component-trace.test.ts` — verifies reachability, exports, stories, layers, cycles, and validation concreteness.
- `.planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md` — concrete requirement mappings; final flags remain false.
- `web/.gitignore` — ignores generated candidate review output.

## Decisions Made

- Candidate mode never updates or approves snapshot baselines; Plan 01-18 assembles the committed review manifest and Plan 01-19 retains owner authority.
- Generated candidates live outside `test-results/` because subsequent Playwright commands clear that directory.
- Route reachability defines “shipped” for this trace, preventing deferred inventory components from appearing as implemented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Correction ledger did not bind the actual failed result**
- **Found during:** Task 2 runner replay
- **Fix:** Replaced placeholder zero-byte superseded evidence with the exact recorded digests, sizes, and timestamp.
- **Verification:** The runner passed correction validation and executed the effective command.

**2. [Rule 1 - Bug] Candidate mode compared unapproved pixels as approved snapshots**
- **Found during:** Task 2 visual execution
- **Fix:** Propagated candidate mode via Playwright metadata and emitted bounded stable candidate images/hash records without baseline promotion.
- **Verification:** 17/17 visual candidates passed; T-01-53/T-01-54 exited zero.

**3. [Rule 2 - Missing Critical] Task 3 passed with both trace artifacts absent**
- **Found during:** Task 3 entry gate
- **Fix:** Added the manifest and a three-test integrity suite; concrete validation mappings are part of the gate.
- **Verification:** Component trace 3/3 passed; T-01-52 exited zero.

**Total deviations:** 3 auto-fixed (two blocking correctness gaps, one missing verification artifact). **Impact:** Required to prevent false acceptance; no baseline approval, cutover, deployment, or external mutation occurred.

## Issues Encountered

- Repository-wide `npm run typecheck` still reports two pre-existing test typing errors in `tests/accessibility/public-routes.spec.ts:391` and `tests/journeys/chat.spec.ts:365`. Plan 01-18's aggregate must resolve or explicitly own these before claiming a green full-phase gate.
- The advisor capability could not authenticate because its OAuth session is expired; repository evidence remained the decision authority.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-18 is the next executable plan: rollback rehearsal, aggregate/CI gate, and unapproved review packet.
- Owner visual/cutover approval remains Plan 01-19 and has not been inferred or granted.
- Repository Phase 2 remains blocked until all Phase 1 plans and acceptance gates complete.

---
*Phase: 01-compatibility-component-proof-harness*
*Completed: 2026-08-24*
