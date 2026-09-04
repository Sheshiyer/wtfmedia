# Alpha Evidence Coherence Repair Design

**Status:** owner-approved in chat on 2026-09-04  
**Acceptance source:** [`ISA.md`](../../../ISA.md), ISC-199 through ISC-228  
**Release base:** `release/alpha` at `c0340bb`  
**Execution branch:** `codex/alpha-evidence-coherence`

## Problem

The source panel is accurately exposing several underlying inconsistencies rather than causing all of them. Three failures meet in the screenshots:

1. Published and uncut are independently queried timelines, but fixed per-mode reservation can promote weaker, unrelated candidates.
2. Named participants are used only after Vectorize top-K retrieval, so the correct episode can be absent even though an explicit `episodeId` query succeeds.
3. Published timing has two failure classes: genuinely absent sidecars and a present but incompatible sidecar that the current ingest path silently treats as untimed while still recording success.

The panel then amplifies those failures by presenting every retrieval passage as a numbered source and by making a view-only filter look like a query control. Filtering away the cited timeline can consequently say “no sources cited” even though the answer remains grounded in hidden evidence.

## Desired experience

A visitor asks about named guests and immediately gets the episode those guests actually appeared in, or a truthful abstention. The response permanently shows which corpus scope was searched. The answer’s cited evidence is prominent and grouped by episode; uncited retrieval context is secondary and cannot be mistaken for an answer citation. Published and uncut moments retain their own timelines.

When source-native published captions exist, their timestamp sidecar is validated before ingestion and the resulting vectors contain verified starts. A declared but missing or malformed sidecar retries instead of being recorded as a successful untimed ingest.

## Architecture

### 1. Canonical episode anchoring before top-K

Add a small catalogue resolver that joins `episodes` to the primary YouTube row in `episode_external_identities`, then compares normalized query phrases against the catalogue titles. A title phrase is eligible only when it is distinctive across the catalogue; the ubiquitous host phrase `Nikhil Kamath` cannot scope a query by itself. Matching tolerates one-character spelling drift such as `Sunil`/`Suniel` and requires one unique best episode.

The resulting public YouTube ID becomes the `episodeId` passed to both published and uncut Vectorize calls before top-K. An explicit route `episodeId` remains authoritative. If no unique catalogue anchor exists, retrieval remains broad.

Post-retrieval anchoring returns both the ordered matches and whether an actual title/text anchor matched. Only a real match—or a canonical episode scope—permits multiple passages from one episode. Merely extracting an entity-like phrase never disables episode deduplication.

### 2. Relevance-aware source-mode resolution

Published and uncut continue to be queried separately and retain independent coordinates. Source selection adds a competitiveness gate: a timeline is eligible for reserved capacity only when its best score is within `0.05` of the strongest eligible timeline and above the existing minimum score.

For `both`, competitive timelines are balanced and then filled by descending relevance. For `uncut`, clearly stronger published evidence is a truthful published fallback; weak unrelated uncut rows are not used merely to satisfy a count. A `published` request remains published-only and abstains when insufficient.

The response keeps the requested mode distinct from the evidence mode actually used. No fallback relabels a source or converts its timestamp.

### 3. Cited-first, episode-grouped source presentation

Snapshot `{ sourceMode, episodeId }` when a request is sent and store it on the completed assistant message. Do not infer requested scope from `X-Source-Mode`, which describes returned evidence after fallback.

Build a pure source-panel projection that preserves every original source index and object, assigns numeric `[n]` labels only to cited rows, assigns stable `C1`, `C2`, … labels to candidates, and groups rows by canonical `episodeId ?? videoId`. Cited groups and cited rows render first. Candidate-only context is secondary and collapsed by default.

The panel displays `searched: <mode>` separately from controls labelled `view this answer only`. When a view hides cited evidence, the summary retains the answer’s total citation count, reports the hidden count, and offers `show all cited sources`. Filtering never changes citation identity, timestamps, links, or source mode.

### 4. Transactional published-timing ingestion

Extract the legacy queue consumer into a focused module with testable dependencies. Normalize accepted sidecar rows from either canonical `{t,x}` or source-native YouTube `{start,text,duration}` input into `{t,x}`. Reject empty, nonfinite, negative, nonmonotonic, or textless rows.

If a job declares `timestampsKey`, absence or validation failure throws before embeddings, vector upserts, stale cleanup, or KV success. Jobs without `timestampsKey` remain intentionally searchable as untimed evidence. A D1 catalogue-resolution error propagates as retrieval unavailable rather than silently broadening an explicit named-episode query.

Store a versioned JSON receipt containing `contentHash`, `chunkCount`, and timing origin. After all upserts succeed, delete deterministic vector IDs above the new chunk count through the prior structured count. A bounded, explicitly allowlisted `replaceExisting` repair job may scan a fixed legacy range when the prior receipt is an old string; receipt deletion is unnecessary because every recovered sidecar changes the content hash. Write the new receipt only after cleanup succeeds.

### 5. Source-native sidecar recovery

Create a focused script that fetches captions without invoking the NVIDIA embedding build. It writes only canonical `{t,x}` JSON, validates before replacement, supports an explicit video allowlist, and has a check-only mode.

Use it for the thirteen currently invalid or absent published sidecars: twelve files are absent and `LcWoP6KtZKw` exists in incompatible `{start,text,duration}` form even though the current manifest counts it. Regenerate the provenance manifest from validated content, not file existence; the target local receipt is 56 published transcripts and 56 valid published timing sidecars.

### 6. Operations and authority

Implementation, tests, source-native caption fetches, and local generated assets occur only in the isolated branch. The owner explicitly authorized an ingest-token reset through the `wtfmedia` Wrangler profile. Two similarly named states must not be conflated:

- `INGEST_TOKEN` is a secret credential whose rotation invalidates existing callers.
- `ingest:<videoId>` is a KV idempotency receipt whose deletion permits replay.

Before any destructive action, inspect the exact requested target and capture a redacted before-state. The current approval does not silently authorize DNS, unrelated secrets, unrelated KV keys, broad queue replay, or data deletion. R2 upload, Worker deployment, queue replay, and production promotion remain separately enumerated activation steps and require their own explicit scope if not already named by the owner.

The Wrangler wrapper must use `--profile=<name>`, which is accepted by the installed host Wrangler; the obsolete split `--profile <name>` form fails before making a request.

## Alternatives rejected

### UI-only repair

This would clarify filters but leave Sam Altman retrieval wrong and leave published timing vulnerable to poisoned success receipts.

### Blanket reindex

This could conceal the immediate symptoms but would replay unrelated episodes, retain the malformed-sidecar failure mode, and make rollback harder to reason about.

### Cross-timeline timestamp borrowing

This is prohibited. Published and uncut edits can differ, so an uncut coordinate is not evidence of a published moment.

## Verification

- Worker unit tests prove catalogue anchoring, actual-anchor dedupe, competitiveness, fallback, sidecar validation, receipt ordering, and stale-vector cleanup.
- Script tests prove canonical conversion, validation failures, allowlisting, and manifest validity.
- Web unit and Playwright tests prove immutable searched scope, view-only controls, citation/candidate namespaces, grouping, hidden-citation restoration, responsive behavior, and native links.
- Typecheck, lint, full focused suites, production build, Wrangler dry-run, privacy scan, and `git diff --check` run after integration.
- No live mutation is considered complete without an exact before/after receipt and a query proving the intended vectors or UI behavior.
