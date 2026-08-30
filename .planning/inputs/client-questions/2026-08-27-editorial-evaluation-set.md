# Client request · 20-query editorial evaluation set

**Drafted:** 2026-08-27
**For:** WTF editorial team (via Nikhai)
**Blocks:** Phase 4 acceptance gate — `KNOW-08` in `REQUIREMENTS.md`
**Referenced by:** client Phase 1/2 build spec v2.0 §1.5, and the "build note"
inside that section
**Status:** draft-held, awaiting reply — unchanged as of 2026-08-29

---

## Current review — 2026-08-29

No editorial-authored evaluation-set source has been received or ingested.
This remains a Phase 4 search-quality acceptance dependency (`KNOW-08`), not
a blocker for the local Phase 3 provenance recovery. Phase 3 transcript
fixtures, playback work, and automated tests do not substitute for editorial
retrieval evidence.

When supplied, store the source-hashed, access-reviewed set at
`.planning/inputs/editorial-eval/<date>.json`. Do not create synthetic queries
or treat local transcript fixtures as editorial acceptance data.

## Why this exists

Section 1.5 of the build spec is explicit:

> "Build note: create the evaluation set *before* tuning retrieval. Without
> it, 'is the search good enough?' becomes an argument instead of a number."

And the Phase 1 acceptance gate is written against that number:

> "Against a 20-query evaluation set written by WTF's editorial team,
> including at least 8 concept-level queries, the correct moment appears in
> the top 3 results at least 80% of the time. Median latency under 3 seconds."

Repository requirement `KNOW-08` restates this as blocking Phase 4.

We cannot write this set. It has to come from the people who currently
scrub for moments they already remember — the editors who know what queries
they *would* type if the search box worked the way they want.

## What we need

Twenty real queries an editor would type into WTF OS to find a moment they
know exists. The mix matters more than perfection.

### Structure

| Field | Meaning | Example |
|---|---|---|
| `query_text` | Exactly what an editor would type. Not paraphrased. | "the part where Ranbir talks about his dad" |
| `query_kind` | `keyword` · `exact_phrase` · `concept` · `hybrid` | concept |
| `expected_episode` | Episode name (matching the catalogue sheet) | Ranbir Kapoor |
| `expected_moment_note` | One sentence describing the moment | first-half candid on his father's discipline |
| `expected_moment_approx_timestamp` | Approx `HH:MM:SS` in the YouTube cut, if known | 00:24:12 |
| `must_appear_in_top_n` | 1 / 3 / 10 (default 3 per KNOW-08) | 3 |
| `written_by` | Editor's name — for later disagreement resolution | ⧗ |
| `notes` | Anything the retrieval layer should know | "Nikhil rephrases the question three ways; any of the three is fine" |

### Required mix (from spec §1.5)

- **≥ 8 concept-level queries** — queries whose target passage does *not*
  contain the query words. Examples of concept-level shapes:
  - "trauma" → a passage about a hard childhood that never uses the word
  - "philosophy" → how someone thinks about meaning
  - "what drives him" → an emotional monologue about motivation
- **Remaining ≤ 12** may be keyword, exact-phrase, or hybrid — whatever the
  team actually searches for today.

### Coverage requirements

- Cover **at least 3 different sheet tabs** (Podcasts by WTF, People by WTF,
  WTF is Finance, Special Episodes, WTF Online).
- Cover **at least 2 different guests** per sheet tab used.
- Include **at least 2 queries that should return "nothing strong here"** —
  editors will occasionally search for moments that do not exist, and the
  spec (KNOW-07) says the system should say so rather than return noise.
- If Hindi episodes are in scope, include **at least 2 Hindi-language
  queries** with expected Hindi passages — this feeds directly into open
  item #3 (Hindi handling) in the spec.

### Template we can accept

Anything readable — Google Sheet, CSV, Excel, or a markdown table pasted
into a reply. The important part is that each row is complete enough for us
to run automatically and score. A minimal starter template:

```csv
query_text,query_kind,expected_episode,expected_moment_note,expected_moment_approx_timestamp,must_appear_in_top_n,written_by,notes
"the part where Ranbir talks about his dad",concept,Ranbir Kapoor,"candid on his father's discipline",00:24:12,3,Aditi,
```

## What we will do with it

1. Store the evaluation set as versioned JSON at
   `.planning/inputs/editorial-eval/2026-XX-XX.json`, source-hashed, per the
   snapshot pattern already used for the catalogue.
2. Wire it into the search evaluation harness during Phase 4 implementation.
   Every retrieval change reports the top-N accuracy and median latency
   against this exact set before merging.
3. Report failures back to the editorial team with the actual top-10 results
   so the set can grow. The first 20 queries are the acceptance gate, not
   the ceiling.

## What we will not do without this set

- Ship semantic search behind an "is it good enough?" opinion.
- Tune retrieval parameters against synthetic or self-authored queries. That
  would be tuning to our own taste, not the editors'.
- Claim KNOW-08 acceptance.

## Boundaries

- No editor's evaluation query needs to be secret from the retrieval layer.
  If a query contains guest-confidential context, redact it before sending —
  we treat the whole file as ingested corpus.
- Expected timestamps can be approximate; we align against the transcript
  anyway. A rough minute mark is fine.
- If a query has more than one acceptable "expected moment", list them as
  separate rows with the same `query_text` and different
  `expected_moment_note` values.

## Response format we can act on

Any file with the eight columns above, at least 20 rows, honoring the
concept-count and coverage requirements. Anything less complete is still
useful — we will follow up per row rather than block on the full set.

---
*Draft-held. Repository will not store or process any editorial query text
until the file arrives from WTF editorial.*
