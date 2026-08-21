---
phase: 01-compatibility-component-proof-harness
plan: "03"
subsystem: testing
tags: [package-bootstrap, chromium, lhci, correction-ledger, threat-evidence]

requires:
  - phase: 01-compatibility-component-proof-harness-02
    provides: Approved exact twelve-package legitimacy receipt
provides:
  - Exact installed Phase 1 proof-harness package set and script surface
  - Installed Playwright Chromium and passing CLI/import proof
  - Auditable no-rewrite correction for CLI-only LHCI verification
affects: [phase-01-plan-04-harness-configuration, phase-01-wave-0, phase-01-verification]

tech-stack:
  added: [@types/node@22.12.0 compatibility pin]
  patterns:
    - Immutable threat definitions with separately allowlisted effective-command corrections
    - CLI packages verified through their executable interface, not invented module imports

key-files:
  created:
    - web/tests/security/phase1-threat-corrections/01-03-lhci-cli.json
    - web/tests/security/phase1-threat-results/01-03.json
    - .planning/phases/01-compatibility-component-proof-harness/01-03-SUMMARY.md
  modified:
    - web/package.json
    - web/package-lock.json
    - web/scripts/run-phase1-threat.mjs

key-decisions:
  - "Use the approved exact @types/node@22.12.0 compatibility pin required by Vite 8.2.1."
  - "Keep Plan 01-03 immutable; bind the approved LHCI CLI correction only to T-01-07 and T-01-08."

requirements-completed: [QUAL-01, QUAL-03, QUAL-04, QUAL-06, DSYS-04]

completed: 2026-08-20
---

# Phase 1 Plan 03: Proof-Harness Bootstrap Summary

**The approved exact toolchain and Chromium are installed; CLI-only LHCI proof now passes through a strict, auditable correction ledger without changing plan definitions.**

## Accomplishments

- Installed the approved twelve-package set with exact versions and the owner-approved `@types/node@22.12.0` compatibility amendment; no peer-dependency bypass was used.
- Added the planned non-watch Phase 1 script surface and installed Playwright Chromium.
- Recorded passing immutable Task 1 evidence for the exact package set.
- Preserved the failed immutable LHCI import evidence, then added a single-purpose correction ledger approved by GitHub issue #6.
- Updated the threat runner to accept only that ledger, its approval reference, two threat IDs, original command bindings, and one executable CLI probe. Task 2 now records passing effective-command evidence.

## Correction Scope

`@lhci/cli@0.15.1` exposes a `lhci` executable and deliberately has no Node module entry. The prior `require.resolve("@lhci/cli")` assertion therefore failed correctly but measured an interface the package does not provide.

The correction ledger retains each original command ID, command SHA-256, failed result, and digest-only evidence. The runner refuses unlisted correction files, unknown threat IDs, approval-reference drift, source-command drift, effective-command drift, and altered historical evidence. It executes the approved `npm exec lhci -- --version` probe alongside the remaining CLI and import checks, and stores that actual command in the mutable result fragment.

## Verification

- `node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1` — passed (`T-01-SC-INSTALL`).
- `node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 2` — passed (`T-01-07`, `T-01-08`).
- `npm --prefix web ls --depth=0` — exact direct harness dependencies and `@types/node@22.12.0` present.
- `git diff --check -- web/scripts/run-phase1-threat.mjs web/tests/security/phase1-threat-corrections/01-03-lhci-cli.json web/tests/security/phase1-threat-results/01-03.json web/package.json web/package-lock.json` — passed.

## Scope and Follow-up

- No preserved `01-*-PLAN.md` file or validation definition row changed.
- No npm lifecycle scripts were approved; no audit remediation, deployment, provider, or client-scope work ran.
- The correction mechanism is intentionally not generic. A future correction requires separate owner approval and a deliberate runner change.
- Next execution target: Plan 01-04 harness configuration.
