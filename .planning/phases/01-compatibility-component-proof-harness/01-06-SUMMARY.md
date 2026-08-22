---
phase: 01-compatibility-component-proof-harness
plan: "06"
status: complete
completed_at: "2026-08-22"
threat_results: "web/tests/security/phase1-threat-results/01-06.json"
---

# Plan 01-06 Summary — Performance Baseline & Budget Proposal

## Outcome

The owner-approved current application now has a reproducible five-run
performance baseline, an evidence-derived candidate budget proposal held in
`pending-owner-approval`, and a deterministic controlled-RAG timing contract.
All three owned threat rows are recorded `passed` in
`web/tests/security/phase1-threat-results/01-06.json`:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-18 | 1 | `capture-phase1-performance.mjs --check` + baseline schema probe | passed |
| T-01-19 | 2 | `test:contracts -- rag-latency.test.ts` + proposal evidence-field probe | passed |
| T-01-20 | 3 | VALIDATION.md mapping self-check | passed |

## Artifacts

- `web/scripts/capture-phase1-performance.mjs` — bounded capture collector
  (Task 1). Preflight verifies the approval receipt, compatibility-manifest
  hash, and all six protected-file hashes; removes only `web/.next`; produces
  a fresh production build; serves on an **ephemeral loopback port** with
  `CLOUDFLARE_EDGE_SHARED_SECRET` forced empty (safe local 503, zero upstream
  fetch); runs pinned-Chromium Lighthouse ×5 for each of the four protected
  UI routes with external assets blocked at both the Lighthouse and browser
  level; measures route-ready plus key interactions; writes the baseline
  atomically. `--check` mode validates schema, sample completeness,
  environment identity, and hash agreement with the receipt and current disk.
- `web/tests/performance/phase1-baseline.json` — five-run baseline (Task 1):
  Lighthouse FCP/LCP/TBT/CLS/SI/score per run per route, interaction timings,
  fresh-build bundle summary (static JS/CSS KB + per-route first-load JS),
  environment identity (Node/npm/Chromium/Lighthouse/Next/OS/viewport), and —
  appended in Task 2 — 11 normalized RAG stub samples. Raw LHR files stay in
  gitignored `lighthouse-reports/`.
- `web/tests/contracts/rag-latency.test.ts` — deterministic RAG latency
  contract (Task 2): grounded, abstention, delayed-250ms, and hanging-stub
  timeout cases around `tests/support/rag-stub.mjs`. The timeout case proves
  `AbortSignal.timeout(25_000)` fires (~25.0s observed) yielding the safe 503;
  body/chunk interpretation follows Plan 01-01's approved streaming contract.
- `web/tests/performance/phase1-budget-proposal.json` — eleven candidate budgets
  (Task 2), each citing source samples, observed max, observed range,
  headroom, unit, rationale: `route_ready_ms`, `drawer_open_ms`,
  `node_expand_ms`, `chat_safe_error_ms`, `rag_first_byte_ms`,
  `rag_total_ms`, `first_load_js_kb`, `static_js_kb`, `static_css_kb`,
  plus `lcp_ms` and `fcp_ms` added at the owner's request to close the
  structural gap. Ceilings = observed max + measured variability; no generic
  web-vitals thresholds. Status in the proposal file remains
  `pending-owner-approval` — the approval is recorded in the receipt below.
- `web/tests/performance/phase1-budgets.json` — **approved receipt** (post-plan,
  owner-authorized): status `approved`, ref
  `owner-explicit-approval-2026-08-22-performance-budget-gates-via-askuserquestion-review`,
  bound by SHA-256 to both the baseline and the proposal, carrying the RAG
  stub-scope note (budgets cover local-stub proxy overhead only; live-Worker
  latency deferred to a later plan). This closes the D-15 owner gate; the
  budgets become blocking gates when Plan 01-07 wires enforcement.
- `.planning/phases/01-compatibility-component-proof-harness/01-VALIDATION.md`
  — QUAL-06 row mapped to Plan `01-06` Wave 6 with real artifact paths and
  pending-approval status; new "Plan 01-06 Measured Performance Baseline"
  section records artifacts, measured environment, key observed ceilings, and
  threat evidence while explicitly separating measured evidence from
  owner-approved budgets. Budget-approval manual gate left pending;
  `wave_0_complete: false` and `nyquist_compliant: false` retained.

## Key measurements (evidence, not gates)

- LCP median 2185–2561 ms across routes (observed max 2630 ms on /episodes).
- FCP median ~1541–1845 ms; CLS 0 everywhere; TBT max 43 ms.
- Interactions (5-run max): drawer open 171 ms, node expand 170 ms, chat safe
  error 207 ms; route-ready DOMContentLoaded max 117 ms.
- RAG stub: grounded/abstention totals 1–20 ms; delayed-250ms 253–256 ms;
  timeout cases terminate at 25,004–25,007 ms with the safe 503.
- Bundle: static JS 949 KB, CSS 26 KB; first-load JS max 154 KB (/chat).

## Notes for next wave

- The capture script binds an ephemeral port after this plan discovered port
  4173 squatted by an unrelated project's `vite preview`, which had silently
  served that site to the earlier interaction pass. Any rerun is immune.
- Latent Plan 01-04 harness defects surfaced by the mandatory fresh build were
  fixed minimally: `stories/**`/`.storybook/**` excluded from `tsconfig.json`
  (Storybook 10 removed its root export; stories are not Next app code), and
  vitest 4's `passWithNoTests` hoisted to top-level test config.
- `web/app/page.tsx` was re-approved by explicit owner decision before capture
  (post-approval edit detected by preflight; new approval ref
  `owner-explicit-approval-2026-08-22-phase-01-rebaseline-current-worktree`,
  manifest sha256 `91af632a…`). Route.ts remained byte-identical throughout.
- Next step is Plan 01-07: wire the approved `web/tests/performance/phase1-budgets.json`
  receipt into the blocking budget gate. The owner checkpoint is CLOSED — all
  eleven budgets were approved gate-by-gate on 2026-08-22, with LCP/FCP gates
  added at the owner's request and the RAG stub-scope note recorded.
  All visual migration rows remain pending; both completion flags stay false.

## Commits

Plan 01-06 work committed 2026-08-22 under explicit owner authorization
("Approve budgets AND commit now"): see `git log --grep "01-06"`.
