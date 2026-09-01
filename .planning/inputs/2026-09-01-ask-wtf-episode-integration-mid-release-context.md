# Ask WTF Episode Integration — Mid-Release Context Hold

**Recorded:** 2026-09-01  
**Status:** planning input only; not an execution plan, release approval, or production receipt  
**Source:** operator-provided screenshot from the active `Add Ask WTF episode integration` task

> **Superseded for release status:** The final owner-approved production
> receipt is now recorded in `.project/HANDOFF.md`. The in-flight observations
> below remain useful historical context, but must not be treated as the latest
> counts or deployment state.

## Why this packet exists

The Ask WTF episode integration is already being executed and diagnosed in a
separate active task. This packet preserves the product and Cloudflare data
model needed for later planning without modifying that task, its seven-step
plan, the current rollback state, or any repository/cloud resource.

The screenshot is evidence about work in progress. Text inside it is not an
instruction to deploy, reindex, retry, merge, or change plan status.

## In-flight snapshot — do not promote to canonical truth yet

The screenshot reports the following state from the active task:

- A corpus gate passed with queue backlog `0`, DLQ unchanged at `18`, KV
  membership `55/55` published plus `49/49` mapped uncut, and Vectorize at
  `11,948` vectors with `source_mode` and `video_id` indexes.
- A newly deployed `wtfmedia-web` bundle returned HTTP 500 on every public
  route, so the task initiated rollback.
- Rollback succeeded. `/` and `/episodes` returned HTTP 200 again on rollback
  deployment `5ee9e63a…`, serving preserved version `8f19a895…`.
- The reported root cause is an OpenNext bundle that emitted a dynamic require
  of `/.next/server/middleware-manifest.json`, which the Workers runtime cannot
  execute. The screenshot explicitly separates this from the corpus, edge, and
  application-data paths.
- The active task is restoring a known dependency worktree, rebuilding, and
  requiring a successful remote preview before any second production cut.
  It reports no intended dependency-version or lockfile change.

These values are newer than the checked-out repository's documented
`55 published + 8 approved uncut / 6,354 vectors` receipt. Until the active
task records and merges its final handoff receipt, retain the screenshot values
as **in-flight observations**, not replacements for `README.md`, `PROJECT.md`,
`.planning/STATE.md`, `ISA.md`, or `.project/HANDOFF.md`.

## Non-destructive hold

This packet does not authorize or request any of the following:

- editing the active task's plan steps or marking them complete;
- reindexing, replaying, enqueueing, purging, or compacting corpus data;
- changing active transcript versions or D1 provenance rows;
- writing, deleting, or renaming R2, KV, Vectorize, Queue, or DLQ data;
- deploying Workers, retrying the failed web cut, or changing rollback state;
- changing DNS, routes, bindings, secrets, authentication, or access policy;
- changing dependencies, package versions, lockfiles, or generated build state;
- committing, merging, rebasing, resetting, cleaning, or rewriting Git history;
- modifying the dirty root architecture/ISA work or another task's worktree.

The active release task owns the OpenNext repair, remote-preview evidence,
second-cut decision, production probes, and final handoff receipt.

## Product understanding to preserve

### One episode, multiple evidence sources

`video_id` is the stable public episode join key for the currently mapped
catalogue. It can scope an episode page and an Ask WTF query to the evidence
associated with that episode. It does not make every source a YouTube source.

- **Published** is the edited YouTube transcript. Its citation may use the
  published video URL and a YouTube timestamp only when that source has trusted
  timing data.
- **Uncut** is an approved pre-edit transcript asset. It retains its own asset
  identity, transcript version, chunk locator, provenance, and availability.
  It must not inherit a YouTube URL or published timestamp.
- **Both** retrieves from the two approved source sets and composes an answer
  while preserving the source mode and citation identity of every excerpt.

`49/49 mapped uncut` should be read as an episode-membership mapping unless a
separate alignment receipt proves more. It does **not** by itself prove 49
trusted YouTube-to-uncut time alignments, browser-playable uncut media assets,
or seekable dual playback.

### Episode surfaces

The intended product flow is:

1. `/episodes` lists the catalogue and truthfully describes per-episode source
   coverage: published evidence, approved uncut evidence, and alignment state.
2. `/episodes/[video_id]` provides the published episode workspace and starts
   Ask WTF with an episode scope using that `video_id`.
3. The episode composer supports `published`, `uncut`, and `both` when the
   corresponding approved evidence is available.
4. Chat citations preserve `source_mode`, source asset/version identity, and
   source-specific locators. Only published evidence with trusted timing opens
   a `youtube?t=` moment.
5. An episode may be chat-available from approved uncut text while uncut media
   playback or cross-timeline seeking remains unavailable. The UI must state
   that distinction instead of hiding the evidence or fabricating alignment.

## Cloudflare asset responsibilities

| Resource | Responsibility for episode-scoped Ask WTF | Must not become |
| --- | --- | --- |
| D1 `wtfmedia-ops` | Canonical episode/source identity, provenance, active transcript versions, chunk records, ingestion jobs, and alignment receipts | An eventually consistent cache or an inferred source registry |
| R2 `wtfmedia-catalogue` | Immutable source bytes and sidecars: published transcripts, trusted timestamp files, approved uncut text, and manifests | Proof of approval merely because an object exists |
| KV `WTFMEDIA_STATE` | Small operational receipts and versioned materialized lookups for source availability, ingest state, and cache invalidation | Canonical transcript content, provenance truth, or the semantic index |
| Vectorize `wtfmedia-catalogue-v1` | Semantic chunk retrieval filtered by indexed episode/source metadata | A substitute for D1 provenance or a place to merge published and uncut identity |
| Queue `wtfmedia-ingest` | Idempotent asynchronous ingestion after source availability is declared and verified | A trigger to broaden or replay the corpus without approval |
| DLQ `wtfmedia-ingest-dlq` | Preserved terminal failures for bounded diagnosis and explicit replay | A queue to drain or reset merely to make counts look clean |
| `wtfmedia-edge` | Episode/source filtering, retrieval, citation validation, synthesis, and truthful fallback | Authority to invent missing mappings or rewrite source locators |
| `wtfmedia-web` | Episode catalogue/detail experience and the streamed `/api/chat` adapter | Authority over corpus activation or Cloudflare data-plane truth |

