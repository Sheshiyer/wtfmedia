# Alpha evidence coherence and published-timing handoff — 2026-09-04

## State at handoff

The bounded published-timing ingest is complete in production. Thirteen exact
published sidecars were uploaded and thirteen exact repair jobs converged to
structured `wtfmedia.ingest.v2` receipts. Together they contain 1,976 timed
published chunks with `timingOrigin: published_sidecar`.

The repository implementation is on `codex/alpha-evidence-coherence`. Commit
`e86923b68467a41e888361d552301999beaffa83` is already the head of
`origin/release/alpha` and is the source ancestor used for the current Alpha
edge and web deployments. A later local three-file correction for the
`Bangalore cops` episode selector is tested and reviewed but deliberately not
deployed at this handoff. The pull request carries that correction and this
receipt so another session can continue without relying on terminal history.

## Production mutation receipt

- `wtfmedia-edge` was deployed from the reviewed evidence-coherence source as
  version `898d8a55-2c69-4169-a4b2-905c6bad01bd`. Rotating only
  `INGEST_TOKEN` through the named `wtfmedia` Wrangler profile then produced
  the current edge version `72d574cd-dd67-4fc2-a4cf-30e63434e8d7` at 100
  percent.
- All thirteen remote transcript objects matched their expected SHA-256
  digests and all thirteen D1 source-asset rows were available before enqueue.
- All thirteen approved timing sidecars were uploaded to their exact
  `timestamps/<video-id>.json` keys and downloaded again with exact hashes.
- The first enqueue received HTTP 401 while the rotated secret propagated. A
  bounded retry with the same exact payload returned `{"queued":13}`. No
  broad replay was issued.
- Final KV verification found 13/13 exact v2 receipts, zero legacy receipts in
  the repair set, and these chunk counts:

  | Published video | Timed chunks |
  | --- | ---: |
  | `2q7-cTPwf-g` | 146 |
  | `FPV5fAkqyBs` | 201 |
  | `VIlfHB7Jk2s` | 142 |
  | `0JDsFpU6pGQ` | 161 |
  | `2_yA6GoqUnY` | 111 |
  | `fEUoJSTYtyc` | 166 |
  | `LqSEfz4YUFA` | 162 |
  | `lRjprPQHuXw` | 143 |
  | `wHQiewz8k9g` | 173 |
  | `g0CjWbgsdTQ` | 152 |
  | `AdI_XWv-ZTk` | 205 |
  | `WMRO9dvD5T0` | 138 |
  | `LcWoP6KtZKw` | 76 |

- The error-only Worker tail emitted no ingest failure. Queue completions
  observed in the full tail used version `72d574cd-dd67-4fc2-a4cf-30e63434e8d7`
  and ended with outcome `ok`.
- `wtfmedia-web` was built through the checked-in OpenNext command, generated
  69/69 pages, and is currently version
  `86a9bade-d039-43e3-8d8b-0063d160ed2f` at 100 percent.
- Canonical `/` and `/chat` returned HTTP 200 after promotion;
  `/ops/settings` remained Access-gated with HTTP 302.

No DNS, Beta, authentication, unrelated secret, unrelated object, broad queue,
or D1 mutation was performed. The unrelated dirty root worktree was untouched.

## Live retrieval evidence

The production API was replayed with the reported questions while recording
only public provenance metadata:

- The supplements query returned the Longevity episode in both published and
  uncut corpora. Its published citation had a verified native YouTube time,
  while the uncut citation retained its separate approved Frame.io timeline.
- The Sam Altman and Nikhil Kamath query returned six published passages, all
  from canonical episode `SfOaZIGJ_gs`, all with verified native timestamps.
- Repaired published candidates now return non-null native times and YouTube
  seek links instead of `source_timing_unavailable`.
- The Bangalore-cops query exposed one remaining production selector bug: the
  deployed edge chose Modi episode `yTMYtcQLLaw` because the generic title
  fragment `with the` was treated as distinctive before Vectorize top-K.

The last item is a retrieval-code defect, not incomplete ingest. Production
data is complete; the code correction below still needs an edge-only release
and live acceptance.

## Tested but undeployed selector correction

`cloudflare/src/chat/catalogue-episode-anchor.ts` now:

- ignores any candidate title bigram containing a connector word;
- replaces generic one-edit topic fuzziness with the bounded recorded
  `Sunil`/`Suniel` equivalence;
