# Ignored source-input manifest — 2026-09-01

Status: inventory and promotion policy only. Raw source drops remain ignored
and untouched. This file is the tracked manifest for deciding what may later
be promoted as a sanitized fixture; it is not a copy of the source material.

## Promotion policy

Only a bounded, non-sensitive input required by a named GSD plan may become a
tracked fixture or manifest. Do not promote private transcripts, PDFs, drive
links, credentials, `.env` material, native session data, or unredacted
meeting/export content. Prefer a synthetic fixture that proves the contract.

## Current ignored inventory

| Ignored location | Observed contents | Disposition |
|---|---:|---|
| `.planning/inputs/podcast-catalog/2026-08-31/` | 167 files | Preserve as a user-owned source drop; do not copy into Git. |
| `data/` | 58 files | Preserve local data; promote only a sanitized fixture named by a plan. |
| `web/src/data/` | 7 files | Treat snapshots/manifests as generated or local projection data; do not promote wholesale. |
| `web/tests/security/phase3-threat-results/` | 2 files | Generated security output; regenerate in the verification lane. |
| `.env`, `PRD.md`, `PRODUCT.md` | local/private material | Remain ignored and outside tracked planning. |

## Candidate metadata names observed in the source drop

These names identify possible future inputs without copying their contents:

- `all-tabs/all-tabs-transcript-frame-youtube-map.csv`
- `all-tabs/all-tabs-transcript-frame-youtube-map.json`
- `all-tabs/ask-wtf-current-worker-uncut-jobs.json`
- `all-tabs/ask-wtf-infra-readiness.md`
- `all-tabs/ask-wtf-ingest-readiness.json`
- `all-tabs/ask-wtf-r2-upload-manifest.json`
- `all-tabs/missing-resources.json`
- `all-tabs/download-tasks.json`

These remain ignored until a plan names one specific bounded field set and a
sanitized fixture review confirms that no private source text, credential,
machine-local path, or external-link secret is included.

## Already-eligible tracked fixture direction

The `03-00` overlay permits small contract fixtures such as episode-scope,
source-mode, sidecar parsing, release-manifest, and rollback tests. Those
should be selected from existing branch diffs and added as tracked test data
only after the compatibility gate chooses the exact contract. Raw source
assets are not needed to establish those code-level invariants.

## Explicit non-promotion list

- Do not add the 167-file podcast catalog drop.
- Do not add `web/src/data` snapshots wholesale.
- Do not add generated threat-result output.
- Do not add `.env`, PRD/PRODUCT source material, private transcript text,
  spreadsheet/Drive links, or native session identifiers.
