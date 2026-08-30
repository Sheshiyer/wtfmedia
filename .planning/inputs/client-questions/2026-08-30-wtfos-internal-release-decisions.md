# WTF OS current release — confirmed decisions and retained gates

**Recorded:** 2026-08-30
**Status:** owner-approved implementation and migration direction. The source
Cloudflare account has been inventoried read-only. This record does not claim
that the target account, data copy, Worker deployment, DNS mapping, or calendar
backend is already live.

## Confirmed release direction

- **Temporary public-link posture:** this release may be served without login
  or Cloudflare Access. Anyone who knows the URL may view the current product.
  This is an explicit, short-lived owner decision rather than proof that an
  authentication boundary exists.
- **Calendar exception:** anonymous visitors may list, create, and update
  production-calendar records in this release. Delete, bulk import/export,
  ingestion administration, transcript activation, provider configuration,
  secrets, and release approval remain server-side restricted or unavailable.
- **Next-release access:** Cloudflare Access and fine-grained team RBAC move to
  the next release, targeted approximately one week after this release. Their
  absence does not block this release's shell, dual-source read experience, or
  bounded calendar list/create/update flow.
- **Source mode:** the UI must select `published` or `uncut`, and every shown
  timestamp must come from an approved source segment and verified per-episode
  mapping. Where either is absent, it must show `unavailable`/`unmapped`, not
  an inferred time.
- **Remaining priority (2026-08-30):** Ask WTF chat for YouTube published
  (released) and uncut is first, because it is the path that reads/writes KV
  ingest state, R2 assets, Vectorize metadata, the ingest queue, and Settings
  integrations. Hostname cutover waits on that join. Uncut *activation* still
  requires mapping evidence; the filter and fail-closed ingest can ship first.
- **Editorial evaluation:** examples may exercise the product flow now, but
  they are synthetic/provisional. They cannot satisfy the author-owned 20-query
  answer-key acceptance gate.
- **Calendar:** the target is a WTF OS canonical production calendar with
  persistent backend records and data management. External calendar projection
  is not in this release.
- **Cloudflare migration:** reuse the existing Ask WTF R2, Vectorize,
  Workers AI/NVIDIA, KV, and queue implementation. Extend it for the `uncut`
  source mode instead of rebuilding the inference and embedding stack.
- **Logical resource names:** approved for the target account. Source presence,
  target creation, data copy, and cutover require separate receipts; names in
  configuration do not prove those operations occurred.

## Corrected quarantine ledger

The earlier approval packet referred to two unmatched rows. The supplied
catalogue fixtures actually contain **three** transcript rows with no exact
episode-title match in the Internal workbook. All remain `ambiguous` and are
excluded from R2, D1, embeddings/vectors, calendar records, and any response
or UI projection until an owner supplies one of: `map existing episode`,
`create distinct episode`, `exclude/archive`, or `needs source file`.

| Transcript sheet | Source row | Title | Available supporting fields | Current outcome |
| --- | ---: | --- | --- | --- |
| People by WTF | 25 | Brain Armstrong | Posting date: 16 July 2026 | `ambiguous` — needs source-backed canonical mapping |
| WTF is Finance | 5 | WEF - Economics | Clean Cut pointer present; no posting date | `ambiguous` — needs source-backed canonical mapping |
| WTF is Podcast | 28 | WTF is a Battery? | Clean Cut pointer present; no posting date | `ambiguous` — needs source-backed canonical mapping |

The counts behind this correction are 59 Internal rows and 62 transcript rows.
No source URL, asset path, transcript body, or provider credential is copied
into this handoff.

## Deferred evidence that does not block the shell or calendar release

1. Each `Internal` candidate still needs source-backed physical type,
   accessibility, hash, and canonical episode mapping before it can become an
   activated uncut source.
2. The owner-authored 20-query answer key remains the editorial quality gate.
   Synthetic examples may emulate the flow but are not acceptance evidence.
3. Ten owner-approved published-to-uncut alignment cases remain the timestamp
   alignment gate; no universal offset may be inferred.
4. The three quarantined rows remain excluded until their dispositions are
   supplied. They do not block unrelated episodes or the calendar UI.

## Still required before target-account cutover

1. A valid target-account Cloudflare management API token. The available
   credential bundle is formatted for R2 S3 object access, has not yet been
   validated end to end, and is not a validated Wrangler management token.
2. Target resource creation and binding receipts, data-count reconciliation,
   live dual-source retrieval checks, and a D1-backed calendar mutation test.
3. A reviewed deployment of the integrated web and edge Workers followed by
   the `wtfhq.in` custom-domain mapping and rollback smoke evidence.
4. Cloudflare Access and per-member RBAC remain a next-release deliverable,
   not a blocker for this temporary public-link release.

## Related material

- [`2026-08-30-9d9d-cloudflare-migration-inventory.md`](../2026-08-30-9d9d-cloudflare-migration-inventory.md)
  — read-only source inventory, target mapping, cutover sequence, and rollback
  boundary.
- [`2026-08-29-phase-3-blocking-inputs.md`](2026-08-29-phase-3-blocking-inputs.md)
  — secure-channel inputs and activation boundary.
- [`2026-08-27-editorial-evaluation-set.md`](2026-08-27-editorial-evaluation-set.md)
  — author-owned answer-key format and acceptance purpose.
- [`2026-08-27-ip-taxonomy-reconciliation.md`](2026-08-27-ip-taxonomy-reconciliation.md)
  — canonical taxonomy and reconciliation process.
