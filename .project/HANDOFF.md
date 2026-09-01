# Project handoff

## 2026-08-31 Ask WTF three-mode source toggle

**Status:** EDGE + WEB DEPLOYED TO TARGET DOMAIN - Ask WTF now has one shared
three-way source selector: `yt`, `uncut`, and `both`. The selected mode is sent
to `/api/chat`, forwarded to the edge Worker, and reflected in the source drawer
without adding a second interactive toggle inside old answers.

- `published` remains the internal API value for YouTube mode, but the public
  button and source drawer label show `yt`.
- `uncut` still queries the uncut Vectorize partition first and never exposes
  public URLs for uncut citations.
- `both` is now a real edge request mode. It combines unfiltered published
  retrieval with a filtered uncut Vectorize query, balances at least one
  relevant source from each family when available, preserves each citation's
  own `source_mode`, and returns `X-Source-Mode: both`.
- The web proxy now preserves per-source `source_mode` from `X-Sources`; in
  `both` mode it does not blank timestamps just because a citation is published
  or uncut under the combined answer mode.
- The source drawer renders a read-only `yt` / `uncut` / `both` indicator. The
  only interactive source-mode control is the composer group.
- Deployed edge version: `0884905f-aa18-4b92-bb14-9a5e154f774a`. Deployed web
  version: `0030d22a-4765-49ce-8f1a-5e52bcf668d4`.
- Fresh verification: `cd cloudflare && npm test` passed 145/145;
  `cd web && npm run typecheck`, `npm run lint`, and `npm run build` passed;
  `npx vitest run --project=contracts tests/contracts/api-chat.contract.test.ts`
  passed 22/22; `npx vitest run --project=unit tests/unit/source-mode.test.ts`
  passed 4/4; `npx playwright test tests/journeys/chat.spec.ts
  --project=phase1-chromium` passed 19/19; `git diff --check` passed.
- Live API smoke on `https://wtfhq.in/api/chat`: `published` returned 200 with
  six published sources and six URLs; `uncut` returned 200 with two uncut
  sources and zero URLs; `both` returned 200 with mixed `uncut` and `published`
  sources and `X-Source-Mode: both`.
- Live browser check on `https://wtfhq.in/chat` at 1119x634 showed three
  composer buttons (`yt`, `uncut`, `both`), `both` sent `sourceMode: "both"`,
  the source drawer showed active `both`, and there was no horizontal overflow.

## 2026-08-31 Ask WTF source-mode toggle UI fix

**Status:** WEB DEPLOYED TO TARGET DOMAIN - the chat composer is now the single
interactive source-mode toggle, labelled `yt` / `uncut`; the source drawer only
mirrors the returned answer mode and no longer renders a second disabled button
that can show `uncut` / `uncut`.

- `AskComposer` keeps the existing internal `published` / `uncut` API contract
  but displays published mode as `yt` for the user-facing toggle.
- `SourcePanel` now renders a read-only `yt` / `uncut` mode indicator with the
  active returned mode. It has no nested source-mode buttons, so historical
  answers cannot imply they can be retoggled without asking again.
- `MigratedChatPage` preserves each source record's own `source_mode` from
  `X-Sources` and only falls back to `X-Source-Mode` when a source omits it.
- Deployed web worker version: `3f3f05e7-912a-4593-9297-a1e2ffb9a704`.
- Fresh verification: `npm run typecheck`, `npm run lint`, `npm run build`,
  `npx playwright test tests/journeys/chat.spec.ts --project=phase1-chromium`
  passed 18/18, and `git diff --check` passed.
- Live-domain browser verification on `https://wtfhq.in/chat`: uncut asks sent
  `sourceMode: "uncut"` and showed active `uncut`; YouTube asks sent
  `sourceMode: "published"` and showed active `yt`; the source drawer had zero
  nested buttons and no horizontal overflow at 893x690.
- Live API smoke after deploy: `https://wtfhq.in/api/chat` uncut returned 200
  with uncut sources and zero URLs; published returned 200 with published
  sources and six URLs.

## 2026-08-31 Uncut SRT ingest activated on target domain

**Status:** COMPLETE FOR 8 APPROVED SRT ASSETS - downloaded, stored locally in
ignored project input space, uploaded to target R2, enqueued, vectorized,
filtered by `source_mode`, and live-query verified on `wtfhq.in`. Secret values
were rotated through Wrangler and never read back, printed, or committed.

- Source workbook pass used the local downloaded spreadsheets and Google Drive
  file access. Eight clean English SRT assets were accepted: `WTF is
  Skincare?`, `Neal Mohan`, `Vinod Khosla`, `AR Rahman`, `Dario Amodei`,
  `Chamath Palihapitiya`, `Nikos Christodoulides`, and `Ray Dalio`.
- Local approved assets live under ignored path
  `.planning/inputs/uncut-local/approved-2026-08-31/` as row-hash `.txt`
  files plus a local manifest. They are not committed and no transcript body is
  recorded in this handoff.
- Two spreadsheet candidates remain held: `AI Minister: Omar Al Olama` pointed
  at a subtitle file titled `English_WTF is Policing.srt`, and `WTF Bootcamp`
  resolved to a `Howard Marks` folder. Neither was ingested.
- R2 proof: remote `wtfmedia-catalogue/uncut/{rowHash}.txt` readback matched
  the local SHA-256 for all 8 approved assets. Fresh bounded readback checked 8
  and matched 8.
- Queue/Vectorize proof: all 8 `ingest:uncut:{rowHash}` KV completion markers
  are present in remote `WTFMEDIA_STATE`; Vectorize
  `wtfmedia-catalogue-v1` reports 6,354 vectors at 1024 dimensions with
  `source_mode` listed as a String metadata index.
- Code hardening added short uncut vector IDs (`u:{hash-prefix}:{chunk36}`) so
  Vectorize IDs stay under the 64-byte limit, bounded queue continuation so
  large SRTs avoid Worker subrequest exhaustion, remote R2 puts in the uncut
  apply script, and a filtered uncut Vectorize query path. Published mode stays
  unfiltered so legacy published vectors inserted before the metadata index
  remain queryable.
- Deployment receipt: current edge deployment is version
  `052dbe08-f833-4575-a460-ef6cd5bfa29b`, a secret-change successor to code
  deploy `99bb1917-f83a-422e-901b-f18470598b11` (`Filter uncut Vectorize
  queries`). Current web deployment remains
  `3d89c97f-9397-413b-95b4-191c045da1f8`.
- Domain proof: `https://wtfhq.in/chat` returned HTTP 200 and DNS resolves to
  Cloudflare addresses. Live `https://wtfhq.in/api/chat` published mode returned
  200 with six published sources and YouTube URLs. Live uncut mode returned 200
  with `X-Source-Mode: uncut`, `X-Uncut-Unavailable: false`, four uncut
  sources, no URLs, and timed citations.
- Fresh local verification after these changes: `cd cloudflare && npm test`
  passed 144/144, `node --test scripts/put-uncut-and-enqueue.test.mjs` passed
  1/1, and `git diff --check` passed.

**Still held:** the suspect Omar/Bootcamp spreadsheet links need corrected
approved source files before ingest. Signed uncut playback remains out of scope;
current uncut citations intentionally expose only uncut source IDs and clocks,
not public media URLs.

## 2026-08-30 Uncut ingest queue attempt

**Status:** BLOCKED ON CORPUS + LOCAL TOKEN — no uncut upload or queue mutation
was performed. The target ingest path remains deployed and queryable, but the
approved uncut `.txt` files were not present in the searched Thoughtseed
workspace paths, and this shell did not have `INGEST_TOKEN` or `INGEST_SECRET`
in the environment.

- Dry-run command:
  `node scripts/put-uncut-and-enqueue.mjs --dir /Volumes/madara/2026/Projects/thoughtseed/wtfmedia-release-integration/.planning/inputs/uncut-local --dry-run`
- Dry-run receipt: mode `dry-run`, enqueue URL
  `https://wtfmedia-edge.connect2nikhai.workers.dev/v1/admin/enqueue`, 10
  eligible title-map candidates, 0 planned uploads, 0 skipped files.
- Live query check: workers.dev `/api/chat` with `sourceMode: "uncut"` returned
  200 and `X-Fallback: false`, but `X-Source-Mode: published` and
  `X-Uncut-Unavailable: true`, confirming the mode is reachable and still
  truthfully falls back until uncut vectors exist.
- Inventory after attempt: R2 `wtfmedia-catalogue` remained 99 objects /
  13.2 MB; Vectorize `wtfmedia-catalogue-v1` remained 5,742 vectors.

**To execute once inputs exist:** place approved files named by title/slug or
64-hex row hash in a non-published directory, export `INGEST_TOKEN` or
`INGEST_SECRET` locally, then run:
`node scripts/put-uncut-and-enqueue.mjs --dir /ABS/PATH/TO/UNCUT_TXT --apply`.

## 2026-08-31 Uncut ingest approval follow-up

**Status:** STILL BLOCKED ON MISSING LOCAL INPUTS — owner approval to proceed
was received, but no approved uncut `.txt` files were present locally and this
shell still had no `INGEST_TOKEN`, `INGEST_SECRET`, `UNCUT_DIR`,
`WTFMEDIA_EDGE_URL`, or `WTFMEDIA_ENQUEUE_URL` environment values.

- Targeted search found no matching `.txt` files for the 10 eligible title-map
  candidates by title or 64-hex row-hash prefix under the likely local project,
  Desktop, Documents, and Downloads paths.
- Dry-run against
  `/Volumes/madara/2026/Projects/thoughtseed/wtfmedia-dual-source-chat/.planning/inputs/podcast-catalog/local-raw`
  reported 10 eligible candidates, 0 planned uploads, and 0 skipped files; the
  directory only contained `.gitignore`.
- Remote secret names still exist on the edge worker, including `INGEST_TOKEN`,
  but secret values cannot be read back safely from Cloudflare and were not
  printed or copied.

**Next executable gate:** put approved uncut transcript files into a reachable
non-published directory and export a local `INGEST_TOKEN`/`INGEST_SECRET`, or
authorize a fresh ingest-token rotation at the same time those files are
present.

## 2026-08-31 Second proceed attempt

**Status:** STILL NO MUTATION — a second proceed approval was received, but the
machine state did not change. Broad search found only metadata JSON ledgers and
placeholder `.gitignore` files in `local-raw` / `uncut-local`; no approved
uncut transcript bodies were available to upload.

