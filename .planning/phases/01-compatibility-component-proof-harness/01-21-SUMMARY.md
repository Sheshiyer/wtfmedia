---
phase: 01-compatibility-component-proof-harness
plan: "01-21"
status: complete
completed_at: "2026-08-22"
threat_results: "web/tests/security/phase1-threat-results/01-21.json"
---

# Plan 01-21 Summary — Legacy Presentation Baseline Freeze (D-12/D-14/D-16)

## Outcome

The complete pre-migration legacy presentation boundary is captured,
hash-bound, and **owner-approved** as the rollback oracle gating Plans
01-08 and 01-10. All three threat probes passed:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-65 | 1 | `capture-legacy-presentation.mjs --check` via `run-phase1-threat.mjs --plan 01-21 --task 1` | passed |
| T-01-66 | 2 | rollback spec + privacy check via `--plan 01-21 --task 2` | passed |
| T-01-67 | 3 | approved-manifest probe via `--plan 01-21 --task 3` | passed |

## What was produced

### Task 1 — dependency boundary (D-12)

`web/scripts/capture-legacy-presentation.mjs` deterministically resolves
every repository-owned presentation dependency transitively from the seven
protected roots into `web/tests/contracts/legacy-presentation-dependencies.json`
— **20 nodes** (globals.css, tailwind.config.ts, layout.tsx, 4 protected
routes, 9 shared components, 4 lib modules), SHA-256 per node, hash-bound
to the compatibility manifest `91af632a…`. Graph digest:
`891745a8d370994f…`. `--check` mode recomputes byte-exact.

### Task 2 — visual + behavioral baseline (D-14)

Dual-mode oracle `web/tests/rollback/legacy-presentation.spec.ts`:

- **Capture mode** (`PHASE1_LEGACY_CAPTURE=1`, three viewport projects):
  twelve ready-state PNGs in
  `web/tests/visual/legacy/public-routes.spec.ts-snapshots/`
  ({home,episodes,connections,chat} × {320,768,1440}), digests bound in
  `web/tests/visual/legacy/phase1-legacy-baseline.manifest.json`.
- **Verify mode** (default, any single project): snapshot-hash drift
  detection, keyboard focus reachability per route, reduced-motion census
  (legacy infinite loops frozen as evidence), chat safe-error surface,
  manifest coverage/browser/graph identity checks.
- Determinism contract: loopback-only routing (external fonts/thumbnails
  aborted — also satisfies the no-public-network measurement rule), canvas
  masked on `/connections` (rAF physics loop is not pixel-stable),
  animations disabled during capture, pinned Chromium 1234 /
  151.0.7922.34 / Playwright 1.62.1.

### Task 3 — owner approval checkpoint (D-16)

Blocking human gate satisfied by explicit AskUserQuestion review on
2026-08-22. Manifest flipped to `"approved"` with owner reference recorded;
hashes, browser identity, and coverage untouched. The spec's
manifest-binding assertion now accepts both pre/post-approval states so the
oracle stays runnable across later plans. VALIDATION.md gained:

- QUAL-06 matrix row `01-21-T1/T2/T3` (Wave 8) with real artifact paths.
- "Plan 01-21 Legacy Presentation Baseline Authority" section with the
  approval reference and the **binding rule**: migration plans must keep
  the graph check green, snapshot hashes matching, and live behavior
  intact — drift disables the run rather than being skipped.
- `wave_0_complete: false` and `nyquist_compliant: false` retained exactly
  once each in frontmatter.

**Approval reference**:
`owner-explicit-approval-2026-08-22-legacy-presentation-baseline-via-askuserquestion-review`

## Notes for next wave

- **Port workaround (reusable)**: a foreign process holds :3000 (and
  previously :4173). Prefix `PORT=4173` on any command chain that spawns
  the Playwright webServer or the threat runner — `next start` honors the
  shell env while the pinned playwright.config.ts is untouched.
- Plans 01-08 and 01-10 are now legitimately unblocked (wave 9). Their
  threat commands invoke `capture-legacy-presentation.mjs --check` and the
  rollback spec — use the same PORT prefix.
- Any mutation of the 20 presentation files invalidates the baseline and
  requires re-capture under a separately reviewed plan + fresh owner
  approval.

## Commits

Pending explicit owner instruction (per standing constraint).
