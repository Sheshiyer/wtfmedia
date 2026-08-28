# Cloudflare edge RAG infrastructure

Status: **production edge RAG deployed** — 2026-08-11

The public product remains served by Vercel, with its chat API proxying to a
dedicated Cloudflare Worker. Cloudflare keeps the durable retrieval and
inference boundary isolated from the UI deployment.

## What exists

| Resource | Name | Responsibility |
| --- | --- | --- |
| Worker | `wtfmedia-edge` | Edge API, validation, rate limiting, retrieval, answer generation, and queue consumer |
| Vectorize | `wtfmedia-catalogue-v1` | Cosine similarity index, 1,024 dimensions; indexed on `video_id` |
| Workers AI | Worker binding | BGE Large query/index embeddings and Llama 3.3 70B answers |
| R2 | `wtfmedia-catalogue` | Immutable transcript objects and future crawl snapshots |
| KV | `WTFMEDIA_STATE` | Rate-limit windows, ingestion idempotency, and pipeline state |
| Queue | `wtfmedia-ingest` | Transcript-to-vector ingestion work |
| Queue DLQ | `wtfmedia-ingest-dlq` | Jobs that exhausted five delivery attempts |

The Worker’s shadow URL is `https://wtfmedia-edge.sheshnarayan-iyer.workers.dev`.
It is consumed server-to-server by `wtfmedia.vercel.app`; browsers do not
receive an ingestion credential or Cloudflare account token.

## Request path

`POST /v1/chat` accepts a bounded question, applies an IP/window limit in KV,
embeds it with Workers AI, searches Vectorize, keeps one passage per episode,
then asks the answer model to cite only the returned numbered evidence. It
returns a generic error code rather than a provider response body. Retrieval
refuses when the best source does not clear the similarity floor.

The deployed pilot has the following explicit guardrails:

- 1,500-character question cap and JSON/content-type validation.
- 20 requests per minute per IP by default (tune after real traffic data).
- Direct Worker chat calls are rejected; only the Vercel server can present the
  rotated shared edge secret.
- Score floor of `0.45`, top 12 candidate retrieval, maximum six distinct
  source episodes.
- Refusal for unsupported ownership, founder, recurrence, or corpus-wide-count
  questions. These require curated metadata, not transcript similarity alone.
- An admin enqueue endpoint protected by an `INGEST_TOKEN` Worker secret;
  no secret is committed or exposed to the browser.

## Ingestion path

1. An operator stores an approved transcript at `R2/transcripts/<video-id>.txt`.
2. The operator sends an idempotent job to `wtfmedia-ingest`.
3. The Worker chunks text, generates 1,024-dimensional BGE Large vectors,
   and upserts Vectorize records with title, source URL, and transcript text.
4. It records the transcript content hash in KV. An unchanged transcript is
   skipped on later jobs.
5. Failed jobs retry up to five times and then land in `wtfmedia-ingest-dlq`
   for inspection and replay.

R2 and queues are the source-of-truth handoff; Vectorize can be rebuilt from
them. The corpus has 55 transcript objects and 43 timestamp sidecars. The
timestamp-aware backfill is idempotent and continues through the queue.

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