- Environment check still showed `INGEST_TOKEN`, `INGEST_SECRET`, `UNCUT_DIR`,
  `WTFMEDIA_EDGE_URL`, and `WTFMEDIA_ENQUEUE_URL` absent.
- Candidate metadata ledgers under
  `.planning/inputs/podcast-catalog/2026-08-27/transcripts/*.json` contain
  `meta` and `records` with redacted URL policy and row hashes; they are not
  uncut transcript bodies and were not converted into corpus content.
- Edge secret names still include `INGEST_TOKEN`, but Cloudflare secret values
  remain unreadable by design.

**Required before queueing:** provide a reachable directory of approved uncut
transcript text files. Without those files, running `--apply` would fail with
`no_eligible_uncut_files` or create a false corpus.

## 2026-08-30 Dual-source Ask WTF hardening for Vectorize/domain cutover

**Status:** TARGET PREVIEW UPDATED + SECRETS ROTATED + CUSTOM DOMAIN ATTACHED
BY WRANGLER — branch `codex/wtfmedia-dual-source-chat` from
`wtfmedia-release-integration` @ `b88a1fd`. Edge and web were deployed through
the `wtfmedia` Wrangler profile; fresh paired secrets were generated through
`cloudflare/scripts/deploy-target.mjs` in mode-restricted temp files and then
deleted; no secret values were read or printed; no uncut corpus was uploaded.

- Chat retrieval now asks Vectorize for a wider source pool (`topK: 48`) before
  applying the existing `source_mode` partition, reducing false uncut
  unavailable states when uncut vectors are sparse behind published matches.
- Edge answer validation now rejects model output unless each asserted sentence
  carries an in-range source citation; explicit no-evidence abstentions,
  citation ranges, short section lead-ins, initials, and common episode
  abbreviations remain allowed.
- Edge answer generation now has a zero-temperature citation rewrite pass before
  returning the grounded fallback, so normal model wording can be made compliant
  without inventing new support.
- Edge CORS now accepts a comma-separated exact-origin allowlist. The target
  config includes both `https://wtfmedia-web.connect2nikhai.workers.dev` and
  `https://wtfhq.in` so the same reviewed source can support preview and the
  eventual custom domain.
- Published and uncut enqueue scripts now share an explicit target resolver:
  `WTFMEDIA_ENQUEUE_URL` wins, otherwise `WTFMEDIA_EDGE_URL` is expanded to
  `/v1/admin/enqueue`, otherwise the target workers.dev edge remains default.
  The published enqueue script now sends `sourceMode: "published"` explicitly.

**Verified locally:** `cd cloudflare && npm test` passed 142/142 after
`npm ci`; `cd web && npm run typecheck`, `npm run lint`, `npm run build`, and
`npm run cf:build` passed; `node --test scripts/put-uncut-and-enqueue.test.mjs`
passed 1/1; `node --check` passed for both enqueue scripts; `git diff --check`
passed.

**Deployed:** edge `wtfmedia-edge` current version
`8b5a023d-aff4-4274-8d2e-9b3a2248f0a2`; web `wtfmedia-web` current version
`3d89c97f-9397-413b-95b4-191c045da1f8`. Wrangler reported the web custom
domain `wtfhq.in`; local DNS still did not resolve `wtfhq.in`, so browser/API
verification remains on the workers.dev preview until DNS propagates or the
zone delegation is corrected.

**Live verified:** edge `/v1/health` 200 with
`Access-Control-Allow-Origin: https://wtfhq.in`; direct edge `/v1/chat` without
secret remains 401; workers.dev `/api/chat` published returned 200,
`X-Fallback: false`, `X-Source-Mode: published`, six published sources with
YouTube timestamps; workers.dev `/api/chat` uncut returned 200,
`X-Fallback: false`, `X-Source-Mode: published`,
`X-Uncut-Unavailable: true`, six published sources. No published timestamp was
converted to uncut.

**Infra receipt:** target secrets are present by name only (`EDGE_SHARED_SECRET`,
`INGEST_TOKEN`); R2 `wtfmedia-catalogue` reports 99 objects / 13.2 MB; Vectorize
`wtfmedia-catalogue-v1` reports 5,742 vectors at 1024 dimensions; KV
`WTFMEDIA_STATE` listed 0 keys; `wtfmedia-ingest` has one producer and one
consumer.

**Still held:** approved `uncut/{hash}.txt` files were not found, so no uncut
assets were uploaded and no ingest jobs were enqueued. DNS for `wtfhq.in` did
not resolve from this machine after the Wrangler custom-domain receipt.

## 2026-08-30 Uncut Cloudflare asset map wired into ingest and chat

**Status:** TARGET PREVIEW UPDATED — inventory-aligned keys for published
YouTube and uncut. No uncut objects were uploaded. Chat still answers uncut
requests from published YouTube and names them published until
`uncut/<hash>.txt` exists.

| Surface | Published | Uncut |
|---|---|---|
| R2 | `transcripts/{videoId}.txt` | `uncut/{rowHash}.txt` |
| KV | `ingest:{videoId}` | `ingest:uncut:{id}` |
| Vectorize | `{videoId}:{chunk}` | `uncut:{id}:{chunk}` |
| Queue job | `sourceMode: published` | `sourceMode: uncut` and key must start `uncut/` |

12 title-map candidates reserve uncut keys. 3 quarantined titles get none.
Enqueue rejects uncut jobs that point at published keys.

## 2026-08-30 Ask WTF uncut falls back to published YouTube

**Status:** TARGET PREVIEW UPDATED — the music question on uncut no longer
dead-ends. Uncut still has no corpus, so chat answers from published YouTube
and names it published. No timestamp is converted to uncut. Secrets not
rotated. No DNS/cutover.

Live: same question grounded in both modes; uncut sets `X-Uncut-Unavailable:
true` and `X-Source-Mode: published` with six published sources.

## 2026-08-30 P0 dual-source Ask WTF joined to target preview

**Status:** TARGET PREVIEW UPDATED — dual-source `sourceMode` and the
privacy-safe title map are on `wtfmedia-release-integration` and deployed
to workers.dev. Secrets were not rotated. No DNS, Custom Domain, source
quiesce, Pages, Access, or `default` mutation.

- Edge filters Vectorize `source_mode` before composition. Missing metadata
  is published. A published timestamp is never rewritten as uncut.
- YouTube ingest still writes `ingest:{videoId}` and stamps
  `source_mode: "published"`. Uncut would use `ingest:uncut:{videoId}` and
  is not activated.
- `/chat` exposes published/uncut. Uncut stays unavailable until mapped
  uncut citations exist.
- Title map (59 mapped / 3 quarantined, no URLs) renders on `/ops/episodes`
  above the existing live-catalogue empty state.

**Live verify (browser UA, no answer bodies retained):**
- `GET /chat` 200; published/uncut controls present
- `GET` edge `/v1/health` 200; direct `/v1/chat` 401
- `POST /api/chat` published: 200, `X-Source-Mode: published`,
  `X-Fallback: false`, 6 published sources
- `POST /api/chat` uncut: 200, `X-Source-Mode: uncut`, fallback true,
  0 sources

**Held:** `wtfhq.in` attach, source high-water/quiesce, uncut activation.

## 2026-08-30 Target Cloudflare preview and D1 calendar live

**Status:** TARGET PREVIEW DEPLOYED — the owner-confirmed canonical
`codex/wtfmedia-release-integration` worktree is reconciled with PR #23 and is
deployed through the mapped `wtfmedia` profile. This is workers.dev preview
proof, not `wtfhq.in` cutover.

- Target `wtfmedia-edge` is live with R2 `wtfmedia-catalogue`, KV
  `WTFMEDIA_STATE`, Vectorize `wtfmedia-catalogue-v1`, D1 `wtfmedia-ops`,
  Workers AI, and `wtfmedia-ingest` bindings. The queue lists one edge producer
  and one edge consumer; the target DLQ remains configured.
- Target `wtfmedia-web` is live as an OpenNext Worker with static assets,
  Images, self-reference, and a least-privilege service binding to the edge
  Worker. No Pages project was created.
- D1 migration `0006_public_calendar.sql` adds the public calendar tables,
  indexes, revision/no-delete enforcement, and append-only mutation receipts.
  Public list/create/update crosses only the same-origin web API and paired
  server secret; delete remains unavailable.
- Fresh paired edge/web shared authority and ingest authority were generated in
  private mode-restricted temporary files for each deploy, placed through
  Wrangler, then overwritten and removed locally. No secret or account-scoped
  identifier is committed.
- Live verification passed: edge health 200; direct calendar/chat/ingest 401;
  web root 200; one grounded Ask WTF response with six catalogue sources;
  calendar create/update/reload; and D1 readback. The retained operational
  preview record is `on-calendar`, revision 3, with three append-only receipts.
  One extra anonymous update receipt cannot be attributed by design; the final
  record fields are unchanged and no identity is inferred.
- Browser verification at compact and desktop widths found the persisted
  record, responsive calendar controls, no horizontal overflow, and no console
  warnings/errors. It exposed one stale local-only sentence; a failing browser
  assertion was added, the production/Settings/manifest copy was corrected,
  and the paired Workers were redeployed with another fresh secret rotation.
- Fresh verification: edge 127/127; web typecheck and lint; 59 unit, 101
  component, and 84 contract tests; focused production journeys; Next build;
  OpenNext build; and `git diff --check`.

**Held next:** keep `9d9d` read-only until a separately authorized quiesce and
final R2/KV/Vectorize delta. Do not touch `default`. Do not attach `wtfhq.in`,
change DNS, create Access/RBAC, create Pages, or delete source resources until
their recorded gates are separately satisfied.

## 2026-08-30 PR #23 merged baseline accepted for release integration

**Status:** `origin/main` at `e0791f8` is the reviewed UI baseline. The
`codex/wtfmedia-release-integration` worktree is the owner-confirmed canonical
integration surface for the target-account Worker and calendar wave.

- PR #23 supplies the public room, unified Settings, compact lists, dock
  controls, theme repairs, and truthful browser-local production calendar UI.
- Its recorded local checks passed TypeScript, lint, 49 unit, 101 component,
  78 contract, 21 accessibility, production build, and 216 responsive browser
  checks; the Vercel PR preview passed.
- The existing Phase 2 `jose` failure is an install-state gate: `jose@6.2.10`
  is declared in `cloudflare/package.json` on the merged baseline and must be
  installed before the edge suite is used as deployment evidence.
- This merge receipt alone does not claim a Cloudflare target deployment,
  secret placement, D1 calendar backend, source quiesce, DNS change, or domain
  cutover.

