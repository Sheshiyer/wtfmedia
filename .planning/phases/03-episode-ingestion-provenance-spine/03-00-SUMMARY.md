# Plan 03-00 Summary: Compatibility and Branch Reconciliation

## Status

Historical partial gate receipt. The owner-authorized repository-local
compatibility wave is complete for the reviewed source-mode, citation, and
legacy-ingest slices. The 03-00 entry gate remains open and Phase 3 is not
marked complete. This summary is not authority for the later Beta 0.1
single-shell route, Clerk/D1 policy, migration state, staging, or production.

## Historical decisions and current supersession

- **[TOMBSTONED]** Cloudflare Zero Trust Access as the sole
  authentication/session authority. The current Beta authority is Clerk
  identity verified at the edge, followed by edge principal resolution and D1
  lifecycle/RBAC; Clerk claims and browser navigation never grant authority.
- **[TOMBSTONED]** The Access-normalized `/ops` identity and route contract.
  Canonical Beta entry is `/beta`: members land at `/beta/chat`, operators at
  `/beta/workspace` for the control room, and both admitted kinds can open
  `/beta/chat` for their role-safe owner-scoped history view in the same Beta
  gate/AppShell. Nested Settings stays under `/beta/settings/*`, and
  `/beta/ops/*` is redirect compatibility only. Legacy `/ops/*` and public
  `/chat` remain separate Alpha surfaces.
- Public `/chat` and `/api/chat` remain anonymous, stateless, and compatible.
- **[TOMBSTONED]** The old `/ops/chat`, username-bearing deep-link, and
  `/ops/api/chat/*` authenticated-history assumptions. Beta conversation routes
  expose only established prefixed UUIDs, and member/operator stores remain
  separately owner-scoped.
- **[DEFERRED-VERIFY]** Clerk session policy, recovery, and production
  configuration require environment-specific receipts; no historic Access
  duration/MFA target is evidence of the current configuration.
- D1 remains canonical and browser storage is never authorization or rollout
  authority.
- Authorized administrative visibility includes conversation metadata, content,
  and call history; administrative reads, exports, and lifecycle actions stay
  audited.
- **[CURRENT BOUNDARY]** Any Beta staging or production migration, deployment,
  Clerk change, queue/ingest action, secret, DNS/domain, or traffic mutation is
  governed by the Beta 0.1 production-readiness checklist, not this historical
  local-wave receipt.
- Chat lifecycle is archive-only and non-destructive in this wave: no
  hard-delete or automatic purge was introduced in this 03-00 wave. Later Beta
  permanent Delete and its owner-scoped lifecycle have separate evidence; long
  context compaction remains deferred and may not be implied by history.

## Reconciled findings

- Preserved WIP branches overlap materially; whole-branch cherry-picks remain
  prohibited. Integration is selective and file-scoped.
- Uncut citations now preserve validated Frame.io links and source identity
  when the Worker projects them; otherwise they remain truthful catalogue
  references.
- `both` retrieval now interleaves published and uncut representations within
  the citation limit rather than allowing one mode to crowd out the other.
- Legacy queue ingestion now fails closed before vector staging when the D1
  source asset is missing/unavailable or its declared R2 object is absent.
- The newer transcript consumer already had its own source-asset admission
  guard; this wave covers the legacy `cloudflare/src/index.ts` queue path.

## Local implementation and evidence

Changed only in the current checkout:

- `cloudflare/src/chat/source-mode.ts`
- `cloudflare/tests/source-mode.test.mjs`
- `cloudflare/src/index.ts`
- `cloudflare/tests/transcript-ingest.test.mjs`
- `web/app/api/chat/route.ts`
- `web/components/domain/public/SourcePanel.tsx`
- web contract fixtures and reviewed route hash manifests
- planning state, requirements accounting, ISA decisions, and handoff

Evidence:

- `npm test --prefix cloudflare` — 143/143 passed.
- `npm run test:contracts` in `web` — 86/86 passed.
- `npm run test:unit -- source-mode.test.ts` in `web` — 4/4 passed.
- `npm run typecheck` and `npm run lint` in `web` — passed.
- `git diff --check` — passed.

No production service, Access policy, D1 migration, deployment, queue, R2
object, secret, DNS record, or external branch was mutated. The failed prior
fleet receipt remains non-accepted evidence; no replacement fleet claim is
made here.

## Remaining gate

For Phase 3, this summary retains only its bounded provenance/source-mode
evidence; the canonical operator workspace, version inspection, trusted
alignment, source access, and owner authorization remain open. For Beta 0.1,
use `.planning/inputs/2026-09-11-beta-0.1-production-readiness-checklist.md`:
commit the post-merge fixes, select and test one exact candidate, capture
staging backup/migration/binding receipts, run the real Clerk/D1 IAB
persona/viewport matrix, then seek a separate production authorization. The
reported later D1/runtime result remains reported evidence until those receipts
exist.
