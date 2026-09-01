# Cloudflare backend reconciliation

**Status:** read-only `9d9d` account inventory and local-only deployment-safety hardening. This records deployed Workers, declared bindings, and account resources. It does not create, delete, bind, migrate, upload, deploy, rotate, or expose a credential.

## What is actually deployed

| Surface | Deployed evidence | Current state |
| --- | --- | --- |
| `wtfmedia-web` | Current OpenNext deployment has `ASSETS`, `IMAGES`, self-reference, and the `WTFMEDIA_EDGE` service binding. | Public preview is deployed. Its secret inventory is empty, so `/api/chat` correctly remains safe-unconfigured. |
| `wtfmedia-edge` | Active Worker version has Workers AI, `WTFMEDIA_STATE`, `wtfmedia-catalogue-v1`, `wtfmedia-ingest`, and `EDGE_SHARED_SECRET` / `INGEST_TOKEN` secret-name bindings. | The old edge retrieval and queue path is deployed. |
| Vectorize | `wtfmedia-catalogue-v1` exists as a 1,024-dimensional cosine index with 5,742 vectors. | Reusable, but its observed processed watermark is 2026-08-11; that is not proof that the current corpus is indexed. |
| Queue | `wtfmedia-ingest` and its DLQ exist, and the edge Worker has a queue handler. | Reusable for controlled ingestion after provenance activation gates. |
| KV | `WTFMEDIA_STATE` exists and matches the deployed edge binding. | Reusable for rate-limit and idempotency state. |
| R2 | Local config and deployed edge refer to `wtfmedia-catalogue`; the selected account does not list that bucket. | Blocking drift: transcript/uncut reads and uploads must stay unavailable. |
| D1 | Local config declares `wtfmedia-ops`, while the selected account has no such database and the deployed edge version has no D1 binding. | Blocking drift: operator persistence, provenance, and the calendar cannot activate. |

The web source accepts `EDGE_SHARED_SECRET` first and retains the legacy `CLOUDFLARE_EDGE_SHARED_SECRET` name only for compatibility. The handoff needs one web Worker secret named `EDGE_SHARED_SECRET` that matches the existing edge secret. Do not paste, record, or rotate its value in this repository.

## Deployment safety

Both Cloudflare deployment scripts now pass `--experimental-provision=false --experimental-auto-create=false`. A deploy can validate and use only explicit, pre-existing resources; it cannot turn missing D1/R2 resources into an accidental side effect. The explicit `9d9d` script still clears ambient Cloudflare token/account overrides.

## Calendar: local foundation and activation boundary

The Production workspace is a local visual sketch. Its sticky notes are not a shared schedule, and no external calendar projection exists. The next implementation must make one internal schedule canonical and treat Google Calendar, iCal, or any provider as derived projections.

The approved local contract is implemented in [`cloudflare/migrations/0006_production_calendar.sql`](../../cloudflare/migrations/0006_production_calendar.sql) and verified with its SQLite contract test. It is portable schema only; it has not run against a Cloudflare D1 database.

1. `production_work_items` owns an episode/IP reference, explicit non-colour IP label, stage, owner, date/time semantic, approved colour token, blocked reason, and optimistic revision.
2. `production_notes` owns a colour token, text, placement, and the work-item or calendar-day it annotates. It is not an anonymous free-form event.
3. `production_work_item_revisions` is append-only and records actor, operation, safe projection, reason, and timestamp.
4. Calendar and board return the same role-filtered projection. Drag/drop uses an explicit update with an `If-Match` revision; stale clients receive a conflict instead of overwriting another editor.
5. Export records reference the canonical item and provider event identifier, but provider tokens, raw responses, and calendar content never enter a client DTO or audit metadata.

The future calendar endpoints, role checks, and drag/drop mutation are not implemented by this migration. No external calendar write is part of this packet.

## Local provenance and evaluation foundation

- [`cloudflare/src/ingest/source-reconciliation.ts`](../../cloudflare/src/ingest/source-reconciliation.ts) produces a deterministic hashed source-row identity and safe reconciliation status. It accepts no private link, raw transcript, storage key, or credential; title equality never activates an asset.
- A confirmed uncut role can be typed locally, but remains `needs_alignment` and blocked. `Internal` remains `ambiguous` until final field classification and asset verification.
- [`docs/quality/2026-08-29-editorial-evaluation-template.json`](../quality/2026-08-29-editorial-evaluation-template.json) fixes the 20-case distribution and hybrid rubric while leaving all editorial questions, answers, and references blank for human authoring.

## Phase 3 / Ask WTF truth boundary

The deployed edge Worker can answer source-backed questions against the existing Vectorize index. It is not yet a complete provenance system:

- R2 absence means new transcript objects and uncut assets cannot be safely fetched or stored.
- D1 absence means the checked-in provenance spine and its alignment/job records are not a live source of truth.
- New typed transcript-consumer modules are local Phase 3 work, not evidence that the deployed legacy queue handler persists versioned transcripts or supports uncut playback.
- The 5,742-vector count is only an index inventory. Re-indexing waits for an approved corpus manifest, embedding/version policy, and the editorial factual-correctness evaluation set.

## Required human decisions

| Decision | Required answer |
| --- | --- |
| Cloudflare resources | Approve whether `wtfmedia-catalogue` and `wtfmedia-ops` are recreated under the selected account, or provide approved replacement names. |
| Data activation | Provide backup/rollback evidence and the first authorised corpus manifest before a separately authorized D1 migration run. |
| Chat handoff | Confirm an operator will set matching web `EDGE_SHARED_SECRET` through a secure channel. Do not supply the value here. |
| Calendar authority | Resolved locally: native D1 owner, `Asia/Kolkata` default, semantic colours, revision-preserving conflict policy. Live D1 application remains separately authorized. |
| Calendar projection | Select provider, authorized identity, scope, export direction, conflict owner, revocation behaviour, and whether manual export precedes sync. |
| Access + hostname | Approve zone/hostname and Access application/policy before routing `/ops` or changing canonical origin. |
| Editorial evaluation | Fill the 20-case human-authored template, then provide corpus/alignment evidence before a Vectorize refresh is accepted. |

## Ordered execution after review

1. Verify approved resource names with `9d9d`, then create/bind only owner-approved D1 and R2 resources in a separately authorized change.
2. Apply and verify portable provenance/calendar migrations against D1. Record schema/version evidence without copying user data.
3. Implement canonical calendar DTOs, role checks, optimistic-concurrency mutations, and local tests; then replace the browser-only sticky-note sketch with the API-backed projection.
4. Wire versioned transcript ingestion to approved R2/D1/Queue bindings, run the editorial evaluation against a bounded corpus, and record the Vectorize revision before enabling new retrieval claims.
5. Hand over the web Worker secret through the secure operator path, run public chat smoke, then consider hostname and `/ops` Access cutover.
6. Keep Vercel as rollback until public, chat, Access, recovery, and custom-hostname evidence exists.
