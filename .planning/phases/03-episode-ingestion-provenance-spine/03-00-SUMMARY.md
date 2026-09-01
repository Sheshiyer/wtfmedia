# Plan 03-00 Summary: Compatibility and Branch Reconciliation

## Status

Partial gate receipt. The owner-authorized repository-local compatibility wave
is complete for the reviewed source-mode, citation, and legacy-ingest slices.
The 03-00 entry gate remains open for release-channel and authenticated-history
activation; Phase 3 is not marked complete.

## Owner decisions recorded

- Cloudflare Zero Trust Access remains the sole authentication/session
  authority.
- The Worker must resolve the normalized Access identity to one active D1
  operator with a recognized role before protected access.
- Public `/chat` and `/api/chat` remain anonymous, stateless, and compatible.
- Future authenticated history is additive behind the `/ops` authorization
  system, with an `/ops/chat` history shell, a
  `/chat/{conversation_id}-{username}` conversation deep link, and
  `/ops/api/chat/*`; there is no second WTF auth cookie or long-lived
  application token.
- The Access application and matching policy target a 720-hour (30-day)
  session to avoid daily OTP prompts, subject to global/MFA precedence proof.
- Authenticated chat may use browser-local cache with idempotent
  activity-epoch synchronization; D1 remains canonical and browser storage is
  never authorization or rollout authority.
- Authorized administrative visibility includes conversation metadata, content,
  and call history; administrative reads, exports, and lifecycle actions stay
  audited.
- Production Access configuration, remote D1 migration, deployment, queue or
  ingest mutation, secrets, DNS, and live activation were not authorized.
- Chat lifecycle is archive-only and non-destructive in this wave: no
  hard-delete or automatic purge is introduced. `admin` and `super_admin` may
  export or archive across operator scope; ordinary operator access remains
  owner-scoped. These rules are not inferred from audit-ledger policy.

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

The owner has recorded the route shape, `/ops` boundary, 720-hour Access
session target, browser-cache synchronization, authorized-admin content
visibility, archive-only lifecycle, and `admin`/`super_admin` export/archive
scope. Persistent-history and staging release-control implementation may
proceed locally behind the feature-off release gate. The local slice now
includes `0006_chat_history.sql`, `0007_release_manifest.sql`, the server
release read/write API, and the settings projection. Global/MFA session
precedence and staging pause/restore evidence remain required before any live
activation.