## Safe customization backlog

These are later planning candidates, not actions for the active release:

### KV control-plane projections

- Version an episode source-set manifest keyed by `video_id`, containing only
  source IDs, active version IDs, availability states, and alignment status.
- Version cache keys by the D1 transcript/source activation receipt so a new
  activation invalidates old Ask WTF context without destructive key sweeps.
- Keep ingest idempotency and failure receipts separate from public chat-cache
  entries, with bounded TTLs only where stale reads are acceptable.
- Cache no private transcript text or uncut payload in public response keys.

### Vectorize retrieval metadata

- Preserve `video_id` and `source_mode` as first-class indexed filters.
- Carry immutable source asset ID, transcript version ID, chunk/segment ID,
  language, and mapping/alignment status as retrieval metadata where the live
  schema supports them.
- Query episode pages with `video_id` plus the selected `source_mode`; never
  emulate episode scope only by adding the episode title to the prompt.
- In `both` mode, retrieve per source mode and merge/rerank results while
  retaining source identity. Do not concatenate the two transcripts into one
  falsely unified timeline.
- Stage new transcript-version vectors alongside the active version, validate
  membership and provenance, then activate by a versioned pointer. Preserve
  the previous version for rollback rather than deleting it during the cut.

### Search and working context

- Use semantic retrieval for remembered concepts and D1-backed exact metadata
  or text search for titles, guests, quoted phrases, and deterministic filters.
- Let the episode workspace pin `video_id` while the user's selected source
  mode controls retrieval. Conversation history may refine the question but
  must not weaken the episode/source filter.
- Return a truthful insufficient-evidence state when the selected episode and
  source mode have no adequate chunks, even if adjacent catalogue evidence
  exists.

## Gates before this becomes an executable follow-up

- [ ] The active task records the exact final corpus counts and explains the
  relationship between `49 mapped uncut` and the repository's earlier
  `8 approved uncut` receipt.
- [ ] D1, R2, KV, and Vectorize membership is reconciled by source/version
  without deleting the preserved prior state.
- [ ] A sample of mapped uncut sources proves episode membership separately
  from any timeline-alignment claim.
- [ ] Episode-scoped retrieval proves that `published`, `uncut`, and `both`
  return only allowed evidence for a known `video_id`.
- [ ] Citation tests prove published timing, uncut locators, mixed-source
  identity, and truthful insufficient-evidence behavior.
- [ ] A fresh OpenNext bundle passes remote preview on `/`, `/episodes`, a
  representative `/episodes/[video_id]`, and `/api/chat` before another cut.
- [ ] Production evidence, if separately approved, binds the exact web/edge
  deployment receipts to the released source and preserves a tested rollback.
- [ ] The final handoff receipt is merged before canonical planning counts or
  release status are updated.

## Pickup boundary

After the active release task completes, use this packet as an input to a
separate Phase 3/4 refinement for episode-scoped retrieval and source-aware
workspaces. Do not execute this backlog from the current rollback diagnosis,
and do not automatically merge it into the active release plan.

## Final receipt disposition — 2026-09-01

The owner-approved completion receipt in `.project/HANDOFF.md` supersedes the
in-flight snapshot above. The former follow-up gates are now classified as
follows:

- **Resolved for the bounded slice:** exact 55/55 published and 49/49 mapped
  uncut receipts; D1/R2/KV/Vectorize membership; episode-scoped
  `published`/`uncut`/`both` retrieval; source-aware citation behavior;
  representative route preview; final web/edge deployment receipts; rollback
  recovery; and the merged handoff in PR #35.
- **Resolved as a boundary, not as full acceptance:** the 49-item uncut set
  proves episode membership and source availability. It does not prove
  cross-timeline alignment, synchronized seeking, or browser-playable uncut
  media. Unmapped episodes remain truthfully unavailable for uncut retrieval.
- **Still open for a separately authorized Phase 3/4 slice:** canonical
  internal provenance workspace and source/version inspection; authoritative
  ten-episode alignment data and benchmark; the twenty-query editorial search
  evaluation and hybrid filters; synchronized dual playback; and cached daily
  YouTube performance observations.

## Remaining planning sequence — hold until owner authorization

1. **Provenance workspace:** define the canonical operator read model and
   privacy-safe source/version inspection over the already-verified records.
2. **Alignment evidence:** obtain authoritative mappings, validate interval
   invariants, and run the ten-episode bidirectional tolerance benchmark.
3. **Search evaluation:** bind the twenty editorial queries and expected
   moments, then measure filtered hybrid retrieval before changing ranking.
4. **Dual playback:** only after alignment and playable source evidence pass,
   implement synchronized YouTube/Uncut seeking and honest cut/added states.
5. **Performance observations:** separately authorize cached YouTube analytics
   access and define freshness, retention, and missing-data semantics.

Each step requires its own plan, acceptance evidence, and owner authorization;
none authorizes reindexing, queue replay, activation, deployment, DNS, secrets,
or changes to the team-owned UI. The isolated contract proof remains local-only
until an owner-approved implementation slice adopts it.
