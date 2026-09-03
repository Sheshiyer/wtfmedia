# Beta consolidation evidence packet — 2026-09-03

## Scope and gate status

This packet records the selective `03-00` integration and the bounded staging
verification for the authenticated Beta slice. The Alpha baseline is
`ee00c28` (`origin/main`, `v0.3.2-alpha.1`). Public `/chat` and `/api/chat`
remain anonymous, stateless, and feature-compatible; authenticated history is
only reachable behind the protected `/ops` boundary and the server release
manifest.

The candidate was reconciled file-by-file. The old candidate Worker entrypoint,
temporary super-admin roster migration, broad public UI sweep, workflow noise,
and root checkout WIP were excluded. No whole-branch cherry-pick was used.

Integrated commits:

- `4944940` protected chat history and release gate
- `66d8733` server-generated answer persistence
- `3537e2d` authenticated turns through server RAG
- `7ae9da4` Alpha baseline and Beta track separation
- `24f7bb4` Access-protected release entry
- `e9294c7` operator context boundary correction
- `f8fd26c` protected logout return to Alpha
- `f484ed3` `03-00` integration-gate receipt

## Staging infrastructure and migration receipt

Staging was deployed only through the named staging targets. The staging
configuration now defaults safely to the suffixed Worker names, so an omitted
CLI name cannot target the Alpha Worker.

- Web: `wtfmedia-web-staging`
- Edge: `wtfmedia-edge-staging`
- Access-facing host: `wtfmedia-web-staging.connect2nikhai.workers.dev`
- Separate staging D1, KV, R2, Vectorize, ingest queue, and DLQ bindings were
  resolved in the Wrangler dry-run.
- `d1 migrations list DB --remote`: no pending migrations.
- `d1 migrations apply DB --remote`: no migrations to apply.
- Edge staging deployment: version `cc5497c9-c417-4eb6-87aa-83bf54615026`.
- Web staging deployment: version `af504823-504f-4281-aeca-620c59f38cc4`.
- Staging queue verification: one producer and one consumer, both owned by
  `wtfmedia-edge-staging`.

During an earlier target-resolution mistake, a staging candidate briefly
updated the base Worker's queue trigger. The candidate was rolled back and the
base Worker was restored from clean Alpha source with production bindings:

- Base Alpha restore version: `2271c53d-7a0f-4902-b194-af27036f7d0e`.
- Production ingest queue: one producer and one consumer, both owned by
  `wtfmedia-edge`.
- No production web deployment, migration, data, secret, DNS, or ingest
  payload mutation occurred.

## Automated verification

All commands ran from the isolated integration worktree. Visual snapshot tests
were intentionally not run; behavioral browser coverage remains required.

- Cloudflare: `npm test` — 175 passed, 0 failed.
- Web unit: `npm run test:unit` — 81 passed across 21 files.
- Web contracts: `npm run test:contracts` — 86 passed across 8 files.
- Web typecheck and lint — passed with zero warnings treated as errors.
- Privacy scan: 0 violations across 301 bounded files.
- OpenNext Cloudflare build — passed; `/ops/api/[...path]` is in the route
  manifest.
- Full Playwright behavior/a11y/journey run — 228 passed, 8 skipped out of
  236 tests using `--grep-invert @visual`.
- Rollback rehearsal — 19 legacy and 19 migrated checks passed for 8
  route/variant combinations; protected data integrity remained unchanged.

The deterministic matrix covers Access JWT validation and rejection,
active-operator resolution, role authorization, owner isolation, retry
idempotency, archive-only lifecycle, administrator export, server RAG/source
mode projection, release pause/rollback, public statelessness, privacy, and
Alpha variant rollback.

## Live staging behavior

Sanitized Playwright request/browser probes passed without exposing redirect
tokens or credentials:

- Staging `/` and `/chat`: HTTP 200.
- Staging `/ops/settings` and `/ops/api/release/authenticated-chat`: HTTP 302
  to Cloudflare Access.
- Direct staging edge `/ops/settings`: HTTP 404, confirming the edge Worker is
  not the public Access entrypoint.
- A headless browser reached the public staging home and chat, while the
  protected settings navigation ended at the Cloudflare Access login route.
- Production public `/` and `/chat`: HTTP 200 read-only probe.

The live authenticated session, logout/reauthentication continuity, and
operator settings readback still require an interactive Access login. No
credential or browser session was available to this non-interactive run, so
those rows remain explicitly open rather than inferred from local headers.

## Approval and merge gate

- Staging deployment authorization: exercised by the current owner request.
- Evidence-packet owner approval: pending explicit owner review.
- Integration PR: open only after this packet and the final checks are
  committed.
- Merge: blocked until the interactive authenticated matrix is completed,
  owner approval is recorded, PR checks are green, and the public Alpha
  invariance probe passes.

The current safe state is Alpha public behavior unchanged, Beta protected and
feature-off by default, staging isolated, and rollback available through the
server release manifest.
