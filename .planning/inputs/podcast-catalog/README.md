# Podcast catalogue snapshots

Versioned JSON snapshots of the WTF podcast catalogue Excel sources supplied
by the owner. The repository is the **redacted** snapshot store; a live Google
Sheet is expected to become the authoritative feed later and will replace this
extractor's input path without changing the output shape.

Unredacted Excel files and capability URLs do not belong in git. Keep a local
copy under `local-raw/` (gitignored) if you need the original strings.

## Layout

```
podcast-catalog/
  README.md                                 (this file)
  tools/snapshot_sheets.py                  (deterministic extractor + redactor)
  local-raw/                                (gitignored; optional operator copy)
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

- No taxonomy reconciliation. Column headers are preserved as authored in the
  source sheet, including quirky surrounding whitespace (`"Shoot Date "`).
  Trailing empty header cells are dropped; remaining header text is not
  trimmed.
- No external fetches.
- http(s) URLs are rewritten to `{scheme}://{host}/#sha256:{hex}` where `hex`
  is the SHA-256 of the original URL string. Path, query, fragment, and
  share tokens are not stored. Re-running the redactor on an already-redacted
  snapshot is a no-op.
- No derived fields. Snake-case field names, IP normalization, guest-list
  parsing, date parsing, and cross-sheet joins all belong to a later
  reconciliation step, not to this snapshot.
- Idempotent by design. The extractor uses fixed inputs and no wall-clock
  values. Per-row `row_hash` is sha256 of the committed `{header: value}`
  map after redaction.
- Provenance in every file. Each JSON's `meta` block carries the source file
  basename, source file sha256, sheet name, sheet index, header row source
  index, and column headers.

## Snapshot procedure

The extractor reads the two Excel files from `$WTF_CATALOGUE_XLSX_DIR`, or
from the current user's Downloads directory when that variable is unset.
Checkout paths and operator usernames are not stored in the script. Writes
are always redacted.

```bash
export WTF_CATALOGUE_XLSX_DIR="$HOME/Downloads"
python3 .planning/inputs/podcast-catalog/tools/snapshot_sheets.py
```

To rewrite an already-committed snapshot (used for the 2026-08-27 public-repo
redaction):

```bash
python3 .planning/inputs/podcast-catalog/tools/snapshot_sheets.py --redact-existing
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
  See `.planning/inputs/client-questions/2026-08-27-ip-taxonomy-reconciliation.md`.
- **Guest field only on `Podcasts by WTF`.** For `People by WTF`, `WTF is
  Finance`, and `WTF Online`, the guest is effectively encoded in the episode
  title. Any downstream schema must handle both shapes.
- **Header row differs across files.** `Internal - PODCAST Links .xlsx` uses
  row 1 as a section banner and row 2 as the real header; `Podcast
  Transcripts (1).xlsx` puts headers on row 1 directly. The extractor
  declares this per source via `header_row_index_0based`.
- **Row count difference between the two files.** The internal catalogue is
  59 records; the transcripts catalogue is 62. Neither is authoritative on
  its own.
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

Source-file sha256 hashes are in `2026-08-27/manifest.json`. That manifest
also records that 494 http(s) URLs were redacted (`f.io` 278,
`drive.google.com` 163, `web.zset.in` 52, `next.frame.io` 1).

Git history before this redaction still contains the original share URLs.
Redaction does not rotate the live shares. See
`.planning/inputs/client-questions/2026-08-27-share-rotation.md`.

## Boundary

This snapshot is planning-input material. It is not runtime data, is not
served by the web app, and is not consumed by any test. Nothing here
authorizes fetching Drive, Zset, Frame.io, or YouTube content — those
depend on WTF-side access provisioning and open item #1 (deployment target)
in the client Phase 1/2 build spec.