## 2026-08-30 Compact public lists and shared settings UI

**Status:** LOCAL UI INTEGRATION — scoped to `codex/wtfmedia-release-integration`. No D1 record, calendar provider, asset transfer, Cloudflare resource, deployment, DNS record, secret, RBAC policy, or production state was changed.

- `/connections` now shows eight ideas and eight overlaps by default, with accessible reveal/collapse controls. A selected source receipt also starts its direct overlaps and published sources compact before revealing the complete public list.
- The public home page no longer renders the workspace-state matrix or its paired evidence-receipt panel. It moves directly from the source spotlight to the source rail.
- `/settings` uses the existing `SettingsWorkspace` UI instead of maintaining a separate public settings screen. It exposes browser-local appearance and truthful held integration states only; there are no configure, connect, save, or apply actions. `/ops/settings` retains the same shared UI behind its existing route gate.
- The desktop dock and compact controls include Settings. The compact controls surface is navigation and source-chat only; appearance and declarative capability inventory are removed from it.
- Verified locally: TypeScript; ESLint; privacy scan (0 violations across 271 bounded files); `git diff --check`; focused route/token contracts (10/10); targeted Connections, home, settings, and controls Playwright at 320px (24/24 plus 2 viewport-inapplicable skips), 768px (24/24 plus 2 skips), and 1440px (26/26); and Next production build. Fresh in-app-browser review of `/`, `/settings`, `/connections`, and `/production` found no horizontal overflow or console warnings/errors.
- The broad `npm run test:contracts` is not a fresh green proof: its four `rag-latency` cases return the safe unconfigured 503 rather than the test fixture's expected 200. That external/RAG condition is outside this UI-only change.

**Review next:** review the local integration candidate at `/`, `/connections`, `/settings`, and `/production`. Do not infer provider wiring, credential setup, RBAC enforcement, merge, Cloudflare cutover, or release authorization from this checkpoint.

## 2026-08-30 Public production-calendar UI showcase

**Status:** LOCAL UI INTEGRATION — scoped to `codex/wtfmedia-release-integration`. No D1 record, calendar provider, asset transfer, Cloudflare resource, deployment, DNS record, secret, or production state was changed.

- Public `/production` now projects the existing calendar and board as a browser-local visual showcase. It supports local planning sketches only and expressly states that schedules, owners, assets, and providers are not connected.
- `production` is available from the desktop navigation dock and compact workspace controls. The public home workspace directs reviewers to this local showcase.
- The existing operator `/ops/production` stays the separate restricted workspace; its internal beta-review cards are not rendered on the public showcase.
- Verified locally: TypeScript; ESLint; unit tests (56/56, with the pre-existing post-completion hanging-process warning); production/home Playwright across 320px, 768px, and 1440px (15/15); Next production build; privacy scan (0 violations across 270 files); `git diff --check`; and direct local preview at `/production` from both the dock and the route. The local server returned `GET /production 200`.

**Review next:** review the local UI candidate at `/production`. Do not infer D1/calendar/provider wiring, asset migration, merge, Cloudflare cutover, or release authorization from this checkpoint.

## 2026-08-30 Chat control and appearance repair

**Status:** LOCAL IMPLEMENTATION — scoped to `codex/wtfmedia-release-integration`. No source worktree, Cloudflare resource, deployment, DNS record, provider, secret, or production state was changed.

- The public Ask WTF composer now reflows its label, help text, field, and action without horizontal clipping; its action is full-width on compact screens and a stable 128px control at wider sizes.
- Shared buttons now have consistent interaction transitions and an explicit semantic disabled surface. The public retry fallback is concise and does not expose internal-handoff wording in the chat transcript.
- Appearance controls retain the same visual language and apply atomically, preventing any low-contrast frame while a persisted or newly selected theme takes effect.
- The obsolete compact left navigation drawer and hamburger trigger are retired across public and operator shells. Compact navigation, appearance, public-workspace, and sign-out paths are all available from the existing right-side workspace controls surface.
- Verified locally: typecheck; ESLint; unit tests (56/56); focused controls/appearance/operator Playwright (16/16); chat Playwright at 320px, 768px, and 1440px (48/48); privacy scan (0 violations across 268 files); and `git diff --check`. The unit runner reports its pre-existing post-completion hanging-process warning after all tests pass.

**Review next:** visual review the local integration candidate. Do not infer merge, release, Cloudflare migration, or production authorization from this checkpoint.

## 2026-08-30 Reviewable internal-release integration

**Status:** LOCAL REVIEW BRANCH — `codex/wtfmedia-release-integration` combines the separate Cloudflare web-migration delta and the uncommitted UI Wave 1 delta above their shared `568022a` base. It is not committed, merged, deployed, or connected to a provider. Neither source worktree was modified.

- The merged package graph keeps the Cloudflare migration's Next 15.5.24, OpenNext 1.20.4, and Wrangler 4.125.0 with UI Wave 1's `motion@12.23.24` Dock dependency.
- Desktop uses the intended label-visible bottom dock. The mobile navigation drawer is now entirely the structural dark surface with token-backed cream inactive labels and markers; a rendered 320px check measured 16.26:1 contrast with no horizontal overflow.
- The source-labelled beta review cards remain browser-local only and do not represent a D1, Cloudflare, shared-audit, or release-approval record.
- The intake record at `.planning/inputs/client-questions/2026-08-30-internal-release-evidence-intake.md` captures the three quarantined rows, a synthetic 20-query evaluator pack, and ten blank alignment-evidence intake cases. No synthetic row is an authored answer key or alignment proof.
- Verified locally: clean dependency install; TypeScript; ESLint; privacy scan (0 violations across 268 bounded files); unit tests (56/56); `/api/chat` contracts (20/20); Next production build; OpenNext Cloudflare build; and focused 320px/1440px production + shell Playwright (14 passed, 2 intended desktop-dock skips).

**Review next:** provide the three Q-row outcomes, replace synthetic evaluator entries with a client-authored answer key, complete ten evidence references, and separately authorize the Phase 3 Access implementation. Do not use this review branch as deployment or activation authority.

## 2026-08-29 Cloudflare-native web Worker preview

**Status:** PREVIEW DEPLOYED — direct owner request authorized a separate
Cloudflare preview Worker at
`https://wtfmedia-web.sheshnarayan-iyer.workers.dev`. No DNS, Vercel deletion,
secret rotation, Access application, or production `/ops` cutover has occurred
at this checkpoint.

- `web/` now builds as the `wtfmedia-web` OpenNext Worker with static assets,
  Cloudflare Images, a self-reference, and a least-privilege service binding
  to the existing `wtfmedia-edge` Worker.
- `/api/chat` preserves its public contract but uses the internal Worker
  service binding. It needs an owner-managed `EDGE_SHARED_SECRET` on the new
  web Worker before live answers can succeed; do not place the secret in
  source or rotate the existing core secret during this migration.
- The Vercel-specific metadata fallback and stale local-vector trace were
  removed. The current frontend package is Next 15.5.24 with OpenNext 1.20.4
  and Wrangler 4.125.0.
- Passed locally: TypeScript, ESLint, focused `/api/chat` contracts (20),
  OpenNext build, and an explicit `--profile 9d9d` Wrangler dry run.
- Live preview smoke: `/`, `/episodes`, and `/chat` return public HTML; the
  preview metadata resolves to the preview host; `/api/chat` safely returns
  its unconfigured 503 until the secret handoff; and direct `/ops` renders the
  reauthentication recovery state.

**Pick-up:** Read `docs/CLOUDFLARE-WEB-MIGRATION.md`. Deploy only with
`npm --prefix web run cf:deploy:9d9d`; do not persistently activate a Wrangler
profile. Keep Vercel as rollback until an owner-approved custom hostname,
secret handoff, public/chat smoke checks, and `/ops` Access migration have
passed.

## 2026-08-29 Internal beta discrepancy-review checkpoint

**Status:** LOCAL IMPLEMENTATION — isolated `codex/wtfmedia-ui-wave1` branch only. No Cloudflare suite dependency, operator-policy draft, D1 record, deployment, provider, secret, or primary-checkout state was changed.

- `/ops/production` now exposes two source-labelled review cards for the observed local `jose` dependency gap and the unreviewed `/ops/episodes` policy boundary.
- Each card shows source, scope, affected field, observed condition, and recommended next action. An operator can select a disposition and add a note, which persists only in that browser's local storage.
- The UI expressly says `not a shared audit record` and prohibits credentials, tokens, private media, and raw transcripts; it does not claim a release approval or a Cloudflare/D1 action.
- Verified: targeted Vitest 5/5; typecheck; authenticated production Playwright 8/8 across 320px and 1440px; local desktop/narrow rendered review. The only test adjustment gave the existing planner note a unique accessible name (`production note`) so it remains distinct from a beta `review note`.

**Next action:** Owner review can disposition the two gaps in beta. Repairing the local test dependency or reviewing the `/ops/episodes` policy draft remains separately scoped work; do not use a local beta record as closure evidence.

## 2026-08-29 Additive UI Wave 1 refinement checkpoint

**Status:** LOCAL IMPLEMENTATION — isolated branch `codex/wtfmedia-ui-wave1`; no merge, deploy, secret, provider, Cloudflare, or primary-checkout mutation.

- The desktop fixed rail is replaced by a label-visible, ReactBits-Dock-derived navigation dock; the mobile drawer remains the accessible small-screen navigation.
- `/connections` is reduced to one searchable public idea atlas with a semantic index and selected public source receipt. It does not infer ranking, relationships, ownership, or operational state.
- Global Ask WTF controls may navigate, change only browser-local appearance, and route a source question to public `/chat`. The capability register is intentionally declarative: it exposes no endpoint, credential, model/provider response, privileged Worker action, or false connection state.
- `motion@12.23.24` is added solely for the Dock interaction. The legacy rollback, public URLs, cloud runtime, existing Wave 1 draft work, and all separately gated integrations remain unchanged.
- Verified locally: typecheck, 6 focused unit tests, combined 320px/1440px Playwright (48 passed; 2 intentional mobile-project skips for desktop-only Dock checks), privacy scan (0 violations), build, and diff whitespace check. Matching UI Wave 1 ISCs are recorded in `ISA.md`. Do not treat this local UI evidence as Cloudflare or provider activation proof.

## 2026-08-29 Client-question status review

**Status:** LOCAL DOCUMENTATION — the client-question index at
`.planning/inputs/client-questions/README.md` separates active owner/editorial
inputs from historical records. No provider, deployment, credential, or media
action was taken.

