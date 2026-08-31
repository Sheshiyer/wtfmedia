# Cloudflare edge RAG infrastructure

Status: **current production path plus historical notes** — refreshed
2026-08-31

> **Current-inventory note (2026-08-31):** Ask WTF is live on
> `https://wtfhq.in/api/chat` through Cloudflare-backed retrieval. The current
> release receipt is also recorded in `.project/HANDOFF.md` and
> `docs/AGENT-ONBOARDING.md`.

The public product is the WTF OS web app served through Cloudflare, with a
server-side Ask WTF path backed by Cloudflare storage, retrieval, inference,
and provenance resources.

## What exists

| Resource | Name | Responsibility |
| --- | --- | --- |
| Worker | `wtfmedia-web` | Public web app and `/api/chat` route |
| Worker | `wtfmedia-edge` | Edge API, validation, rate limiting, retrieval, answer generation, and queue consumer |
| Vectorize | `wtfmedia-catalogue-v1` | Cosine similarity index, 1,024 dimensions; indexed with source-mode metadata |
| Workers AI | Worker binding | BGE Large query/index embeddings and Llama 3.3 70B answers |
| R2 | `wtfmedia-catalogue` | Published transcripts, timestamp sidecars, uncut text, and manifests |
| KV | `WTFMEDIA_STATE` | Rate-limit windows, ingestion idempotency, and pipeline state |
| D1 | `wtfmedia-ops` | Source assets, transcript versions/chunks, ingestion jobs, ops provenance |
| Queue | `wtfmedia-ingest` | Transcript-to-vector ingestion work |
| Queue DLQ | `wtfmedia-ingest-dlq` | Jobs that exhausted five delivery attempts |

Browsers do not receive ingestion credentials or Cloudflare account tokens.
Runtime code reaches Cloudflare storage through bindings; operator account
tokens stay local.

## Current release receipt

As of the 2026-08-31 release, the approved queryable corpus is reconciled:

- R2 `wtfmedia-catalogue`: 55 published transcripts, 43 timestamp sidecars,
  8 approved uncut text assets, and 1 manifest object.
- KV `WTFMEDIA_STATE`: 63 approved `ingest:` receipts, split across
  55 published and 8 uncut assets.
- Vectorize `wtfmedia-catalogue-v1`: 6,354 vectors, split across
  5,742 published and 612 uncut records.
- D1 `wtfmedia-ops`: 63 available source assets, 63 active transcript versions,
  6,354 active transcript chunks, and 63 completed ingestion jobs.

The four deferred spreadsheet/source exceptions remain outside the clean
ingestion claim: `WTF is a Battery?`, `WEF - Economics`, `The Foundery`, and
the `Brain Armstrong` transcript-row mismatch.

## Request path

`POST /api/chat` accepts a bounded message list and a `sourceMode`
(`published`, `uncut`, or `both`). The backend applies an IP/window limit in KV,
embeds it with Workers AI, searches Vectorize, keeps one passage per episode,
then asks the answer model to cite only the returned numbered evidence. It
returns a generic error code rather than a provider response body. Retrieval
refuses when the best source does not clear the similarity floor.

The recorded pilot had the following explicit guardrails:

- 1,500-character question cap and JSON/content-type validation.
- 20 requests per minute per IP by default (tune after real traffic data).
- Direct edge chat calls are rejected unless the trusted server path presents
  the rotated shared edge secret.
- Score floor of `0.45`, top 12 candidate retrieval, maximum six distinct
  source episodes.
- Refusal for unsupported ownership, founder, recurrence, or corpus-wide-count
  questions. These require curated metadata, not transcript similarity alone.
- An admin enqueue endpoint protected by an `INGEST_TOKEN` Worker secret;
  no secret is committed or exposed to the browser.

## Ingestion path

1. An operator stores an approved source artifact in R2.
2. The operator sends an idempotent job to `wtfmedia-ingest`.
3. The Worker verifies the declared D1 `source_assets` row and backing R2
   object before staging vectors.
4. The Worker chunks text, generates 1,024-dimensional BGE Large vectors,
   and upserts Vectorize records with title, source URL, and transcript text.
5. It records the transcript content hash in KV. An unchanged transcript is
   skipped on later jobs.
6. Failed jobs retry up to five times and then land in `wtfmedia-ingest-dlq`
   for inspection and replay.

R2 and queues are the source-of-truth handoff; Vectorize can be rebuilt from
them. D1 is the provenance receipt. The current approved corpus has 55
published transcript objects, 43 published timestamp sidecars, and 8 approved
uncut text objects.

## Crawl policy

Cloudflare Browser Rendering’s Crawl endpoint is available as a future,
asynchronous source. It is **not** an automatic YouTube crawler. Use it only
for explicitly approved, owned or licensed editorial URLs, respecting
`robots.txt`, crawl purpose, URL allow-lists, and source attribution. Store the
raw crawl result in R2, record URL/content hash/fetch time in KV, and enqueue a
normalized text object. Do not use crawling as a replacement for the current
curated podcast transcript pipeline.

## Rollout plan

| Gate | Requirement | Status |
| --- | --- | --- |
| 1. Resource isolation | Dedicated names/bindings; no reuse of unrelated account assets | Complete |
| 2. Pipeline pilot | R2 upload → Queue → Vectorize for two transcripts | Complete |
| 3. Data parity | 55 source records, hashes, titles, URLs, and measured timestamp coverage | Complete |
| 4. Quality eval | Production grounded/source, ownership, and timestamp checks | Complete (gold set expansion pending) |
| 5. Reliability/security | Authenticated Vercel-to-Worker boundary, input/rate limits, request IDs | Complete (WAF/Turnstile pending) |
| 6. Shadow comparison | Compare Worker answers with Vercel for a bounded sample | Pending |
| 7. Cutover | Owner-approved Vercel `/api/chat` proxy release, with post-release monitoring | Complete |

This is a controlled production release, not evidence that every future
hardening gate is complete. Timestamp coverage is measured at 43/55 episodes.
A source receives a `youtube?t=` link only when its retrieved caption chunk has
a verified start time; the 12 fallback transcript episodes remain video-level
sources rather than guessed exact-moment links.

## Operations

- Check `GET /v1/health` after every deployment.
- Inspect Worker logs and Queue/DLQ depth before retrying failed ingestion.
- Keep raw transcript provider errors and model response bodies out of public
  responses and source control.
- Rotate `INGEST_TOKEN` after a handoff or suspected exposure, then update only
  the trusted ingestion caller.
- Keep account API tokens local and scoped; Worker runtime uses bindings and
  Worker secrets instead of the account API token.
- Add Workers Analytics Engine/error metrics and run the evaluation job in CI
  before each deployment.

## Local commands

```bash
cd cloudflare
npx wrangler deploy
curl https://wtfmedia-edge.sheshnarayan-iyer.workers.dev/v1/health
```

`wrangler` reads credentials from the operator environment. Never place the
Cloudflare account token or `INGEST_TOKEN` in this repository.
