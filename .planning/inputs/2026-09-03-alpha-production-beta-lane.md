# Alpha production baseline and Beta protected lane

Status: local integration contract. Owner clarification on 2026-09-03 keeps
authenticated per-email history in Beta while that work continues. This overlay keeps the DOCX-derived
changes on the public Alpha line and gives the existing authenticated work a
separate Beta activation surface. It does not certify a live deployment.

## Alpha — production-aligned public baseline

Alpha is the current anonymous public production experience and its safe
rollback target. It includes the selectively promoted DOCX slice from
`11f550c`:

- FB-01: the Ask WTF composer, source-mode selector, and submit action remain
  one bottom-anchored unit across supported viewports and mobile safe areas.
- FB-03: structured assistant answers render as readable Markdown/GFM and
  numeric citations resolve to exact public episode routes when an approved
  public YouTube identity exists.
- The minimal source-mode and test repairs required to keep the current
  published/uncut/both contract executable are included in the same slice.

Alpha remains anonymous and stateless at `/chat` and `/api/chat`. It does not
show authenticated conversation history, saved memory, admin metadata, or a
release-control mutation surface. Authenticated per-email history is not an
Alpha readiness gate; it remains the active Beta workstream. FB-04 correlation
and FB-05 broad visual parity remain separately planned and are not implied by
this promotion.

## Beta — protected authenticated Ask WTF lane

Beta is the existing protected implementation, activated only through the
server release manifest and only in local or isolated staging:

- Cloudflare Access verifies identity; the Worker resolves the active D1
  operator and role on every protected request.
- D1 stores operator-owned conversations and messages with idempotent writes,
  cursor reads, owner isolation, and archive-only lifecycle.
- RAG answers retain `sourceMode`, episode scope, source metadata, grounding,
  fallback state, and citations. Conversation history is not silently saved
  memory or fine-tuning data.
- `/ops/chat`, protected conversation deep links, and `/ops/settings` project
  the authenticated surface. `admin` and `super_admin` may inspect/export/
  archive within the approved policy; release mutation remains
  `super_admin` only.
- The settings UI exposes an Alpha/Beta track selector beside the lifecycle
  selector. Alpha is the safe default/legacy hold; Beta enables protected chat
  only when lifecycle state is `preview` or `stable`.

The track selector is a server-governed control-plane projection. URLs,
localStorage, client props, and environment flags cannot enable Beta, authorize
an operator, or replace the server manifest. The public Alpha `/chat` and
`/api/chat` contracts are unchanged by track selection.

## Integration and safety rules

- Promote only the DOCX commit and the narrow release-track files required for
  the selector and server gate. Do not merge `codex/alpha-beta-release-track`
  wholesale; its history has semantic drift and removes current artifacts.
- The shared checkout's uncommitted ISA/architecture refresh remains
  user-owned and is not included in this change.
- No Cloudflare Access policy, D1 migration, secret, cache namespace, queue,
  DNS record, production binding, or live deployment is changed here.
- The new `0008_release_track.sql` migration is repository-local evidence only;
  it requires an owner-approved isolated staging target before remote use.

## Beta next wave

1. Keep the isolated staging topology split into an Access-protected edge
   gateway (`wtfmedia-edge-staging.connect2nikhai.workers.dev/ops/*`) and a
   separate web origin (`wtfmedia-web-staging...`). The edge remains the only
   creator of signed operator-context headers consumed by the web origin.
2. Complete the Cloudflare Access destination edit for the staging app so it
   targets the edge gateway, while preserving the existing seven-email allow
   policy and one-month session. This is an external configuration receipt,
   not repository or production release proof.
3. Run the local authenticated matrix with Alpha hold and Beta
   preview/stable transitions, including track-only changes and
   pause/rollback. The unscoped public chat path must omit an absent
   `episodeId`, rather than serializing `null` into the answer runner.
4. Capture signed-in staging proof for operator context, release readback,
   logout-to-Alpha, reauthentication, history continuity, RAG source metadata,
   and admin visibility. Keep anonymous public probes separate.
5. Treat FB-04 as a read-only published/uncut correlation audit and FB-05 as a
   separately scoped visual review after target routes are selected.

## Acceptance boundary

This overlay is complete when the Alpha candidate is locally integrated,
Beta's server-governed track selector is tested, the current authenticated
history/RAG/admin code remains present, the edge-to-origin context boundary is
configured, and the handoff explicitly records that Beta activation remains
staging-gated while public Alpha stays unchanged.
