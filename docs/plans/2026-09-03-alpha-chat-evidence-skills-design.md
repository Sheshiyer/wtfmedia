# Alpha Ask WTF Evidence Skills Design

**Status:** approved for repository-local implementation by the 2026-09-03 owner prompts
**Release boundary:** anonymous, stateless Alpha only
**Runtime boundary:** existing `wtfmedia-edge`, Workers AI, Vectorize, R2, KV, D1, and ingest queue

## Problem

The Alpha chat currently treats conversation style, source selection, retrieval, timestamp projection, and follow-up generation as loosely connected functions in one Worker. That creates four visible failures:

1. Model-suggested follow-up questions can be plausible but unanswerable because they are generated from short answer/title summaries and are not passed back through retrieval before display.
2. `both` mode runs one combined top-K search, so high-scoring results from one source mode can consume the candidate window before the other mode is considered.
3. Multi-entity questions keep only chunks containing the maximum number of entity phrases; an introductory chunk containing both a guest and company can displace answer-bearing chunks that contain only the guest in their episode title.
4. Some published candidate entries have no timestamp because their published transcript was ingested without a published timestamp sidecar. The current UI names the absence but does not explain it.

The live reproduction for “What's the solution for bangalore traffic?” returned three timed published candidates followed by untimed candidates for `LqSEfz4YUFA` and `fEUoJSTYtyc`. Both episodes have a published transcript text asset in the checkout but no corresponding published timestamp JSON sidecar. Their missing times are therefore truthful source provenance, not a rendering defect.

## Design

### Executable agent-skill contracts

The Worker owns three small, executable policy modules:

- **WTF OS Conversation** owns the concise, curious, evidence-first voice; prior-turn continuity; citation syntax validation; and the rule that suggested follow-ups are shown only after the same retrieval gate says they are answerable.
- **Published YouTube Evidence** owns `source_mode=published`, published timestamp origin/status, YouTube link construction, and the explicit explanation used when a published source has no verified timing data.
- **Approved Uncut Evidence** owns `source_mode=uncut`, opaque source identity, approved Frame.io links, the independent uncut coordinate system, and the prohibition on borrowing a published timestamp.

These are product runtime modules, not new Codex plugins, background agents, providers, or deployment units.

### Coordinator

For each user question the coordinator:

1. reformulates conversation-dependent wording when necessary;
2. computes one embedding for that search query;
3. queries every enabled source skill independently with a pre-top-K `source_mode` metadata filter and optional `video_id` filter; explicit uncut mode also performs a separately filtered published query solely to preserve the existing truthful fallback behavior when qualified uncut evidence is absent;
4. combines and source-balances the returned matches;
5. applies relevance and citation projection without crossing timestamp systems;
6. synthesizes one answer in the WTF OS voice;
7. rejects malformed citation markers, including literal `[N]`;
8. generates candidate follow-ups from the actual bounded evidence excerpts;
9. embeds and retrieves each candidate through the same coordinator, returning only candidates that meet the evidence threshold.

Cloudflare Vectorize supports multiple metadata keys as an implicit logical AND, so `source_mode` and `video_id` can be applied before top-K selection without a new index or service. The existing project receipt already records both properties as indexed.

### Timestamp provenance

Every newly ingested vector records a bounded timestamp status and origin:

- `verified` with `published_sidecar`, `uncut_sidecar`, or `uncut_inline` when a native timestamp produced the passage;
- `source_timing_unavailable` with `none` when no native timestamp exists.

Citation projection remains compatible with existing vectors by deriving the same status from `start` and `timestamped` when the new metadata is absent. Untimed published citations keep the base YouTube episode URL, never receive a `t=` parameter, and expose this public reason:

> This published transcript was ingested without timestamp data; the link opens the full episode.

Restoring exact timestamps for those existing live episodes requires acquiring approved published timestamp sidecars and a separately authorized re-ingest. This implementation does not guess times from uncut assets or mutate the live corpus.

## Data flow

```text
anonymous question + source mode + bounded prior turns
                    |
             WTF OS Conversation
                    |
               one embedding
          +---------+----------+
          |                    |
 Published YouTube       Approved Uncut
 filtered Vectorize      filtered Vectorize
          |                    |
          +---------+----------+
                    |
       balanced evidence + native timing state
                    |
          grounded answer + citations
                    |
      evidence-validated follow-up questions
```

## Compatibility and exclusions

- Preserve `/api/chat` request and streamed/plain-text response contracts.
- Extend `X-Sources` additively with public timestamp status/reason fields.
- Preserve Alpha anonymity and statelessness; no conversation database writes or per-user memory.
- Preserve the current Worker, Vectorize index, R2 bucket, KV namespace, D1 database, and queue.
- Do not deploy, replay ingest, upload timestamp assets, change DNS, change secrets, or broaden the corpus in this task.
- Do not expose R2 keys, hashes, private paths, prompts, response bodies, or credentials to the browser.

## Acceptance

- Both mode performs one filtered Vectorize query per enabled source using the same embedding.
- Named multi-entity questions retain answer-bearing chunks matching any explicit named phrase.
- Literal/non-numeric citation placeholders invalidate synthesis.
- Follow-up suggestions are grounded in supplied excerpts and pass fresh retrieval before display.
- Published untimed candidates carry an explicit truthful reason and a full-episode link with no inferred seek time.
- Uncut timestamps and links remain independent from published coordinates.
- Retrying replaces the last assistant turn without duplicating the user question.
- Cloudflare unit tests, web unit/contracts, targeted browser journeys, typecheck/lint, and builds pass locally.
