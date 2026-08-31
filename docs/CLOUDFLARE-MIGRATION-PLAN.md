# Cloudflare migration plan

This plan addresses the reliability and grounding gaps in the original
Vercel-hosted, static-vector implementation without risking the live user path.

## Current status

The migration is live for the approved Ask WTF query path. `wtfhq.in` serves
the WTF OS web app, and `/api/chat` can query `published`, `uncut`, and `both`
source modes against Cloudflare-backed R2/KV/Vectorize/D1 receipts.

The remaining migration work is not "make Ask WTF work"; it is hardening and
expansion: deployment receipts tied exactly to `main`, more evaluation, WAF /
Turnstile policy, queue/DLQ observability, and closure of deferred transcript
sheet mismatches.

## Target state

- Cloudflare serves the current UI and the Ask WTF backend path.
- R2 holds transcript source artifacts; Queue makes ingestion retryable;
  Vectorize is a rebuildable search projection; KV holds short-lived state.
- Workers AI owns Cloudflare-side embedding and answer inference.
- Browser Run Crawl is constrained to approved editorial sources only.
- The application selects timestamp links per citation, never by a global UI
  promise.

## Workstreams

1. **Data contract.** Add a manifest for every episode: source URL, fetched at,
   transcript hash, language, timestamp coverage, embedding model/version, and
   ingest status. Reject a full build if required fields are missing.
2. **Grounded answer protocol.** Require an answer schema with claim-to-source
   IDs; validate every cited ID server-side; abstain when no evidence passes the
   threshold. Use curated official metadata for ownership and roles.
3. **Retrieval quality.** Tune the score floor using a gold set; use diversity
   and per-episode caps; measure duplicate rate and no-answer precision.
4. **Security and resilience.** Add Turnstile/WAF/rate policies before public
   cutover; cap request/answer budgets; log sanitized codes and request IDs;
   retry only before response streaming begins.
5. **Evaluation and release.** Add unit tests, data-contract tests, RAG golden
   evaluations, and a production shadow smoke test to CI. Release only when the
   corpus and safety gates are green.

## Non-goals for this release

- Automatic crawling of third-party video platforms.
- Replacing verified catalogue metadata with LLM extraction.
- Claiming exact timestamps for untimestamped fallback transcript text.
- Claiming the four deferred spreadsheet/source exceptions are fully ingested.
