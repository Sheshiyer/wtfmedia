# Client question · IP taxonomy reconciliation

**Drafted:** 2026-08-27
**For:** Nikhai (SpaceBlanket.AI) → Nikhil Kamath Media Group / WTF editorial
**Blocks:** Phase 3 episode schema authoring — `PROV-10` (ingest metadata
includes IP) and later `KNOW-07` IP filters. `PROV-01` is only the stable
internal episode ID and is not an IP field.
**Related requirement:** `REQUIREMENTS.md` — `PROV-10` lists IP among ingest
metadata; `KNOW-07` filters by IP. No committed `episodes.ip` column exists
in `docs/superpowers/plans/2026-08-27-wtf-os-whole-app-shell.md`.
**Status:** draft-held, awaiting owner reply

---

## What we observed

Two sources describe WTF's content dimensions, and they do not name the same set.

### Source A — client Phase 1/2 build spec v2.0 (2026-08-19, Section 1.2)

> "Six IPs stored as a first-class field: **Nitya Kamat, BTS, POV, Animation, Stitched, Ways of the World**"

### Source B — owner-supplied catalogue Excel files (2026-08-27 snapshot)

`Internal - PODCAST Links .xlsx` and `Podcast Transcripts (1).xlsx` each carry five sheets, one per property:

| Sheet name | Record count (Internal / Transcripts) |
|---|---:|
| Podcasts by WTF | 26 / 27 |
| People by WTF | 23 / 24 |
| WTF is Finance | 3 / 4 |
| Special Episodes | 4 / 4 |
| WTF Online | 3 / 3 |

Evidence: `.planning/inputs/podcast-catalog/2026-08-27/manifest.json`
Source hashes: pinned in that manifest.

Neither list is a subset of the other. Sheet A is the **content brand**
dimension the spec commits to. Sheet B is the **show/property** dimension the
production team already uses in operational sheets.

## Why this matters

The episode schema in Phase 3 needs a canonical IP (and possibly show)
field per `PROV-10` before `KNOW-07` can filter on it.
Guessing wrong means either:

- rewriting the schema when the second dimension surfaces later, or
- silently forcing every "Ranbir Kapoor" episode under one brand that doesn't
  describe its actual content bucket.

We will not pick between these two lists on our own. This is a factual
question about how WTF organizes its own catalogue.

## The question

Which of these best matches how WTF actually thinks about the catalogue?

**Option 1 — the sheet tabs are the IPs.** The six-IP list in the spec is
either aspirational or stale. Episodes belong to exactly one of *Podcasts by
WTF, People by WTF, WTF is Finance, Special Episodes, WTF Online*, and the
schema uses that field. No content-brand dimension.

**Option 2 — the six-brand list is the IP, the sheet tabs are shows/channels.**
An episode has both an `ip` (from *Nitya Kamat / BTS / POV / Animation /
Stitched / Ways of the World*) and a `show` (from the five sheet tabs). Both
are first-class fields on the episode record.

**Option 3 — the two lists represent different eras.** One is the current
naming; the other is planned or retired. Tell us which is current and we use
it as the sole `ip` field.

**Option 4 — different.** Neither of the above. Please describe how the team
actually organizes the catalogue and we align to that.

## Follow-up requests, whichever option is chosen

1. **Per-episode mapping.** For each catalogue row (59 internal / 62
   transcripts in the 2026-08-27 snapshot),
   which IP (and, if option 2, which show) does it belong to? A single
   column added to either supplied sheet is sufficient.
2. **Backfill authority.** Confirm who on the WTF side owns disputes when a
   guest could belong to more than one IP (e.g. a finance-adjacent People
   episode). We will not silently re-classify.
3. **Retired-value handling.** If any historical episode is tagged with an IP
   that has since been renamed or dropped, do we retain the historical value,
   remap it, or mark it deprecated?

## What we will not do until this is answered

- Author the Phase 3 `episodes` table schema
- Add an `ip` field to the frontend filter surface
- Emit any IP-derived aggregation (per-IP counts, per-IP performance,
  per-IP calendar filters — all mentioned in the spec §1.6, §2.2, §2.5)

## Response format we can act on

A one-line answer picking an option, plus a link to the mapping sheet
(preferably the same Excel or Google Sheet with one added column). Anything
else is fine too — we will translate.

---
*Draft-held. No decision made or implied by this document.*
