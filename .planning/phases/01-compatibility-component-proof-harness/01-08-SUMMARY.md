---
phase: 01-compatibility-component-proof-harness
plan: "08"
status: complete
completed_at: "2026-08-22"
threat_results: "web/tests/security/phase1-threat-results/01-08.json"
---

# Plan 01-08 Summary — Semantic Token Layer (D-05/D-08)

## Outcome

The repository-owned WTF visual foundation now exists as one testable
semantic token source with scoped interaction policies — without moving a
single rendered pixel on the approved legacy baseline. All threat probes
passed:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-23 | 1 | `npm run test:unit -- tests/unit/tokens.test.ts` via runner task 1 | passed |
| T-01-24 | 2 | token tests + lint + typecheck + graph check + rollback spec (runner task 2) | passed |
| T-01-25 | 2 | same chain (runner task 2) | passed |

## What was produced

### Task 1 — canonical semantic tokens

- `web/styles/tokens.css`: raw palette defined once (10 approved colors);
  WCAG-AA fill pairs; typography contract (four sizes, weights 400/700,
  Fraunces editorial-only); spacing set {4,8,16,24,32,48,64}; radii;
  border/depth; layout bounds (1400px / 65ch / 72ch / 44px); z-index
  scale; two-layer focus ring geometry; motion durations/easings.
- `web/styles/themes.css`: public-context aliases only — pure `var()`
  mappings, zero new raw colors, deliberately no operator context.
- **Contrast finding encoded**: `live` #0C9367 fails AA against both
  cream (3.64) and ink (4.46), so it is declared indicator-only (dot/
  border beside ink-on-canvas text) with an explicit negative test.
- **Focus-ring finding encoded**: ink outer outline vs knowledge purple
  is 2.91:1 (<3), which is precisely why the ring is two-layer — the
  invariant tested is "every surface clears 3:1 against at least one
  adjacent ring layer".
- `web/tests/unit/tokens.test.ts`: 14 assertions — uniqueness, palette
  closure, typography/spacing contracts, computed contrast, production
  single-definition, zero migrated-public `production` consumers.

### Task 2 — scoped wiring (zero pixel drift)

- `web/styles/motion.css`: every rule scoped under
  `[data-public-ui-variant="migrated"]` — two-layer focus-visible ring,
  native-cursor guarantee, immediate reduced-motion kill of loops/smooth-
  scroll/transitions, token-driven transition variables. No legacy
  declaration touched or overridden outside the subtree.
- `web/app/globals.css`: additive `@import`s only (3 lines).
- `web/tailwind.config.ts`: new `wtf.*` aliases resolving through CSS
  custom properties (`var(--wtf-*)`) — no duplicate hex values; all
  legacy keys preserved byte-for-byte.

### Consequential deviations (disclosed)

1. **Dependency graph re-baseline**: importing the styles layer grows the
   frozen presentation graph from 20 → 23 nodes (new role
   `semantic-token-layer` in `capture-legacy-presentation.mjs`). Artifact
   regenerated; new digest `6a4e9ef3195f…`; manifest's
   `dependency_graph_sha256` rebound accordingly. The immutable threat
   commands were never edited.
2. **Rollback spec hardening**: manifest type gained optional
   `owner_approval_ref`; assertion accepts both approval states (carried
   from Plan 01-21 Task 3).
3. **Pixel identity proven**: full rollback oracle re-run after rebuild —
   all 12 committed snapshot hashes match; 10 passed / 8 viewport-skipped.

## Notes for next wave

- Migrated surfaces opt in by rendering
  `data-public-ui-variant="migrated"` on their root; nothing opts in yet,
  so production routes remain visually legacy until Plans 01-09/01-10.
- The migrated-consumer scan (`tokens.test.ts`) enforces zero
  `production` consumers until owner visual approval.
- Reusable: `PORT=4173` prefix required for any runner/playwright chain
  while foreign processes hold :3000.

## Commits

Pending explicit owner instruction (per standing constraint).
