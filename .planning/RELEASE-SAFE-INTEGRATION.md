# WTFMedia release-safe integration program

Status: planning reconciled; bounded local compatibility/contract and staging-control wave authorized. Production is unchanged.

This document is an integration gate, not a replacement roadmap. All existing
`.planning/` research, requirements, phase folders, and `03-01` through `03-06`
plans remain retained historical/execution inputs. Nothing is deleted or
silently rewritten by this overlay.

Baseline: `origin/main` at `ee00c28`. The deployed Cloudflare Worker/OpenNext
receipt is recorded from the owner message; local Git state confirms the
baseline commit, but this document does not independently certify production.

## Reconciliation receipt — 2026-09-02

The owner re-authorized repository-local reconciliation and a bounded local
implementation wave. The following decisions remain binding:

- Cloudflare Zero Trust Access is the sole authentication/session authority.
- The Worker resolves the normalized Access identity to one active D1 operator
  with a recognized role before protected capability access.
- The shared server policy is deny-by-default; UI visibility never grants
  authority; no WTF authentication cookie or long-lived application token is
  introduced.
- Authenticated history, when activated, is additive behind the `/ops`
  authorization system, with a `/chat/{conversation_id}-{username}` deep link
  and `/ops/api/chat/*` API; the public `/chat` root and `/api/chat` remain
  anonymous, stateless, and contract-compatible.
- Production Access configuration, remote D1 migration, deployment, queue or
  ingest mutation, secrets, DNS, and live activation remain out of scope.

The owner has set a 720-hour (30-day) Access application/policy session target,
approved browser-local caching with idempotent activity-epoch synchronization,
and approved authorized-admin visibility of conversation metadata, content, and
call history. Global/MFA Access precedence still requires activation proof.
Chat lifecycle is archive-only and non-destructive in this wave: no hard-delete
or automatic purge is introduced. `admin` and `super_admin` may export or
archive across operator scope; ordinary operator access remains owner-scoped.
These rules are not copied from the audit-ledger policy. Persistent chat may
now be implemented locally behind the feature-off release gate.

### Staging toggle and rollback contract

The owner authorizes a staging-only UI toggle for exercising the authenticated
chat release. The toggle is a control-plane projection, not the authority:

- the UI reads and requests changes through an authenticated server release
  control endpoint;
- the server rechecks the active operator, environment, role, and allowed
  transition, then writes the staging release manifest and an audit event;
- the chat UI, deep link, and `/ops/api/chat/*` read the server manifest on
  every request; localStorage cannot enable, authorize, or keep the feature
  alive after a pause;
- the staging manifest has explicit `paused`, `preview`, `stable`, and
  `rolled_back` states, with `paused` as the safe default; and
- staging uses its own Access application/policy, D1 database, secrets, and
  cache namespace. No production manifest, public route, or production data
  is part of this toggle.

For the bounded wave, release-state mutation defaults to `super_admin` only.
`admin` may exercise the authorized chat/content/export/archive paths but does
not change release state unless that authority is separately confirmed. A
toggle from `stable` or `preview` to `paused` is the rollback rehearsal: it
must stop protected chat without a client update while `/chat` and `/api/chat`
remain unchanged. This reduces blast radius but does not remove the need to
retain and verify a rollback runbook.

The current `WTFMEDIA_AUTH_CHAT_RELEASE` environment seam remains a local
feature-off compatibility guard only. It is not staging evidence and must not
be presented as the implemented staging control plane.

The release manifest also carries an explicit track independent of lifecycle
state. `alpha` is the legacy/rollback target and is the safe migration default;
`beta` is the current authenticated Ask WTF implementation. Only `beta` with
`preview` or `stable` enables the protected authenticated-chat routes. The
operator track selector is additive and server-governed: it preserves chat
history, does not delete or reassign data, and does not change the anonymous
public `/chat` or `/api/chat` contracts. The public shell's existing
`WTF_PUBLIC_UI_VARIANT` compatibility selector remains unchanged until a
separate staging cutover proves the full public Alpha/Beta runtime projection.

The read-only audit found semantic drift from `origin/main` in uncut citation
projection, `both`-mode balancing, and ingest source-admission checks. It also
found overlapping preserved branches, so whole-branch cherry-picks are
prohibited. The bounded local wave restores and tests those invariants,
reconciles planning counters, and implements the authenticated-history slice
only behind the feature-off release gate; external activation remains
separately gated.

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

For `03-07`, staging exercises this manifest through the protected operator
settings surface. The evidence packet must capture the readback and audit
receipt for each state transition, plus the public-route invariance probe.

### Wave 4 — auth, RBAC, sessions, history, and memory

Cloudflare Access authenticates; D1 authorizes operators and records allowlisted
audit metadata. The additive `03-07` mini-phase may add an Access-protected
`/ops/chat` history shell plus a `/chat/{conversation_id}-{username}`
conversation deep link, with conversations keyed to server-resolved operator
IDs and persisted in D1. Separate auth session, conversation session, agent
run, and explicitly saved memory. Additive schema changes and dual-read/write
are required for migrations. Public routes remain stateless and unchanged.

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
- Alpha/Beta track selection is independent from lifecycle state, defaults to
  the safe Alpha hold, and is exercised through authenticated server readback.
- Staging pause/restore is exercised from the UI but enforced by the server
  manifest; browser storage never controls release state.
- No production data, secrets, queues, DNS, or Cloudflare bindings change.
- `.project/HANDOFF.md` records evidence and unresolved gates.
