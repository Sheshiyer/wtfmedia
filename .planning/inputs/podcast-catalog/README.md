# Podcast catalogue snapshots

Versioned JSON snapshots of the WTF podcast catalogue Excel sources supplied
by the owner. The repository is the snapshot store; a live Google Sheet is
expected to become the authoritative feed later and will replace this
extractor's input path without changing the output shape.

## Layout

```
podcast-catalog/
  README.md                                 (this file)
  tools/snapshot_sheets.py                  (deterministic extractor)
  <YYYY-MM-DD>/                             (one directory per snapshot date)
    manifest.json                           (source hashes, sheet index, headers)
    internal/                               ("Internal - PODCAST Links .xlsx")
      podcasts-by-wtf.json
      people-by-wtf.json
      wtf-is-finance.json
      special-episodes.json
      wtf-online.json
    transcripts/                            ("Podcast Transcripts (1).xlsx")
      wtf-is-podcast.json
      people-by-wtf.json
      wtf-is-finance.json
      special-episode.json
      online.json
```

## Design rules

- No taxonomy reconciliation. Column headers are preserved verbatim from the
  source sheet, including quirky whitespace (`"Shoot Date "`).
- No external fetches. Frame.io, Zset, and Drive URLs are stored as strings.
- No derived fields. Snake-case field names, IP normalization, guest-list
  parsing, date parsing, and cross-sheet joins all belong to a later
  reconciliation step, not to this snapshot.
- Idempotent by design. The extractor uses fixed inputs and no wall-clock
  values, so re-running it against the same source files produces byte-for-byte
  identical JSON. Per-row `row_hash` (sha256 of canonical `{header: value}`
  pairs) supports drift detection when the Google Sheet arrives.
- Provenance in every file. Each JSON's `meta` block carries the source file
  basename, source file sha256, sheet name, sheet index, header row source
  index, and column headers.

## Snapshot procedure

The extractor reads the two Excel files from the owner's Downloads directory
(paths hard-coded in `tools/snapshot_sheets.py`). To rebuild:

```bash
python3 .planning/inputs/podcast-catalog/tools/snapshot_sheets.py
```

Requires only the Python 3 standard library and the system `unzip`. No
third-party packages, no network.

To take a new dated snapshot, edit the `SNAPSHOT_AT` constant in the
extractor and re-run. Old snapshots stay in place under their dated
directory.

## Known source anomalies (not fixed here)

- **IP taxonomy mismatch.** The five sheet tabs (`Podcasts by WTF`,
  `People by WTF`, `WTF is Finance`, `Special Episodes`, `WTF Online`) do not
  match the six-IP list committed to in the client Phase 1/2 build spec
  (`Nitya Kamat, BTS, POV, Animation, Stitched, Ways of the World`). Both
  namespaces likely need to co-exist. Resolve before schema authoring.
- **Guest field only on `Podcasts by WTF`.** For `People by WTF`, `WTF is
  Finance`, and `WTF Online`, the guest is effectively encoded in the episode
  title. Any downstream schema must handle both shapes.
- **Header row differs across files.** `Internal - PODCAST Links .xlsx` uses
  row 1 as a section banner and row 2 as the real header; `Podcast
  Transcripts (1).xlsx` puts headers on row 1 directly. The extractor
  declares this per source via `header_row_index_0based`.
- **Row count difference between the two files.** The internal catalogue is
  slightly behind the transcripts catalogue (59 vs 62 records total). Neither
  is authoritative on its own.
- **Duplicate header names within a sheet.** Rare (some empty-string columns
  between labeled ones). The extractor keys those empties as `col_<index>` so
  no data is silently dropped.

## Snapshot at 2026-08-27

| Source | Sheet | Records |
|---|---|---:|
| Internal | Podcasts by WTF | 26 |
| Internal | People by WTF | 23 |
| Internal | WTF is Finance | 3 |
| Internal | Special Episodes | 4 |
| Internal | WTF Online | 3 |
| Transcripts | WTF is Podcast | 27 |
| Transcripts | People by WTF | 24 |
| Transcripts | WTF is Finance | 4 |
| Transcripts | Special Episode | 4 |
| Transcripts | Online | 3 |

Source-file sha256 hashes are in `2026-08-27/manifest.json`.

## Boundary

This snapshot is planning-input material. It is not runtime data, is not
served by the web app, and is not consumed by any test. Nothing here
authorizes fetching Drive, Zset, Frame.io, or YouTube content — those
depend on WTF-side access provisioning and open item #1 (deployment target)
in the client Phase 1/2 build spec.
