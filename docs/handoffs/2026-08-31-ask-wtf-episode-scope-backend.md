# Ask WTF episode-scoped backend handoff — 2026-08-31

## Ownership and branch boundary

The production release branch is `codex/release-episode-scope`, based on
`origin/main` at `fef9dedd`. PR #28 and its public UI remain team-owned. The
only web changes are the narrow episode-id adapter, its compatibility receipt,
and regression coverage; no visual layout or theme was redesigned.

The branch implements the backend contract needed for an episode page to ask
questions against the episode's approved published and uncut transcript
evidence. The backend and web adapter are committed locally; push, merge,
deployment, and Cloudflare data activation remain pending at this checkpoint.

## Identity and retrieval contract

- `episodeId` on `/v1/chat` is an optional public YouTube video ID. Internal
  row hashes and R2 object keys are rejected as episode scopes.
- An episode-scoped Vectorize query filters on `video_id` before `topK`, then
  re-checks returned metadata and fails closed if unrelated matches appear.
- Episode scope retains multiple chunks from the selected episode. Catalogue
  scope keeps the existing one-result-per-episode deduplication.
- Uncut uploads keep `uncut/{sha256}.txt` as their privacy-safe storage key,
  use that hash as the private source/citation identity, and carry the mapped
  public YouTube ID separately for episode retrieval.
- New structured-ingest vectors carry `episode_id`, optional `video_id`,
  `source_asset_id`, and `source_mode` metadata.
- Upload/enqueue and edge admission reject invalid or duplicate public/private
  identities. The inventory preflight also proves each YouTube ID is paired to
  the expected hash-addressed R2 key before reporting ready.
- Queue admission and the consumer independently require the exact available
  D1 source-asset row for the public YouTube episode, R2 key, and content hash;
  a missing receipt fails closed before queue mutation or vector staging.
- Published and uncut object-key contracts are exact. A private `uncut/` key
  cannot enter the queue as published or through an omitted/unknown mode.

Text-only chat does not require a timeline alignment. Its uncut citations must
remain untimed, and the application must not claim timestamp translation or
synced playback. Cross-timeline playback remains held until trusted alignments
exist.

## Inventory and production gates

The read-only reconciliation receipt found 52 mapping rows: 49 have a usable
Cloudflare/YouTube identity and matching uncut jobs, while 3 remain held. The
preflight manifest is internally consistent and does not expose titles, URLs,
hashes, or object keys in its output.

Production activation sequence:

1. The live `wtfmedia-catalogue-v1` metadata indexes currently include only
   `source_mode`; `video_id` is absent.
2. The owner approved production on 2026-08-31. Create the `video_id` metadata
   index, then re-upsert the intended vectors only after the index exists.
3. The production D1/vector receipts still need reconciliation around the
   canonical public episode identity. No live corpus mutation was performed.
4. The narrow PR #28-compatible web adapter now forwards the page's YouTube ID
   as `episodeId` through `/api/chat` to edge `/v1/chat`.

The approved operation covers source merge, index creation, mapped-asset
activation, vector re-upsert, and edge/web deployment. DNS and secret changes
remain outside scope. The three held inventory rows remain held.

## Verification receipt

```text
Cloudflare full test suite                           150/150 passed
Episode/source-mode tests                            14/14 passed
Structured transcript-ingest tests                   19/19 passed
Queue admission tests                                 4/4 passed
Uncut identity planning test                         passed
Episode-scope manifest preflight test                passed
Wrangler Worker deployment dry-run                   passed
git diff --check                                     passed
```

The Wrangler check was a bundle dry-run only. It did not deploy or mutate
Cloudflare. Existing dependency directories were temporarily linked for local
resolution and then removed; no dependency installation or lockfile change was
made.

A read-only review initially found that the legacy ingest path still reused
the public `videoId` as the uncut source identity and that the manifest check
did not prove the YouTube-to-R2-key pairing. Both findings were corrected
before the final verification receipt above. A follow-up review also found and
closed an omitted-mode path that could have treated an uncut key as published;
the final read-only verdict was `PASS`.
