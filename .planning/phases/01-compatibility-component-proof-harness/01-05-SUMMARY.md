---
phase: 01-compatibility-component-proof-harness
plan: "05"
status: complete
completed_at: "2026-08-22"
threat_results: "web/tests/security/phase1-threat-results/01-05.json"
---

# Plan 01-05 Summary — Deterministic Proof Harness — Contracts

## Outcome

Public-projection, public-route, and privacy-scan contracts now prove the
existing public surfaces expose only allowlisted fields and no operator/private
vocabulary, and the compatibility Route Handler contract from Task 1 is
confirmed byte-frozen. All five owned threat rows are recorded `passed` in
`web/tests/security/phase1-threat-results/01-05.json`:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-13 | 1 | `test:contracts -- api-chat.contract.test.ts` | passed |
| T-01-15 | 1 | `test:contracts -- api-chat.contract.test.ts` | passed |
| T-01-16 | 1 | `test:contracts -- api-chat.contract.test.ts` | passed |
| T-01-14 | 2 | `test:contracts -- public-projection.contract.test.ts public-routes.contract.test.ts` + `test:privacy -- --check` | passed |
| T-01-17 | 3 | VALIDATION.md TBD/frontmatter self-check | passed |

## Artifacts

- `web/lib/public/contracts.ts` — public DTO/route allowlists, forbidden
  operator/private vocabulary, `findDisallowedFields`/`findForbiddenFields`
  helpers (Task 1; verified this plan against real on-disk data with no
  adjustment needed).
- `web/tests/support/rag-stub.mjs` — deterministic local `/v1/chat` stub (Task 1).
- `web/tests/contracts/api-chat.contract.test.ts` — 19 passing compatibility
  cases for `/api/chat`, byte-hash frozen against the owner-approved baseline (Task 1).
- `web/tests/contracts/public-projection.contract.test.ts` — proves
  `episodes.json`/`connections.json` expose only allowlisted top-level and
  nested fields, contain no forbidden vocabulary, and that the forbidden-field
  detector actually fires on injected negative cases.
- `web/tests/contracts/public-routes.contract.test.ts` — proves the
  compatibility manifest's `protected_routes` matches `PROTECTED_PUBLIC_ROUTES`,
  and that `/chat?q=` autosubmit examples parse correctly with unrelated query
  parameters preserved.
- `web/tests/privacy/scan.mjs` — extended from Storybook/fixture-only coverage
  to source (`app`, `lib`, `components`), test fixtures (`tests/contracts`,
  `tests/support`), `.planning`, and generated-artifact roots (`.next`,
  `storybook-static`, `playwright-report`, `test-results`,
  `lighthouse-reports`) when present. Adds narrow value/key-shaped categories
  (`credentialValue`, `assignedSecretLiteral` with a `dummy`-prefixed synthetic
  allowlist, `operatorKey` matched only as a quoted object key) so ordinary
  source/prose English (task, owner, production, health) no longer false-positives,
  plus `.planning`-only `driveLink`/`privateMeetingPhrase` checks (ISC-121/ISC-122).
  Filters gitignored files (e.g. `.next`'s own build-time manifests, local
  dispatch-state snapshots) out of the extended/planning scan since they are
  local, regenerable, non-shipped state rather than repository content — the
  scanner's patterns are unweakened. Passes with 0 violations across 80 files.
- `.planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md` —
  COMP-03 enriched with T-01-13..T-01-17 threat refs and marked green; COMP-04
  and QUAL-05 TBD mappings replaced with real Plan 01-05 references and marked
  green. COMP-01, COMP-02, and QUAL-02 rows left untouched (Requirement-to-Threat
  Planning Map shows no 01-05 threat ownership). `wave_0_complete: false` and
  `nyquist_compliant: false` retained.

## Truths established

- The real on-disk `episodes.json`/`connections.json` shape exactly matches
  the `contracts.ts` allowlists written in Task 1 — no drift, no adjustment.
- The privacy scanner's original 5-category/2-root behavior for
  `.storybook`/`stories/fixtures` is unchanged; the new categories are
  additive and scoped to the new roots only.
- `/api/chat` remains byte-identical to its approved compatibility baseline.

## Notes for next wave

- `web/.next` currently exists locally from a prior build and is gitignored;
  the scanner correctly skips it via the gitignore filter rather than via a
  weakened pattern — a fresh checkout without a local build will simply have
  nothing to skip there.
- Browser, visual, performance, aggregate, and rollback proof remain open —
  `wave_0_complete`/`nyquist_compliant` stay `false` until later waves close
  those gaps.
