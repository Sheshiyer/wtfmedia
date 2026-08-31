# Agent onboarding

This is the fast path for a new engineer or coding agent picking up
`wtfmedia`.

## Project goal

WTFMedia turns the WTF podcast catalogue into a source-backed operating system:
catalogue browsing, episode workspaces, connection discovery, and Ask WTF. Ask
WTF must answer from retrieved transcript evidence or say when evidence is not
strong enough.

Do not promise "no hallucinations." The correct claim is narrower: the live
chat path is grounded against retrieved transcript excerpts, returns source
metadata, and has truthful fallback behavior when synthesis citations are weak.

## Current production surface

- Public domain: `https://wtfhq.in`
- Public chat route: `/api/chat`
- Chat request body: `messages: [{ role, content }]` plus `sourceMode`
- Supported source modes: `published`, `uncut`, `both`
- Response body: streamed/plain text
- Source metadata: `X-Sources` response header
- Fallback metadata: `X-Fallback` response header

The web UI reads headers before consuming the body stream. When writing tests or
manual probes, parse `X-Sources`; do not expect a JSON response body from the
production web route.

## Cloudflare resources

| Kind | Name | Purpose |
| --- | --- | --- |
| Worker | `wtfmedia-web` | Public web app and `/api/chat` route |
| Worker | `wtfmedia-edge` | Edge RAG, retrieval, inference, ingest consumer |
| R2 | `wtfmedia-catalogue` | Published transcripts, timestamp sidecars, uncut text, manifests |
| KV | `WTFMEDIA_STATE` | Ingest receipts, rate-limit windows, operational state |
| Vectorize | `wtfmedia-catalogue-v1` | 1,024-dimensional retrieval index |
| D1 | `wtfmedia-ops` | Provenance, source assets, transcript versions, chunks, jobs |
| Queue | `wtfmedia-ingest` | Transcript ingest jobs |
| Queue DLQ | `wtfmedia-ingest-dlq` | Terminal ingest failures |

Cloudflare resources are reached through bindings at runtime. Account API
tokens are operator-local and must not be committed or printed.

## Current corpus receipt

Approved/queryable corpus as of the 2026-09-01 release:

- 55 published YouTube transcript text assets.
- 43 published timestamp sidecars.
- 49 approved uncut text assets mapped to public episode IDs.
- 104 KV `ingest:` receipts: 55/55 published plus 49/49 mapped uncut.
- 11,948 Vectorize records with `source_mode` and `video_id` indexes.
- D1 provenance verifies all 49 mapped uncut assets.
- Queue backlog 0; DLQ held at its pre-release baseline of 18.

The 49-item mapping proves episode membership and evidence availability. It
does not prove trusted cross-timeline alignment, synchronized seeking, or
browser-playable uncut media.

Deferred from the clean ingestion claim:

- `WTF is a Battery?`
- `WEF - Economics`
- `The Foundery`
- `Brain Armstrong` transcript-row mismatch

Those rows can return fallback/source-adjacent answers, but they are not part
of the "fully ingested" corpus claim until their sheet/source mismatches are
resolved and receipted.

## Ingest safety rule

Transcript queue ingestion is fail-closed. Before staging vectors, the consumer
must verify that the declared D1 `source_assets` row:

- exists,
- belongs to the same episode,
- uses R2 storage,
- is marked `available`,
- and has its backing R2 object present.

If any of those checks fail, the job fails as `source_asset_unavailable`.
This prevents the earlier bad state where a Vectorize record could exist while
the expected source object receipt was missing.

## Where things live

- Web app: `web/`
- Public UI routes: `web/app/`
- Public domain components: `web/components/domain/public/`
- Chat API route: `web/app/api/chat/route.ts`
- Cloudflare worker: `cloudflare/src/index.ts`
- Source-mode logic: `cloudflare/src/chat/source-mode.ts`
- Transcript ingest consumer: `cloudflare/src/ingest/transcript-consumer.ts`
- D1 provenance helpers: `cloudflare/src/db/provenance.ts`
- D1 migrations: `cloudflare/migrations/`
- Architecture docs: `docs/architecture/`
- Live handoff receipts: `.project/HANDOFF.md`
- Planning spine: `.planning/`

## Verification commands

Use the smallest command that proves the change:

```bash
npm --prefix cloudflare test
npm --prefix cloudflare test -- transcript-ingest
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test:unit
npm --prefix web run test:contracts
npm run docs:architecture:check
npm run verify:phase3
```

For live chat smoke tests, use the production message shape and parse headers:

```bash
node - <<'NODE'
const res = await fetch('https://wtfhq.in/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    sourceMode: 'both',
    messages: [{ role: 'user', content: 'Compare the catalogue evidence on AI.' }]
  })
});
console.log(res.status, res.headers.get('x-fallback'));
console.log(decodeURIComponent(res.headers.get('x-sources') || '[]'));
console.log((await res.text()).slice(0, 240));
NODE
```

## Gated actions

Do not perform these without explicit owner approval in the current task:

- Cloudflare production deploys.
- DNS or custom-domain changes.
- Secret rotation or secret readback.
- Live ingest enqueue/replay.
- Corpus expansion from Google Drive, Frame.io, local uncut folders, or vault
  material.
- Force pushes, history rewrites, or cleanup of unrelated dirty files.

When in doubt, write the receipt and stop before the external mutation.
