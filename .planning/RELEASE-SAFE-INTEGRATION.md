# WTFMedia release-safe integration program

Status: additive planning overlay and read-only audit only. Production is unchanged.

This document is an integration gate, not a replacement roadmap. All existing
`.planning/` research, requirements, phase folders, and `03-01` through `03-06`
plans remain retained historical/execution inputs. Nothing is deleted or
silently rewritten by this overlay.

Baseline: `origin/main` at `ee00c28`. The deployed Cloudflare Worker/OpenNext
receipt is recorded from the owner message; local Git state confirms the
baseline commit, but this document does not independently certify production.

## GSD sequence

### Gate 03-00 — compatibility and branch reconciliation

Freeze public route and `/api/chat` contracts. Compare each preserved WIP
commit against the baseline. Integrate only selected files or small commits;
never cherry-pick the dual-source and uncut-alignment branches wholesale. The
existing Phase 3 plans remain available behind this gate and advance only when
their prerequisites and overlap decisions are recorded.

### Wave 1 — low-risk proof inputs

- Episode retrieval contract fixture and test.
- Pure uncut sidecar parser/generator logic; publisher `--apply` remains off.
- Semantic theme fixes after dependency readiness and baseline checks.

### Wave 2 — backend contract reconciliation

Choose one source-mode parser, one citation/header DTO, and one ingest/version
contract. Preserve published-only behavior as the default. Keep uncut
alignment and dual playback unavailable until authoritative mapping and
evaluation evidence exist.

### Wave 3 — release channels and UI rollout

Use a server-governed release manifest. Stable is the default. Beta and
experimental are explicit, allowlisted cohorts. Paused and rolled_back must
disable behavior without a forced client update. Legacy remains a tested
server-side rollback.

### Wave 4 — auth, RBAC, sessions, history, and memory

Cloudflare Access authenticates; D1 authorizes operators and records allowlisted
audit metadata. The additive `03-07` mini-phase may add an Access-protected
`/ops/chat` surface whose conversations are keyed to server-resolved operator
IDs and persist in D1. Separate auth session, conversation session, agent run,
and explicitly saved memory. Additive schema changes and dual-read/write are
required for migrations. Public routes remain stateless and unchanged.

### Wave 5 — protected admin control plane

Provide scoped panels for operators/RBAC, releases/cohorts, sessions/history,
source health, models, memory governance, fine-tuning jobs, and audit. The UI
is a projection; every action is rechecked server-side.

### Wave 6 — model governance and fine-tuning

Replace the static model list/fixed fallback with an allowlisted model policy,
health/evaluation metadata, quota ceilings, fallback ordering, and pause/
rollback. Fine-tuning follows only after dataset provenance, consent, PII
redaction, privacy/grounding/citation evaluation, shadow rollout, and alias
rollback are proven.

## Fleet boundaries

The first fleet is read-only and uses isolated worker contexts. It may inspect
source, tests, planning, and branch diffs. It may not install dependencies,
write secrets, call production services, upload R2 objects, enqueue ingest,
apply D1 migrations remotely, deploy, push, or create external connections.

## Definition of done for each implementation slice

- Existing public contracts pass before and after the slice.
- New focused tests and privacy checks pass.
- Stable behavior is unchanged unless a declared contract is versioned.
- Preview can be disabled server-side and rollback is tested locally.
- No production data, secrets, queues, DNS, or Cloudflare bindings change.
- `.project/HANDOFF.md` records evidence and unresolved gates.