- maps only four exact token-boundary aliases to Policing episode
  `LcWoP6KtZKw`: `bangalore cops`, `bangalore police`, `bengaluru cops`, and
  `bengaluru police`;
- activates an alias only when its target exists in the published catalogue;
- fails closed when a matching alias conflicts with a distinctive phrase from
  another episode.

The exact production query now resolves to `LcWoP6KtZKw` before top-K across
`published`, `uncut`, and `both`. Negative controls remain unscoped for
`Bangalore traffic`, `traffic policy`, generic `people with ...` language,
unrelated uses of policing, absent targets, and cross-episode alias conflicts.

Independent read-only review returned `PASS` after one P1 generic-bigram
finding was reproduced with a failing test and corrected.

## Verification ledger

```text
Cloudflare Worker suite                              211/211 passed
Final selector and coordinator focus                  15/15 passed
Web unit suite                                        79/79 passed
Web contract suite                                    89/89 passed
Focused MigratedChatPage Storybook                    16/16 passed
Python timing-sidecar suite                           12/12 passed
Node manifest, queue, and profile suite                 6/6 passed
TypeScript strict check                                      passed
ESLint                                                       passed
OpenNext production build                              69/69 pages
Privacy scan                                      0 / 285 violations
Wrangler edge bundle dry-run                                 passed
Desktop and exact-320px evidence-panel QA                    passed
git diff --check                                             passed
```

The full Storybook sweep is not claimed green. It retains two unrelated stale
fixtures: the EpisodesBrowser Drawer Valid Episode story lacks `episodeId`,
and the WorkspaceRoutes Ask WTF story still expects the older shared header.
The browser also reports the existing Next.js `next/config` deprecation
warning. Node's Worker tests emit the existing module-type warning because the
Cloudflare package has no explicit module type.

A fresh DLQ depth was not available from the Wrangler queue-info surface, so
this handoff does not claim one. The prior preserved baseline was 18; verify it
through an authorized metrics surface before making any new backlog claim.

## Separate next session: ingest throughput optimization

Do not re-enqueue the thirteen completed repairs merely to optimize code. The
optimization is a separate implementation and release task.

Current performance shape:

- the production queue consumer uses `max_batch_size: 1` and
  `max_concurrency: 1`;
- each passage makes one Workers AI embedding call;
- eight passage embeddings are awaited together before one Vectorize upsert;
- repaired episodes contained 76–205 chunks; the observed 173-chunk episode
  completed in 55.783 seconds, while later observed completions ranged from
  10.099 to 23.184 seconds.

The optimization must preserve these invariants:

1. Validate D1, R2 transcript identity, sidecar identity, schema, monotonicity,
   and at least 80-percent same-video coverage before vector mutation.
2. Keep normal idempotency separate from the fixed allowlisted repair path.
3. Write the v2 receipt only after every upsert and stale-vector deletion.
4. Make partial embedding or upsert failures retry-convergent without exposing
   a success receipt or deleting still-needed vectors.
5. Benchmark provider-supported batch embedding and bounded concurrency before
   changing queue concurrency, subrequest load, or memory pressure.
6. Prove unchanged vector IDs, metadata, native timestamps, receipt hashes,
   and citation behavior with failure-injection tests and a non-production
   canary before requesting another production gate.

## Pickup sequence

1. Review the pull request against `main`, including the release branch's
   divergence from the Beta commits already on `main`; do not resolve conflicts
   by dropping either public Alpha or protected Beta behavior.
2. From the PR head, rerun the 211 Worker tests and Wrangler dry-run.
3. With a fresh owner production gate, deploy only `wtfmedia-edge`. The current
   rollback target for that deploy is edge version
   `72d574cd-dd67-4fc2-a4cf-30e63434e8d7`.
4. Replay the Bangalore query across all three source modes. Every returned
   passage must belong to `LcWoP6KtZKw`; published evidence must retain finite
   native timestamps. Recheck Sam and supplements for non-regression.
5. Verify the canonical Alpha UI in the in-app browser, including evidence
   grouping, view-only filters, cited-versus-candidate labels, and timestamped
   published actions. Do not use the ambient YouTube tab as proof.
6. Record the final edge version and production results before changing PR
   readiness or merging.
7. Start the ingest-throughput work as a separate branch/session, without
   replaying already-converged production jobs.

