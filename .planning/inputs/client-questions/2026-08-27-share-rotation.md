# Owner action · rotate catalogue share links

**Drafted:** 2026-08-27
**For:** Repository owner / WTF production (Frame.io, Google Drive, Zset)
**Blocks:** treating the public GitHub default branch as free of live
capability URLs. Git redaction is not rotation.
**Status:** owner-action-required — this repository cannot revoke third-party
shares

---

## Current review — 2026-08-29

Git redaction completed in `1ad469d`; the tracked snapshot retains only
redacted scheme/host plus SHA-256 placeholders. That prevents new public
clones from replaying the capability URLs, but it does not revoke prior
shares, remove URLs from earlier clones/history, or prove provider-side
rotation.

No third-party rotation confirmation has been recorded. Historical catalogue
links are not an approved Phase 3 ingestion source; an owner-approved staging
protocol and redacted mapping manifest are required before any provider or R2
ingestion is activated. Do not paste raw URLs, share IDs, tokens, or provider
screenshots into Git.

## Why this exists

Sheshiyer/wtfmedia is a **public** repository. The 2026-08-27 catalogue
snapshot originally stored 494 Frame.io, Google Drive, and Zset URLs
(uncut/final media, transcripts, folders). Those strings were rewritten on
the default branch to `{scheme}://{host}/#sha256:{hex}`.

Git history still contains the original URLs. Anyone who cloned or browsed
the repo before the redact commit can still open those shares until they are
revoked at the source.

This document does not authorize a history rewrite of `main`.

## What git already did

- Committed JSON no longer contains `f.io/<id>`, Drive file IDs, Zset folder
  IDs, or `next.frame.io/share/...` tokens.
- Future extracts through `tools/snapshot_sheets.py` redact on write.
- Optional unredacted copies belong in
  `.planning/inputs/podcast-catalog/local-raw/` (gitignored).

## What only the owner can do

Rotate or revoke every share that appeared in the pre-redaction snapshot.
Counts from the 2026-08-27 extract:

| Host | URLs | Likely action |
|---|---:|---|
| `f.io` | 278 | Frame.io: disable or rotate each short share |
| `drive.google.com` | 163 | Drive: remove "anyone with the link" (or equivalent) on those files/folders |
| `web.zset.in` | 52 | Zset: rotate or disable folder shares |
| `next.frame.io` | 1 | Frame.io: disable the `share/<uuid>/<uuid>` link |

Exact original URLs are in git history on `main` before the redact commit
(PR that landed the 2026-08-27 snapshot, then this redact follow-up). Use
that history locally if you need a checklist; do not paste the raw URLs back
into a public issue or PR.

## Confirmation we need

When rotation is done, reply with:

| Field | Value |
|---|---|
| Frame.io shares revoked or rotated? (`yes` / `no` / `partial`) | ⧗ |
| Google Drive link-sharing tightened? (`yes` / `no` / `partial`) | ⧗ |
| Zset folder shares revoked or rotated? (`yes` / `no` / `partial`) | ⧗ |
| Date completed | ⧗ |

## What we will not do from this repository

- Call Frame.io, Drive, or Zset APIs
- Rewrite `origin/main` history
- Restore original URLs into a tracked file
- Treat redaction as equivalent to revocation

---
*Owner-action-required. A redacted owner attestation is the close-out; Git
redaction alone is not proof of revocation or rotation.*