- Still open: canonical IP/show taxonomy and mapping, the editorial 20-query
  evaluation set, third-party share rotation, and the consolidated Phase 3
  live-activation inputs.
- Historical/resolved: the filled Plan 02-12 authorization form is not current
  Cloudflare runtime proof; the A+B+D shell choice shipped in PRs #12/#13; the
  2026-08-27 git-state backlog is archival only.
- The Phase 3 packet now distinguishes local regression/source recovery from
  live activation, keeps YouTube OAuth-only, and directs sensitive connection
  details to an owner-managed secure channel rather than Git.
- Keep untracked `/ops/episodes` and `/ops/ingest` drafts out of commits and
  release evidence until individually reviewed.

## 2026-08-29 Architecture inventory + Phase 1 Access boundary

**Status:** LOCAL DOCUMENTATION — current repository architecture is recorded in [`docs/architecture/architecture.html`](../docs/architecture/architecture.html). No Cloudflare account, Access Application, policy, hostname, seat, D1 binding, OAuth account, calendar, MCP host, or OTA channel was configured or verified.

- Repository Phase 1 remains a public compatibility/proof release; it is **not** gated by Cloudflare Zero Trust or Access provisioning.
- The `/ops` UI, seat/RBAC schema, future Access JWT verifier, and loopback-only development context are modeled code, not evidence of a live protected application or assigned operator account.
- `npm run docs:architecture:update` regenerates the HTML ledger and compact companion inventories from reviewed source facts; `npm run docs:architecture:check` is the deterministic freshness gate used by the architecture CI workflow.
- The current inventory makes historical deployment/Phase 2 closure text visible as historical evidence only. The worker queue/cron, asset upload, OAuth, hosted MCP, calendar, release, and OTA holds remain explicit.
- The editor navigation now remains at `/ops` and `/ops/production` while the Episode workspace is still an excluded draft; the public drawer Storybook contract verifies in-place YouTube playback and an explicitly unavailable Uncut control.
- Focused lint/typecheck/unit/contract/component checks passed after that repair. The aggregate Phase 1 journey run remains a separate recovery item: it exposed ten migrated-shell/browser expectation failures before the run was stopped, so it is not represented as fresh Phase 1 acceptance evidence.
- Keep untracked operator drafts outside commits and the canonical inventory until individually reviewed; do not infer deployment authority from this documentation update.

## 2026-08-29 Phase 3 held recovery + agentic integration planning

**Status:** LOCAL RECOVERY — previous safe checkpoint `399a83b`; the focused local regression suite is green and this follow-up is checkpointed locally. Phase 3 is not complete and no external system was changed.

**Recovered locally**
- Public citations now resolve only an approved YouTube identifier/timestamp. They do not expose catalogue snapshots, private media paths, hashes, or invented Uncut alignment/playback.
- YouTube ingestion is OAuth-gated; a missing connection returns an explicit unavailable state before a job or audit mutation. API-key configuration is no longer requested in the Phase 3 owner-input packet.
- Asset upload, transcript consumption, timeline parsing, and operator DTOs were tightened to fail closed around identity, vault availability, malformed alignment, raw errors, and internal job payloads.
- `npm run verify:phase3` is now a read-only regression runner over the actual focused Worker tests, public provenance unit tests, web typecheck, and whitespace check. The previous self-grading simulator is retired and must not be used as completion evidence.
- A repository-local, read-only WTF OS MCP/plugin scaffold is being added for release status, release history, and setup guidance only. It is not installed globally and does not contact Cloudflare.

