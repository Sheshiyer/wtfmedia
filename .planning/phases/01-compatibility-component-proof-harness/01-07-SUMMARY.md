---
phase: 01-compatibility-component-proof-harness
plan: "07"
status: complete
completed_at: "2026-08-22"
threat_results: "web/tests/security/phase1-threat-results/01-07.json"
---

# Plan 01-07 Summary — Approved Budget Authority Binding

## Outcome

The owner-approved performance budgets are now a durable, fail-closed
prerequisite for every subsequent visual plan. Both threat probes passed:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-21 | 1 | receipt schema/hash/dimension probe via `run-phase1-threat.mjs --plan 01-07 --task 1` | passed |
| T-01-22 | 2 | VALIDATION.md binding probe via `--plan 01-07 --task 2` | passed |

## What happened

### Task 1 — human checkpoint (already satisfied) + receipt restructuring

The blocking human gate was satisfied by the gate-by-gate AskUserQuestion
review of 2026-08-22 (eleven budgets approved; ref
`owner-explicit-approval-2026-08-22-performance-budget-gates-via-askuserquestion-review`).
This plan's remaining Task 1 work was representational:

- Verified the approved receipt's `baseline_sha256` and `proposal_sha256`
  still match disk before touching anything.
- Restructured `web/tests/performance/phase1-budgets.json` from a flat
  eleven-metric map into the **seven dimension groups required by immutable
  probe T-01-21**: `home`, `episodes`, `connections`, `chat`, `bundle`,
  `interactions`, `rag`.
- Every owner-approved numeric value is unchanged. Per-route groups now
  carry their own observed maxima (LCP/FCP/route-ready/first-load JS) read
  from the hash-bound baseline for fidelity.
- Added `restructuring_note`, bumped `schema_version` to 2, re-bound the
  SHA-256 hashes, embedded environment identity and the RAG stub-scope note.
- T-01-21 → `passed`.

Approved ceilings now bound per group: LCP ≤3000 ms / FCP ≤2200 ms /
route-ready ≤297 ms / first-load JS ≤204 KB per route · static JS ≤1149 KB,
CSS ≤46 KB · drawer ≤283 ms, node-expand ≤282 ms, chat-safe-error ≤264 ms ·
RAG first-byte ≤276 ms, total ≤506 ms (local-stub scope).

### Task 2 — validation binding

`.planning/phases/.../01-VALIDATION.md` updated:

- QUAL-06 verification-matrix row for Plan 01-07 Wave 7 added (T-01-21,
  T-01-22) with real artifact paths.
- New "Plan 01-07 Approved Budget Authority" section: approval reference,
  exact ceilings, threat evidence, and the **fail-closed rule** — later
  performance tests load only `phase1-budgets.json`, require
  `status === "approved"` + matching baseline/proposal SHA-256 against
  current disk + every dimension group present; any drift or missing metric
  disables the run rather than skipping the budget check.
- Manual-only "Approve numeric performance budgets" sign-off marked closed
  with the owner reference.
- `wave_0_complete: false` and `nyquist_compliant: false` retained exactly
  once each in frontmatter.
- T-01-22 → `passed`.

## Notes for next wave

- During cross-checks, all historical VALIDATION-dependent probes were
  re-run: T-01-02, T-01-03/04, T-01-05/06, T-01-17, T-01-20 pass on the
  updated document. T-01-01 (`capture-phase1-baseline.mjs --check`) is a
  **one-shot capture-window probe** by design: it requires the pre-task
  snapshot from Plan 01-01 Task 1's original execution window, which the
  protocol deletes on success. It cannot re-pass in later worktree states;
  its committed `passed` evidence in
  `web/tests/security/phase1-threat-results/01-01.json` remains authoritative.
  Historical fragments touched during diagnosis were restored byte-for-byte
  to committed state; only `01-07.json` is new.
- Next executable is Plan 01-08 per ROADMAP ordering. The budget authority
  is now binding input for any visual migration plan.

## Commits

Pending explicit owner instruction (per standing constraint).