**Planning handoff**
- GitHub planning issues: [#19 OAuth-only YouTube](https://github.com/Sheshiyer/wtfmedia/issues/19), [#20 social OAuth framework](https://github.com/Sheshiyer/wtfmedia/issues/20), [#21 production calendar](https://github.com/Sheshiyer/wtfmedia/issues/21), and [#22 WTF OS MCP/plugin](https://github.com/Sheshiyer/wtfmedia/issues/22).
- Read `docs/handoffs/2026-08-29-agentic-integrations.md` and `docs/wtf-os-agentic-settings.md` before picking up one of those issues. They partition local MCP, future hosted MCP, Settings UX, release history, OTA, and calendar responsibilities so a separate developer can work without touching Phase 3 provenance code.

**Owner gates / do not infer**
- Do not deploy a Worker, bind D1/R2/Queues/KV, configure Cloudflare Access or OAuth, authorize a YouTube/social account, enable calendar sync, install/publish the plugin, or emit OTA updates from this worktree.
- Phase 3 still needs the documented editorial inputs; deployless Worker-entrypoint coverage and safe queue/cron plus asset-confirm handoff; a true large-media R2 streaming/direct-upload design (the current bounded handler buffers its body); durable, single-use upload-ticket state; D1 alignment-persistence/YouTube ETag durability review; a real configured-asset integration test; and owner acceptance evidence.

## 2026-08-28 Production calendar chrome (truthful empty)

**Status:** LOCAL IMPLEMENTATION — uncommitted on `main`. Preview: `http://127.0.0.1:3000/ops/production`.

**Shipped in this slice**
- `/ops/production` calendar + board + pin well. No episode records, owners, or counts. Local-only sketches in `next dev`.
- React Bits **Folder** harmonized to cream/ink/attention as `PaperFolder`. No shadcn init. No neon catalog colors.
- Closed `DatePicker` on production pins and audit after/before filters (02-UI-SPEC time range).
- Production is a workspace nav item for every ops role. Control Room ledger still says production is **not activated**.
- Rail current-route: `/ops` is exact-match so Control Room is not also current on `/ops/production`.

**Verified:** `npm --prefix web run typecheck`; vitest production/policy/lifecycle; Cloudflare operator-policy 3/3; Playwright `tests/phase2/production.spec.ts` 2/2.

**Did not do:** Plan 02-12 staging/production smoke; Phase 3 ingestion; Google Calendar sync; fake episode pins.

**Next Action:** Visual walk `/ops/production` and `/?boot=1` on localhost:3000. Plan 02-12 stays owner-gated. Do not start Phase 3.

## 2026-08-28 WTF OS splash + Grok React Bits MCP (do not re-loop)

**Status:** LOCAL IMPLEMENTATION — uncommitted on `main` (`ced3e83`, ahead of origin by 2). Host MCP is done. Do **not** reinstall React Bits MCP or re-ask for the Pro license.

**New-session first reads:** `PROJECT.md`, `AGENTS.md`, this file, `docs/design/MOTION-MAP.md`, `.planning/STATE.md`. Visual contract: `.planning/phases/02-UI-SPEC.md`.

**What this session already decided**

- Product name is **WTF OS**. Official lockup is `web/public/brand/wtfos-wordmark.png`. **Do not recolor letters.** Raster is the mark; reconstructed `wtf`/`media` spans are retired.
- Cloudflare Access is the IdP. There is no consumer password signup. Access-shaped routes: `/sign-in`, `/request-access` (owner-approved seat). Recovery stays `/ops/recover`.
- Splash is **two plates**, public-only: Grainient background + official logo alpha video. Not a CSS progress bar. Skip overlay under `navigator.webdriver`. Reduced motion: still Grainient/canvas + static PNG.
- Grok Imagine bg video was rejected (watermark, no alpha). Catalog pick: React Bits **Grainient** (MIT, `ogl`), cream/ink tokens. Pro alternatives already verified against the live license: `grain-wave-tw`, `halftone-wave-tw` (also `silk-waves-tw`, `dither-wave-tw`). Do not paste neon Aurora/Plasma/Silk/Galaxy.
- React Bits / MotionSites are **catalogs**. Harmonize to tokens. **No shadcn visual layer** in WTF OS.
- Local `/ops` needs HMAC. `next dev` + loopback may inject signed `x-wtf-ops-context` via `web/lib/ops/local-dev-headers.ts` when `WTFMEDIA_OPS_ORIGIN_PROOF` is set. Preview:
  ```bash
  WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key WTFMEDIA_OPS_LOCAL_ROLE=super_admin npm --prefix web run dev
  ```
- Phase 1 public rooms: `/`, `/episodes`, `/connections`, `/chat`. Phase 2 ops: `/ops`, `/ops/operators`, `/ops/audit`, `/ops/recover`. Phase 3+ inactive. Plan **02-12 owner-gated**.

**Host MCP (already installed — do not `grok mcp add` again)**

| Server | Command | Doctor |
|---|---|---|
| `reactbits` | `npx -y reactbits-dev-mcp-server` | handshake OK, 5 tools (OSS catalog) |
| `reactbits-pro` | `~/.grok/bin/reactbits-pro-mcp.sh` → `npx shadcn@latest mcp` | handshake OK, 7 tools |
| `motionsites` | HTTP MCP (also on Claude) | OAuth; this Grok session may need `/mcps` auth |

License lives **only** at `~/.temperance_engine/secrets/reactbits-license.env` (mode 600). Wrapper sources it. **Never commit, never paste into chat, never put in `web/.env.local` unless a later owner task asks.** Live probe: `@reactbits-starter` and `@reactbits-pro` registry.json both HTTP 200. `web/components.json` is **not** in the repo yet — do not `shadcn init`; do not install Pro files until the owner picks a block **and** registries are added without pulling shadcn primitives.

A **continued** Grok conversation will not see `reactbits__*` / `reactbits-pro__*` in `search_tool`. Open a **new** Grok session in this repo. If tools are missing: `/mcps` refresh. If `grok mcp list` already shows the three names, stop.

**Uncommitted (do not `git add .`)**

Tracked mods include layout, recover, AccessRecovery, OperatorContextStrip, MigratedWordmark, AppRail, middleware, package.json (+ `ogl`), brand/public-shell tests, tailwind. Untracked: `docs/design/MOTION-MAP.md`, `web/app/sign-in/`, `web/app/request-access/`, `Grainient.tsx`, `WtfOsBoot.tsx`, `web/lib/ops/display.ts`, `web/lib/ops/local-dev-headers.ts`, `web/public/brand/wtfos-wordmark.png` (+ `.source.png`), `web/public/brand/splash/`.

**Next Action (new session)**

1. Confirm `grok mcp list` shows `reactbits` + `reactbits-pro`. Call OSS `list_components` / Pro search for backgrounds. Do not reinstall.
2. Continue **visual** walk only: splash → `/sign-in` → `/request-access` → public rooms → ops chrome. Owner still ~30% on visuals. Wire live Control Room status later.
3. Optional splash swap: Grainient (shipping now) vs Pro `grain-wave-tw` / `halftone-wave-tw` after owner pick. Splash is skippable and session-once (`?boot=1` replays). Grok mark cropped off `wtfos-bg-still.jpg`. Chroma plates stay sources, not product layers.
4. Do not start Phase 3. Do not execute Plan 02-12. Do not rotate Frame.io/Drive/Zset here.

**Owner still holds:** 02-12 staging questions; IP/editorial; share rotation.

## 2026-08-27 Phase 2 operator visual alignment

**Status:** LOCAL IMPLEMENTATION — uncommitted until this checkpoint lands

**Evidence:**
- Remaining Phase 1 evidence/docs checkpointed on `aa913d7` (Lighthouse CI cache ignored).
- Phase 2 screens restyled to `02-UI-SPEC.md` without new fetch/auth logic: Control Room, Operators, Audit, Recovery.
- `WorkspaceHeader` sizes: `workspace` (public default), `control-room` (`text-display` clamp 40–72), `page` (34px / 28px Operators and Audit).
- Control Room has one yellow `attention` command plus secondary **refresh status**. Context strip uses 11px labels, 13px values, tabular last-verified time, and does not truncate scope fields.
- Operators/Audit use page headers, dense 13px rows, 2px ink panels, 320 record lists / 768+ tables. Recovery is `AccessRecovery` with spec copy.
- No fake health, counts, or invented workflow systems.

**Verification:**
```bash
npm --prefix web run typecheck
cd web && npx vitest run tests/contracts/wtf-os-token-contract.test.ts
cd web && WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key npx playwright test --grep-invert @visual tests/phase2 --project=phase1-chromium-320 --project=phase1-chromium-768 --project=phase1-chromium-1440
```
Typecheck passed. Token contract 3/3. Phase 2 Playwright 39/39. Browser screenshots of `/ops` at 1440 and 320 confirmed the yellow command and stacked 320 chrome.

**Next Action:**
Wire live status refresh and remaining operator/audit data presentation after this visual baseline. Plan 02-12 stays owner-gated.

## 2026-08-27 Operator shell converge + refinements A/D

**Status:** LOCAL IMPLEMENTATION — uncommitted worktree diff on `d1e7ece`

**Evidence:**
- `OperatorShell` is a thin `AppShell` adapter (`data-ops-shell`, lowercased nav, public-workspaces + sign-out utility).
- Operator hamburger accessible name is `open operations navigation`; public remains `Open application navigation`.
- Drawer titles: `operations navigation` vs `application navigation`. Descriptions: `authorized operations destinations` vs `open a WTF OS workspace`. Operator nav landmark is `operations`.
- Control Room restores 02-UI-SPEC empty copy (`the room is open` as ledger title + verified body in WorkspaceHeader) and keeps one yellow command. Layout still owns `OperatorContextStrip`.
- StatusLedger accepts at most one `promoted` item, rendered above the list with slot copy `do this next` and a 4px attention bar (not a second yellow fill). Admin/super_admin promote operator access → `/ops/operators`; editor promotes ask wtf → `/chat`.
- Escape restores focus to the hamburger (operator 320 + public 320 keyboard/pointer paths).

**Verification:**
```bash
npm --prefix web run typecheck
WTF_PUBLIC_UI_VARIANT=migrated WTFMEDIA_OPS_ORIGIN_PROOF=phase2-e2e-test-key npm --prefix web run build
cd web && npx playwright test --grep-invert @visual tests/phase2/control-room.spec.ts tests/journeys/shell-drawer-focus.spec.ts --project=phase1-chromium-320 --project=phase1-chromium-768 --project=phase1-chromium-1440
```
15/15 Playwright passed. No deployment, secret, or registry mutation.

**Next Action:**
Path-scoped commit of the operator-shell converge files. Plan 02-12 stays owner-gated.

## Phase 2 Planning Checkpoint (2026-08-26)

**Status:** EXECUTING — Plans 02-01 through 02-11 complete

**Evidence:**
- The approved `02-UI-SPEC.md` remains the visual and interaction contract at commit `5f5f1ad`.
- The superseded umbrella `02-PLAN.md` was replaced by 12 executable plans (`02-01` through `02-12`) across eight dependency-ordered waves.
- Static validation covers all 15 Phase 2 requirement IDs, all 26 locked context decisions, 24 executable tasks, and 35 uniquely owned threat definitions.
- Plan 02-01 established the immutable 35-threat ledger, empty fail-closed aggregate schema, and privacy-safe command-bound evidence fragments (`f4853e3`, `5be9f74`, `6278dad`).
- `cd web && npm run verify:phase1` passed after the stale completed-state test contract was reconciled (`2c080e0`); no Phase 1 behavior changed.
- Plan 02-02 applied and listed the portable D1 migrations locally with Wrangler 4.95.0; the approved roster, typed audit envelope, and symbolic environment contract are checkpointed (`f49efed`, `ae4d5b6`, `196eec5`, `5fbccee`).
- Plans 02-03 and 02-04 established verified Cloudflare Access + fresh D1 authority, closed policy navigation, and atomic super-admin transfer (`f06105c`, `0306b3a`, `c28c679`).
- Plan 02-05 added action-specific, append-only audit encoding; authorized fixed CSV export; and local/staging/production retention purges using an audited D1 batch (`ea316ef`, `6a4c0c4`). Local Cloudflare tests passed (18/18) and T-02-13 through T-02-15 have persisted passing receipts.
- Plans 02-06 and 02-07 established the edge-to-origin signed-context boundary, request-scoped policy projection, and non-leaking recovery/sign-out lifecycle (`25990ba`, `ae75f5e`).
- Plan 02-08 implemented the protected Control Room, role-projected responsive shell, truthful inactive status, and a recovery route outside the protected layout (`19a9156`, `bee5b28`). Local type checks, 320/768/1440 browser checks, and T-02-22 through T-02-24 passed.
- Plan 02-09 added a D1-backed invitation approval allowlist. Only the active `super_admin` can approve an address; an administrator can consume a pending approval to activate the invited `admin` or `editor`, and each action is audited (`774c3ad`, `7da776c`).
- Plan 02-10 added privacy-safe audit-ledger filtering and fixed CSV export. The operator UI exposes only approved DTO fields, while local filter validation rejects unknown inputs (`00ab446`, `6c0b321`).
- Plan 02-11 added the deterministic local Phase 2 verifier, CI gate, staged-evidence gate, and operations runbook. Local verification passed; staging and final release modes intentionally require separately supplied evidence (`7296f63`, `d4909e2`).
- Plan 02-12 now has local fail-closed staging preflight and production-smoke runners. They reject incomplete or ambiguous targets before a receipt is written or request is sent (`bb5d51c`).
- Plan `02-12` is non-autonomous: owner-approved staging evidence and a separately authorized, exact-host, read-only production smoke remain blocking gates.
- No deployment, migration, provider credential change, production write, registry mutation, or cutover occurred.

**Next Action:**
UI/UX work can proceed without Plan 02-12: land `wtf-os-shell-materialize`
(plus `web/tests/component-trace.json`) so `origin/main` matches the local
WTF OS shell. Plan 02-12 stays blocked until the owner fills
`.planning/inputs/client-questions/2026-08-27-plan-02-12-staging-authorization.md`.

## Phase 1 Completion Checkpoint (2026-08-25)

**Status:** COMPLETE

**Evidence:**
- 23/23 plans executed (T-01-01 through T-01-70 all passed)
- 72/72 threat definitions in final aggregate (`web/tests/security/phase1-threat-results.json`)
- Unqualified `cd web && npm run verify:phase1` exit 0 with all 12 sections green
- Owner approved visual baselines (5 decisions, 2026-08-25)
- Migrated UI variant active (`publicUiVariant()` default = migrated)
- Legacy rollback path retained and tested (38/38 tests pass)
- 17 approved snapshots promoted to `web/tests/visual/public-routes.spec.ts-snapshots/`

**Next Action:**
Phase 2 plans 02-01 through 02-11 are executed. Keep Phase 1
`verify:phase1` green after the WTF OS shell lands on `main`. Do not
flip REQUIREMENTS.md COMP/DSYS rows until that verifier passes on the
landed shell.

## Phase 2 Prerequisite Decisions (RESOLVED 2026-08-25)

1. **Deployment architecture** — Existing Vercel public application plus the existing Cloudflare edge estate — Resolved
2. **Authentication** — Cloudflare Zero Trust Access — Resolved by owner clarification on 2026-08-25; supersedes the unpersisted Clerk decision
3. **Database** — Cloudflare D1 for operator and audit persistence — Resolved by owner clarification on 2026-08-25
4. **Application roles** — `super_admin` (single transferable ownership seat), `admin` (operational administration), and `editor` (read + limited write) — Resolved
5. **Capability matrix** — Deny-by-default; editor: episodes/connections/chat/analytics read, chat write; no user management — Resolved
6. **Protected operator boundary** — A Cloudflare-controlled operator endpoint will enforce Access and route to the existing Vercel application — Resolved by owner clarification on 2026-08-25
7. **Temporary Cloudflare account authority** — The personal `9d9d` Wrangler account may own Phase 2 Cloudflare resources for now — Resolved by owner clarification on 2026-08-25
8. **Account portability** — Repository-owned schema, migrations, binding names, policy, and verification must remain portable; credentials and numeric account identifiers stay outside source control — Required Phase 2 constraint
9. **Final account migration** — Port the Cloudflare resources from `9d9d` to the final owner account later — Deferred to a separate owner-approved migration task
10. **Identity-to-operator mapping** — Cloudflare Access authenticates the normalized email; D1 must contain a matching active operator with a recognized `super_admin`, `admin`, or `editor` role. Missing, inactive, or unknown-role records are denied — Resolved by owner confirmation on 2026-08-25 and extended on 2026-08-26
11. **Expiry, revocation, and deactivation recovery** — Immediately discard protected client state, reveal no protected data in the recovery screen, retain only a validated intended `/ops` destination, and recheck both Access authentication and D1 authorization before restoring access — Resolved by owner confirmation on 2026-08-25
12. **Authoritative session and sign-out** — The verified Cloudflare Access token is the only authentication session; WTF issues no separate authentication cookie. Every protected server request rechecks the active D1 role. Sign-out clears protected client state and proceeds through Cloudflare Access logout — Resolved by owner confirmation on 2026-08-26
13. **Capability enforcement** — One shared deny-by-default server policy governs pages, APIs, queries, exports, record/field projection, errors, and cache boundaries. UI visibility mirrors policy but never grants authority; unknown combinations deny without revealing protected details — Resolved by owner confirmation on 2026-08-26
14. **Bootstrap super administrator** — `sheshnarayan.iyer@gmail.com`, the current personal `9d9d` account owner, holds the single temporary `super_admin` seat. It may be handed off later through an atomic, audited transfer that never leaves zero or multiple active super administrators — Resolved by owner direction on 2026-08-26
15. **Initial visible-roster access mapping** — Aditi Raj is `admin`; Sai Date, Naisthika Rathod, Amal Vinayan, Akash Pandey, and Yash Majithia are `editor`; the 9d9d owner email remains `super_admin` — Resolved by owner confirmation on 2026-08-26
16. **Append-only audit policy** — D1 records authentication outcomes, expiry/logout, protected searches/views/exports, operator and role changes, settings changes, and super-admin handoffs using allowlisted metadata plus correlation IDs. Tokens, raw queries, prompts, responses, and private payloads are prohibited — Resolved by owner confirmation on 2026-08-26
17. **Audit retention and visibility** — Production retains audit records for 365 days; staging retains them for 30 days; local audit data is ephemeral. Only `super_admin` and `admin` may view or export records. Every export and automated purge is audited, and expired records are deleted without silent archival — Resolved by owner confirmation on 2026-08-26
18. **Environment and data isolation** — Local, staging, and production use separate D1 databases, Cloudflare Access applications/policies, secrets, and cache namespaces. Production data is never copied to lower environments. Repository-owned migrations promote forward through environments, and preview deployments receive no protected backend unless explicitly bound — Resolved by owner confirmation on 2026-08-26
19. **Truthful initial Control Room shell** — The first authenticated `/ops` release shows the current environment, workspace, effective operator role, authorized navigation, live-derived service status, and one dominant setup action. Missing systems render explicit unknown, offline, unavailable, or permission-denied states; they never fabricate health or substitute misleading zeroes — Resolved by owner confirmation on 2026-08-26
20. **Fail-closed production release gate** — Production remains blocked until staging proves the complete anonymous/expired/inactive/editor/admin/`super_admin` authorization matrix; Access and D1 recovery/logout; tampering, DTO, and cache isolation; audit coverage, retention, export, and purge; environment and secret separation; keyboard, focus, accessibility, and responsive behavior; and rollback plus runbook rehearsal. Deterministic checks block CI, the owner approves the staging evidence packet, the production smoke test is read-only, and every failed or unknown gate blocks release — Resolved by owner confirmation on 2026-08-26

**Superseded draft warnings:** The untracked `web/lib/auth/session.ts` creates
an unsigned JSON `wtf_session` cookie. The draft D1 schema omits `super_admin`,
accepts unrestricted JSON audit metadata, and hard-codes 90-day retention.
These conflict with Decisions 12, 14, 16, and 17 and are not approved
implementation authority. Executable Phase 2 plans must replace them.

## Phase 2 Owner-Supplied Roster Evidence (2026-08-26)

The owner supplied a cropped messaging screenshot. The table records only the
six visible entries; it does not claim the screenshot contains the complete
team. Job titles remain distinct from application authorization roles.

| Person | Email | Supplied job title | Phase 2 application role |
|---|---|---|---|
| 9d9d account owner | `sheshnarayan.iyer@gmail.com` | Temporary infrastructure owner | `super_admin` |
| Aditi Raj | `aditi@allthingswtf.com` | Production Manager | `admin` |
| Sai Date | `sai@allthingswtf.com` | Senior Designer | `editor` |
| Naisthika Rathod | `naisthika@allthingswtf.com` | Production Associate | `editor` |
| Amal Vinayan | `amal@allthingswtf.com` | Motion designer | `editor` |
| Akash Pandey | `akash@allthingswtf.com` | Post production manager | `editor` |
| Yash Majithia | `yash.majithia@nksqr.com` | Unknown — not visible in supplied screenshot | `editor` |

## Phases 3–10 Status

**Authorization:** Planned / inactive. Phases 3–10 remain planned but inactive until Phases 1–2 are accepted and explicit owner authorization is recorded for the next phase.

## Technical Notes

**Variant selector:** `publicUiVariant()` in `web/lib/public/public-ui-variant.ts`. Default: `migrated`. Legacy rollback: `WTF_PUBLIC_UI_VARIANT=legacy`. Server-only; never serialized to client.

**Performance budgets:** Approved in `web/tests/performance/phase1-budgets.json` (Plan 01-07). 11 metrics. Enforcement: `web/scripts/capture-phase1-performance.mjs --check`. LHCI collection: `npm run test:performance` runs `lhci collect && lhci upload` (no assert phase).

**Visual baselines:** 17 approved snapshots (4 routes × 3 viewports × 4 states). Stability loop in `captureVisual()` ensures deterministic captures. Broken-image alt text handled via CSS `img { color: transparent }` in visual tests.

**Aggregate verifier:** `web/scripts/verify-phase1.mjs` runs 12-section fail-fast sequence. `web/scripts/lib/phase1-threat-results.mjs` validates fragments with correction-ledger tolerance. `web/scripts/merge-phase1-threat-results.mjs` produces final 72-definition aggregate. CI gate: `.github/workflows/phase1.yml` runs `npm run verify:phase1`.

## Checkpoint

- Status: `draft-held`
- Portfolio: `thoughtseed`
- Repository: `wtfmedia`
- Registry WorkObject: `branch:wtfmedia`
- GitHub: `Sheshiyer/wtfmedia`

This packet was drafted by the packet-authoring tool from registry and
repository evidence. It has not been reviewed by a human and is not
committed.

## Completed

- Registry WorkObject matched via `sourceInventory`.
- Packet drafted: all six files present.
- 1 field(s) flagged for review — see `.project/CONTEXT.md`.
- Chat-model fallback repair deployed to Vercel production on 2026-08-11:
  each NVIDIA model must emit a first token within 12 seconds; otherwise the
  route tries Llama 3.3 70B and then Llama 3.1 8B before returning a safe 503.
  `npm run build --prefix web` passed before deployment.
- Live production probe against `https://wtfmedia.vercel.app/api/chat` returned
  HTTP 200, `X-Fallback: true`, and `X-Model: meta/llama-3.1-8b-instruct`,
  confirming that recovery works when the primary does not answer in time.
- Released `wtfmedia-web` v0.0.2 to production on 2026-08-11. The catalogue now
  contains 55 episodes and 1,933 embedding chunks. Both newly synced episode
  IDs are present on `/episodes` and appear in live `/api/chat` source headers.
- Released `wtfmedia-web` v0.0.3 to production on 2026-08-11. Connections now
  rebuild for all 55 episodes using a bounded NVIDIA curation attempt and a
  deterministic fallback when the provider returns malformed output.
- Released `wtfmedia-web` v0.0.4 to `https://wtfmedia.vercel.app` on
  2026-08-11 (deployment `dpl_2uASTwWVVtbTYoFZumYwrMkZVqdW`). Removed the
  unavailable Crew mode and its
  localhost-only route, the simulated online-user count, and the unrelated
  drawing playground. The public UI now presents only the production-backed
  retrieval path and current 55-episode / 1,933-chunk totals.
- Released `wtfmedia-web` v0.0.5 to `https://wtfmedia.vercel.app` on
  2026-08-11 (deployment `dpl_Gefto4o1NstkUdvWBch7k2fBMrXZ`) to prevent
  unsupported corpus-wide people or
  company counts, and ownership/role claims, from being generated from a
  six-excerpt semantic retrieval result. Connections are now described only as
  recurring themes and ideas, not a verified people/company index.
- Deployed the isolated Cloudflare shadow RAG Worker `wtfmedia-edge` on
  2026-08-11. Dedicated account resources are `wtfmedia-catalogue-v1`
  (Vectorize, 1,024-d cosine), `WTFMEDIA_STATE` (KV),
  `wtfmedia-catalogue` (R2), `wtfmedia-ingest` (Queue), and
  `wtfmedia-ingest-dlq` (DLQ). The Worker is not connected to the Vercel UI.
- Verified a two-episode pilot from R2 through Queue, Workers AI, and
  Vectorize. `POST /v1/chat` at the Worker shadow endpoint returned HTTP 200
  with grounded sources for a pilot question. Infrastructure details and
  cutover gates are in `docs/CLOUDFLARE-INFRASTRUCTURE.md`.
- Released `wtfmedia-web` v0.1.0 to production on 2026-08-11 (deployment
  `dpl_B3h7PAkP7d72HZhuV27PX5rattWJ`). The Vercel
  `/api/chat` route now preserves its browser contract while proxying
  server-to-server to `wtfmedia-edge`; no Cloudflare account credential is
  sent to the browser. The full 55-episode corpus has been uploaded to R2 and
  queued for idempotent ingestion; Vectorize throttling was resolved by
  single-consumer queue delivery, eight-vector batches, and bounded backoff.
- Released `wtfmedia-web` v0.1.1 to production on 2026-08-11 (deployment
  `dpl_9rzb7RUSxizn42agcLC7A9nMtYr3`). Added the 55-record provenance manifest,
  restored timestamps for the 43 caption-backed episodes, and added production
  evaluation coverage for citation grounding, ownership abstention, and
  timestamp honesty. Direct Worker chat is now denied without the server-only
  Vercel/Worker shared secret (HTTP 401).
- Released `wtfmedia-web` v0.1.3 to production on 2026-08-11 (deployment
  `dpl_CHR5zYqgFEngizFu8Uy2Nb46kgM1`). Removed automatic starter prompts after
  they conflicted with the grounding policy; the empty state now shows a
  non-submitting, source-answerable example instead.

## Next action

Review this draft packet, resolve any items flagged in the review summary,
commit the six files as a single repository change, and move
`packet_status` to `reviewed-held`. A relocation manifest approval and a
live-apply approval both remain separate, later steps.

Monitor the Cloudflare-backed production route as the full 55-episode queue
drains. Next hardening work is a source/provenance manifest, measured timestamp
coverage, golden RAG evaluations, and WAF/Turnstile plus richer telemetry.

Connections curation is now resilient to malformed or unavailable NVIDIA model
responses. The model remains preferred for canonicalization; the deterministic
fallback keeps the graph current when curation cannot be normalized.

## Verification

```bash
not-applicable
cd video && npm run lint
git status --short
```

No registry, capsule, relocation, session, or Paseo mutation was performed.
The owner-authorized Cloudflare shadow resources and Worker deployment above
are the only external infrastructure mutations in this checkpoint.

## 2026-08-25 Plan 01-18 aggregate + rollback + candidate checkpoint

- Plan 01-18 now has passing threat evidence for T-01-55, T-01-56, and T-01-57.
- Task 1 (rollback rehearsal): Both legacy and migrated variants pass all 19 tests per variant (38 total) across all 4 protected routes; protected data files (episodes.json, connections.json, vectors.json) verified unchanged via SHA-256.
- Task 2 (aggregate verifier + CI): `web/scripts/verify-phase1.mjs` implements a static 12-section fail-fast sequence; `web/scripts/lib/phase1-threat-results.mjs` provides read-only fragment validation with correction-ledger support and legacy fragment tolerance; `.github/workflows/phase1.yml` runs `npm run verify:phase1` on Ubuntu/Node 22 with Playwright Chromium.
- Task 3 (candidate review packet): `web/tests/visual/phase1-candidate.json` assembled with 17 visual candidates across 4 routes, 3 viewports (320/768/1440), and 4 states (default, drawer-open, empty, response); candidate check-merge validates 62 results from 20 completed plans; privacy scan reports 0 violations across 138 files.
- Threat ledger: 72 total definitions, 62 non-exempt, 10 exempted (T-01-55 through T-01-64).
- No commit, deployment, owner visual approval, cutover, external-service mutation, registry change, or provider change occurred. The broader dirty worktree remains preserved.

### Next action

Execute Plan 01-19 (owner visual approval). The candidate packet is ready for owner review at 320/768/1440 viewports. Repository Phase 2 remains gated behind complete Phase 1 acceptance.

## 2026-08-24 Plan 01-17 cross-route proof checkpoint

- Plan 01-17 now has passing threat evidence for T-01-52, T-01-53, and T-01-54.
- The Task 2 correction is bound to the exact historical failure; candidate mode produces 17 persistent, ignored PNG/JSON hash pairs without approving baselines.
- The component trace recomputes the migrated protected-route import graph, verifies exports/story states/layer direction/cycles, and blocks any remaining `TBD` validation mapping.
- Contracts passed 67 tests, privacy scanning reported zero violations across 137 files, lint exited zero, and the component-trace suite passed 3 tests.
- Repository-wide typecheck remains blocked by existing errors in `web/tests/accessibility/public-routes.spec.ts:391` and `web/tests/journeys/chat.spec.ts:365`; Plan 01-18 must own or resolve these before aggregate acceptance.
- No commit, deployment, owner visual approval, cutover, external-service mutation, registry change, or provider change occurred. The broader dirty worktree remains preserved.

## 2026-08-18 PAI / Manifest initialization checkpoint

- Status: bounded local review passed; the repository packet remains
  `draft-held` and no relocation, registry, provider, or deployment authority
  is implied.
- Repository Git identity was restored from the declared `origin/main` history
  without replacing or reverting the existing working tree.
- `ISA.md` now owns acceptance and the active goal; GSD remains the execution
  planning authority under `.planning/`.
- Temperance project, Manifest, and goal receipts were initialized. The live
  bridge is fresh, `active_planner` is `isa`, and project doctor reports zero
  high-severity gaps.
- The current public catalogue is retained as a protected read-only projection
  while the proposed milestone reframes the primary product as an internal,
  evidence-native podcast operating system.
- Private source materials informed bounded requirements synthesis only; raw
  transcripts, embedded source links, and source files were not copied into
  project artifacts.
- Machine-local Manifest and orchestration receipts are ignored. The inherited
  promo task is preserved as historical work but resolves to no executable
  next-wave proposal.
- Independent Cato-style re-audit passed after portability, routing, and goal
  length corrections.
- `DESIGN.md` now records the repository-grounded reference lock, public/internal
  route split, semantic use of the committed palette, typography and motion
  rules, accessible component foundation, current-to-target component map,
  screen contracts, and dependency order for GSD decomposition.
- The design packet added and proved ISC-129 through ISC-134. All 134 ISA IDs
  remain unique; 18 are currently evidenced as complete.
- Live Refero catalogue research was unavailable because the configured
  subscription is inactive. No account was changed; committed WTF brand assets,
  the shipping UI, bundled craft references, and current official component
  documentation form the bounded research set.
- The design audit's route-continuity gap is resolved: `/`, `/episodes`,
  `/connections`, `/chat`, and `/api/chat` are protected compatibility
  contracts, and public/operator connection graphs are separate projections
  over shared evidence. Orange is explicitly a provisional comp-derived token,
  not an addition to the committed `PRODUCT.md` palette.
- The final independent design remediation re-audit passed with no actionable
  blockers; it was read-only and changed no files.

### Next action

Discuss and plan Phase 1, `Compatibility + Component Proof Harness`, against
the approved design packet and roadmap. Phase 2 remains authorized only after
Phase 1 acceptance; Phases 3 through 8 remain planned and inactive. No
implementation, dependency installation, deployment, or external-service change
is authorized by this planning checkpoint.

### Verification

```bash
temperance-project-init --cwd . --check --json
temperance-next-wave --cwd . --json
git check-ignore -v .temperance/project.json .temperance/manifest.json
```

## 2026-08-19 GSD milestone planning checkpoint

- Owner approval finalized `v1.0 One Brain Re-foundation` as an eight-phase
  roadmap in commit `f6654aa`.
- The approved requirements define 70 unique v1.0 IDs across all ten accepted
  families; every ID maps to exactly one phase with zero gaps or duplicates.
- Phase 1 and Phase 2 are the only implementation-authorized phases. Phase 2
  depends on Phase 1 acceptance, and Phases 3 through 8 require a later explicit
  owner authorization gate.
- Phase 1 consumes the approved moodboard, app-flow contract, component
  inventory, and `DESIGN.md`; it must deliver the proof harness plus at least
  one real migrated public component while protecting `/`, `/episodes`,
  `/connections`, `/chat`, and `/api/chat`.
- ISA remains acceptance and goal authority. GSD remains execution-planning
  authority; ISC-10 through ISC-12 are now directly evidenced, bringing ISA
  progress to 18 of 134.
- No Phase 1 code, library installation, deployment, registry mutation,
  provider change, or external integration mutation occurred in this
  checkpoint.
- The superseded 20-second promo plan was preserved under `tasks/archive/` so
  Temperance no longer routes it as active work. The current next-wave proposal
  is bounded to the approved Phase 1–2 roadmap and remains human-approval
  blocked; nothing was dispatched.

### Next action

Run `$gsd-discuss-phase 1` to lock implementation choices and acceptance
evidence before `$gsd-plan-phase 1`.

## 2026-08-19 Phase 1 discussion checkpoint

- Phase 1 discussion is complete across the first proof slice, visual migration
  depth, compatibility policy, and acceptance evidence.
- The first proof slice is `EpisodesBrowser` plus `ScrollRail` and a URL-backed
  accessible public-detail drawer.
- The confirmed Phase 1 boundary visibly redesigns `/`, `/episodes`,
  `/connections`, and `/chat` while preserving their public behavior and the
  complete `/api/chat` contract.
- Compatibility is frozen across URLs, bookmarks, queries, navigation meaning,
  public data semantics, streaming, citations, source fields, headers, statuses,
  and safe errors. `/chat` remains canonical; the public `ModelPicker` is
  removed; `/connections` retains both its graph and an equivalent accessible
  list.
- Acceptance requires one blocking local/CI proof command, reviewed visual
  evidence at 320px, 768px, and 1440px, measured performance budgets, owner
  visual approval, and a documented rollback.
- Canonical context and the audit-only discussion log were committed in
  `08b0ef8`; GSD session state was committed in `2b198a2`.
- The approved Phase 1 roadmap amendment remains applied in the working tree
  and is not included in the discussion-context commits.
- No implementation, dependency installation, deployment, corpus change,
  provider change, registry mutation, or external-service mutation occurred.

### Next action

Run `$gsd-plan-phase 1`. Phase 2 remains queued behind Phase 1 acceptance, and
Phases 3 through 8 remain inactive.

## 2026-08-20 Client Phase 1/2 scope reconciliation checkpoint

- The owner explicitly selected preservation of the 23 committed repository
  Phase 1 plans from `0f80677`; no `01-*-PLAN.md` file was rewritten.
- The client build specification's “Phase 1” and “Phase 2” are now recorded as
  delivery tracks, not aliases for repository phases. Client Phase 1 spans
  repository Phases 2–4 after the proof harness; Client Phase 2 spans Phases
  5–9; migration closure is Phase 10.
- `.planning/REQUIREMENTS.md` now carries 102 unique v1.0 requirements across
  twelve families, including production membership/auditability, both-channel
  and uncut ingestion, segmented transcripts and alignment, hybrid retrieval,
  four-tier cited research, canonical calendar behavior, source adapters,
  automated reporting, cost observability, and evaluated clip intelligence.
- `.planning/ROADMAP.md` records the client acceptance spine, phase-specific
  prerequisites, delivery-track done conditions, and implementation boundary.
  Read-only adapters precede unified analytics; clip intelligence has its own
  human-owned evaluation gate.
- `ISA.md` adds and proves ISC-135 through ISC-140 for delivery-track mapping,
  blocker ownership, requirement coverage, and preservation of Phase 1 plans.
- Repository Phase 1 and Phase 2 remain the only implementation-authorized
  phases. Phases 3–10 remain planned and inactive pending Phases 1–2 acceptance
  and explicit owner authorization.
- No implementation, dependency installation, deployment, domain purchase,
  account change, provider spend, source ingestion, or external-service
  mutation occurred during this reconciliation.

### Next action

Review the reconciled planning diff, then execute the preserved Phase 1 plan
sequence with `$gsd-execute-phase 1` when implementation is explicitly started.
Before planning or executing Phase 2, settle deployment architecture, identity,
team roster, and the capability matrix.

### Verification

```bash
git diff --check -- .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md ISA.md .project/HANDOFF.md
node ~/.codex/get-shit-done/bin/gsd-tools.cjs roadmap analyze
git diff --exit-code 0f80677 -- .planning/phases/01-compatibility-component-proof-harness/01-*-PLAN.md
```

## 2026-08-20 Phase 1/2 execution alignment checkpoint

- Review confirmed that Phase 1 Plans 01-01 and 01-02 are committed and that
  their recorded package and compatibility approvals are internally consistent.
- The owner approved the minimal exact pre-existing pin amendment to
  `@types/node@22.12.0`; Vite 8.2.1 peer resolution completed without
  `--legacy-peer-deps` or an audit remediation.
- Plan 01-03 Task 1 passed its immutable exact-pin and non-watch-script gate.
  The approved Chromium installation completed without approving lifecycle
  scripts. Npm's reported advisories and denied transitive scripts were not
  remediated or approved.
- Plan 01-03 Task 2 failed closed because its immutable probe uses
  `require.resolve("@lhci/cli")`, while the approved package is CLI-only. Do
  not rewrite the preserved plan in place; create and approve a bounded
  correction plan that verifies the executable instead.
- GitHub Project `WTF Media — Phase 1 + 2 Execution` now mirrors only the
  authorized repository Phase 1 and Phase 2 work, their explicit decision
  gates, and the Plan 01-03 correction. Repository Phases 3–10 were not made
  executable on GitHub.
- The newly supplied logo was reviewed as a brand direction reference. Before
  its migrated-shell work begins, an owner-approved repository asset source and
  an explicit reconciliation with the existing wordmark constraint are still
  required; no external asset was copied into the repository.

### Next action

Plan the bounded correction to the Phase 01-03 LHCI probe, then resume Phase 1
from that correction. Phase 2 remains limited to its deployment, identity,
team-roster, capability-matrix, and field-policy readiness decisions.

### Verification

```bash
cd web && npm ls --depth=0
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1
git diff --check
```

## 2026-08-20 Plan 01-03 LHCI correction completion checkpoint

- Owner-approved GitHub issue `#6` is resolved without changing any preserved
  `01-*-PLAN.md` definition or the mirrored validation ledger.
- `web/tests/security/phase1-threat-corrections/01-03-lhci-cli.json` is a
  strictly allowlisted correction record for only `T-01-07` and `T-01-08`. It
  binds each immutable command ID and SHA-256 digest to the exact failed,
  privacy-safe result before recording the approved executable CLI probe.
- `web/scripts/run-phase1-threat.mjs` accepts only that correction file,
  approval reference, two threat IDs, original binding, and replacement command
  digest. Unknown files, IDs, approval drift, command drift, or altered
  superseded evidence fail closed.
- Plan 01-03 Task 2 reran the actual `lhci` executable, recorded passing
  replacement evidence for both threats, and retained the original failed
  evidence inside the correction ledger. Task 1 was rerun and remains passed.
- The twelve approved package pins and the exact `@types/node@22.12.0`
  compatibility amendment remain installed; no lifecycle-script approval,
  peer-dependency bypass, audit remediation, deployment, or client-scope work
  occurred.

### Next action

Execute Plan 01-04 harness configuration only after its owned scope is reviewed.
Phase 2 remains limited to its recorded readiness decisions until Phase 1 is
accepted.

### Verification

```bash
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 1
node web/scripts/run-phase1-threat.mjs --plan 01-03 --task 2
npm --prefix web ls --depth=0
git diff --check
```

## 2026-08-20 Plan 01-04 privacy-harness correction checkpoint

- The Phase 1 execution record shows that Plan 01-04 Task 2's immutable
  `T-01-09` command invokes `npm run test:privacy -- --check`, while the
  scanner was first assigned to Plan 01-05, which depends on Plan 01-04.
- The owner resumed Phase 1 planning after this evidence. Commit `4d57e30`
  adds the smallest scoped correction: Plan 01-04 now owns the minimal
  offline scanner required by its existing command; Plan 01-05 still extends
  that scanner to the complete public-projection and generated-artifact scope.
- The 23-plan sequence, all immutable threat definitions, and the mirrored
  validation ledger remain intact. No external service, deployment, registry,
  credential, or Phase 2 work was changed.

### Next action

Resume `$gsd-execute-phase 1` at Plan 01-04. The implementation must create
the bounded scanner, rerun the threat runner, and retain only privacy-safe
digest evidence.

### Verification

```bash
git show --check --stat 4d57e30
node web/scripts/run-phase1-threat.mjs --plan 01-04 --task 2
```

## 2026-08-27 WTF OS whole-app shell (local working tree — not on origin/main)

- This checkpoint describes the **dirty local tree**, not `origin/main`.
  `5dc06fc` on main only switches `appUiVariant()` to `wtfos` and still
  renders tracked `PublicShell`. `AppShell`, `AppRail`, `MigratedHomePage`,
  and related files remain untracked.
- Locally, public and operator routes share one responsive application
  frame (`AppShell` / `AppRail`) with skip target, mobile drawer, workspace
  headers, semantic status ledgers, and explicit unavailable/not-activated
  states. `/ops/recover` stays outside the shell.
- Local `/` is a source-backed public Control Room (`MigratedHomePage`)
  with episode/show counts from catalogue data, named future systems, and
  a direct Ask workflow. It must not invent operational health.
- Binding design:
  `docs/superpowers/specs/2026-08-27-wtf-os-whole-app-shell-design.md`.
  Implementation sequence:
  `docs/superpowers/plans/2026-08-27-wtf-os-whole-app-shell.md`.
- No deployment, provider configuration, credentials, or protected content
  data was mutated by this local convergence work.

### Verification (local dirty tree only)

Commands below were recorded against the local tree. They are **not** a
fresh-clone `origin/main` receipt. `origin/main` currently fails Phase 2
Gate typecheck (`web/tests/component-trace.json` untracked) and Vercel
ESLint (`guest's` in committed `web/app/page.tsx`).

```bash
cd web
npm run typecheck
npm run lint
npm run test:contracts
npm run test:components
npm run test:privacy -- --check
npm run build
npm run test:rollback
```

### Next action

Land `wtf/wtf-os-shell-materialize` so this local shell exists on `main`,
then run A + D refinements (promoted dominant action + focus-return).
Do not start Plan 02-12 until the staging-authorization form is filled.

## 2026-08-27 session PR merge + next UI/UX wave

**Status:** PRs #7, #8, and #9 squash-merged to `origin/main`. Local main
fast-forwarded to `7defffa`. The ~120 other dirty files were not staged.

| PR | Squash commit | What landed |
|---|---|---|
| #7 | `baa90d8` | Podcast catalogue snapshot + owner questions; extractor no longer stores machine-local paths |
| #8 | `b9de2f8` | `scripts/session-pr.sh`, PR template, session-PR workflow doc |
| #9 | `7defffa` | Working-tree backlog with corrected main-build diagnosis |

Review notes: `/code-review ultra` was not launched (billed Claude Code
command). Grok review + follow-up commits resolved the only merge blocker
(absolute checkout/Downloads paths in `snapshot_sheets.py`). CI remains
red on `main` for reasons **outside** these PRs.

### Current remote vs local split

- **On `origin/main`:** Phase 1 plans 01-01..01-23 executed in history;
  Phase 2 plans 02-01..02-11 executed; 02-12 blocked on owner staging
  targets; WTF OS *variant default* is `wtfos` but presentation is still
  tracked `PublicShell` + pre-migration `web/app/page.tsx`.
- **In the dirty local tree:** `AppShell` / `MigratedHomePage` /
  `OperatorShell` adapters, journey/visual/threat evidence, Cloudflare
  docs, catalogue JSON refreshes. Highest-value follow-up is still
  `wtf-os-shell-materialize`, paired with `web/tests/component-trace.json`.

### Next UI/UX wave (Phase 1 + Phase 2 mapped)

See `.planning/STATE.md` Pending Todos. Execution order:

1. Unblock typecheck: commit `web/tests/component-trace.json`.
2. Materialize WTF OS shell (replaces lint-failing home page).
3. Refinement A (promoted dominant action) then D (focus-return). Local
   `AppRail` already has `aria-current` + attention active state (B).
4. Shell-dependent tests (journeys, rollback variants, visual, a11y).
5. Flip COMP/DSYS/QUAL Phase 1 rows in `REQUIREMENTS.md` only after
   `npm run verify:phase1` on the landed shell.
6. Close remaining 02-UI-SPEC gaps on `/ops` without activating Phase 3
   modules. Plan 02-12 stays owner-gated.

### Verification

```bash
git log --oneline -3 origin/main
# 7defffa docs(planning): categorize post-cleanup working-tree backlog (#9)
# b9de2f8 chore(workflow): add reusable session-PR scaffold (#8)
# baa90d8 docs(planning): snapshot podcast catalogue + draft owner questions (#7)
rg -n '/Users/|/Volumes/' .planning/inputs/podcast-catalog/tools/snapshot_sheets.py
# no matches
```

No registry, deploy, secret, or production mutation.

## 2026-08-28 Phase 2 WTF OS system-theme lock (reviewed local)

**Scope:** active WTF OS Phase 1/2 public, operator, recovery, graph, drawer,
and confirmation-dialog surfaces only. Legacy rollback behavior and unactivated
future workspaces were not changed.

- Added semantic light/dark token pairs, alpha-compatible Tailwind color
  channels, and a `data-wtf-theme="system"` contract scoped to WTF OS.
- Reduced background noise to static, low-opacity grain/dots; the Grainient
  and connections graph now redraw when the system preference changes.
- Migrated active shells, rails, cards, status labels, recovery, drawer, and
  operator dialogs to semantic foreground/surface/overlay roles. The raster
  wordmark receives a semantic plate on structural rails so its black letter
  remains legible in both themes.
- Added source and browser proof for semantic tokens, dark overlays, live
  graph re-theming, recovery routes, narrow layouts, and both operator dialogs.

### Verification (local dirty tree only)

```bash
cd web
npm run lint
npm run typecheck
npm run test:unit -- tests/unit/theme-contract.test.ts tests/unit/graph-theme.test.ts tests/unit/tokens.test.ts
npm run test:contracts -- tests/contracts/wtf-os-token-contract.test.ts tests/contracts/app-ui-variant.contract.test.ts
npm run test:components
npx playwright test tests/journeys/theme-system.spec.ts tests/journeys/episodes.spec.ts tests/journeys/connections.spec.ts tests/journeys/motion.spec.ts tests/journeys/shell-drawer-focus.spec.ts tests/phase2/operators.spec.ts tests/phase2/audit-ui.spec.ts --project=phase1-chromium-1440 --workers=2
```

All commands above passed: 23 focused unit checks, 9 contracts, 100 component
checks, and 47 focused browser journeys. Light and dark live renders were also
inspected locally after the normal boot interval.

### Handoff note

The Playwright server performs a production build in `web/.next`. Do not run
that suite concurrently with a manually started `next dev` process in the same
checkout: the production build replaces the development server's generated
artifacts. Restart `next dev` after the suite when an interactive visual review
is needed.

No deployment, registry, credential, production, or legacy-variant mutation
occurred in this wave.
