# Project handoff

## 2026-08-31 Bounded flow redesign on tuned WTF OS shell

**Status:** LOCAL IMPLEMENTATION — not deployed, not committed. This pass keeps
the current tuned root/WTF OS light design as the source of truth and changes
only the approved flow furniture.

- Room: removed the obsolete dark evidence treatment; release context remains
  in Settings.
- Episodes: `/episodes` is now a catalogue/index only. Each episode opens a
  dedicated `/episodes/[id]` public workspace with published embed, truthful
  uncut availability, transcript, Ask WTF entry, and mapped connection
  keywords. The detail header uses the compact page title scale, unavailable
  uncut source cards are hidden, and transcript/keyword overflow is compacted
  behind native show-more accordions after the first three items.
- Ask WTF: composer is fixed above the dock, and evidence panels/rails use
  high-contrast light surfaces.
- Connections: graph remains the primary surface, paired with searchable
  ideas/episode-title evidence; repeated grids and raw video-ID displays were
  removed.
- Control room: removed the fake refresh action; active operational
  destinations remain surfaced through the split centered-logo dock.
- Navigation: four public destinations, centered WTF OS mark, then four
  operational destinations; mobile/tablet retain scroll-safe bottom navigation.

**Verified:** `npm run typecheck`; `npm run lint`; `npm run test:contracts`
77/77; `npm run test:unit` 69/69; focused Playwright journey slice 36/36 across
Episodes, URL state, Connections, and public routes; additional
accessibility/focus/motion/theme/viewport slice 67/67; `npm run build`
generated 68 pages including 55 static `/episodes/[id]` paths; production
preview smoke on `http://127.0.0.1:5191` confirmed `/episodes` and
`/episodes/SPLFyVyTI1A` return HTTP 200 on desktop/mobile with no horizontal
overflow, catalogue cards present, detail transcript/chat present, compact H1
rendering, no unavailable uncut component, and transcript/keyword accordions
present.

## 2026-08-31 Clean Ask WTF Cloudflare reconciliation branch

**Status:** CLEAN PR BRANCH READY — `codex/ask-wtf-cloudflare-fallbacks`
starts from `origin/main` (`4175ac9`) and carries only the deployed Ask WTF
Cloudflare/web service-binding reconciliation, source-mode fallbacks, generated
architecture ledger refresh, and reproducible OpenNext/Wrangler web build
files. No new corpus ingest, secret rotation, DNS mutation, or production
cutover was performed in this branch.

Verified on the clean worktree:

```bash
cd cloudflare && npm test
# 129 passing

cd web && npm run typecheck && npm run lint && npm run cf:build
# passed

cd web && npm run test:unit -- tests/unit/source-mode.test.ts
# 3 passing

cd web && npm run test:contracts -- tests/contracts/api-chat.contract.test.ts
# 20 passing

npm run docs:architecture:check
# current: 424 inputs, 4e5faa190841ccc1bfcf41248a3b450ac87f72a3ab3872cccc4e1d5c9be3574d
```

Remaining runtime gap remains unchanged from the production check: Vectorize
contains uncut vectors, but uncut R2/KV corpus receipts are not fully
reconciled. Do not claim all uncut assets ingested until an approved transcript
corpus is supplied and R2/KV/Vectorize agree.

## 2026-08-31 Light active-build dock and settings roadmap

**Status:** LOCAL IMPLEMENTATION — not deployed, not committed. The public and
ops shells now use explicit light mode and a shared bottom floating navigation
pill. The dock contains only active build surfaces: room, episodes,
connections, ask wtf, control room, production, episode map, and settings.
Held surfaces stay directly reachable but are moved out of primary navigation
and shown as roadmap items on `/ops/settings`.

- Removed the left panel / hamburger drawer as the primary shell navigation.
- Moved ops release context to settings only; it is not repeated on every ops
  page.
- Public home and control room list active build items only.
- `/ops/ingest`, `/ops/operators`, and `/ops/audit` remain truthful
  coming-soon pages in public-link mode, without dead controls or inferred
  backend data.

**Verified:** `npm run typecheck`; `npm run lint`; focused unit contracts
16/16; Playwright active-nav/settings roadmap/shell suite 40/40; light-theme
journey 8/8; `npm run build`; live smoke on `http://127.0.0.1:5175/ops/settings`
for desktop and mobile confirmed `data-wtf-theme="light"`, held routes absent
from the dock, roadmap links present, one settings context strip, and no
horizontal overflow.

## 2026-08-30 Uncut direct timestamps on target preview

**Status:** LIVE ON WORKERS.DEV — `wtfmedia-release-integration` @ `b88a1fd`.
Secrets were not rotated. Hostname cutover stays held. No uncut corpus was
invented or copied from published YouTube.

- Uncut citations are `uncut:{id}` plus `M:SS`. No http URL. A YouTube URL
  in metadata is never used as an uncut link.
- Published Ask WTF still returns six YouTube sources with clocks.
- Uncut toggle still falls back to named published sources
  (`X-Uncut-Unavailable: true`) until approved `uncut/{hash}.txt` files exist.
- Live: edge `c1ae291a-cd1b-4f17-9878-481087ad2c72`, web
  `b8879f21-530d-40e9-bc2e-fa396bf47c14` at
  `https://wtfmedia-web.connect2nikhai.workers.dev/chat`.

## 2026-08-30 Uncut R2 upload blocked — no approved transcript files

**Status:** BLOCKED ON CORPUS — operator script is ready in
`wtfmedia-release-integration`; no `uncut/` objects were written. R2
`wtfmedia-catalogue` is still 99 published objects. Published YouTube
`.txt` files were not copied. Secrets were not rotated. Hostname cutover
stays held.

- 10 eligible Clean Cut candidates (quarantined rows excluded).
- Catalogue sheet is readable; linked Drive transcript files 404 for this
  Google account; Frame.io Clean Cuts stay unfetched.
- Drop folder: integration `.planning/inputs/uncut-local/` (gitignored).
- Apply path: `node scripts/put-uncut-and-enqueue.mjs --dir … --apply`
  then enqueue with `INGEST_TOKEN` in the environment.

## 2026-08-30 P0 dual-source Ask WTF joined to target preview

**Status:** DONE ON CANONICAL PREVIEW — joined into
`wtfmedia-release-integration` as `bd041a3` and deployed. This dirty
`wtfmedia` checkout is not the live unit. Secrets were not rotated.
Hostname cutover stays held.

Live: `/chat` published is grounded with six published sources; uncut
returns no sources and does not convert published timestamps.

## 2026-08-30 Remaining priority: Ask WTF published + uncut first

**Status:** EXECUTED FOR P0 — dual-source Ask WTF is on workers.dev. Remaining
P0 stores: uncut assets still not activated; Settings integrations stay not
configured. Hostname cutover stays held.

- **P0:** join dual-source Ask WTF into the canonical preview (`be304bd`).
  Published is already live. Uncut stays filtered and not activated.
- **P0 stores:** KV ingest keys must not let uncut overwrite published
  hashes; R2 published objects stay published; Vectorize filters
  `source_mode` before composition; YouTube ingest = published; uncut
  upload/ASR/activation stay fail-closed; Settings integrations stay not
  configured.
- **P1:** D1 calendar already live — do not regress.
- **P3:** high-water / quiesce / `wtfhq.in` after P0.

Do not deploy, rotate secrets, or pause `9d9d` from this note.

## 2026-08-30 Remaining cutover planning after target preview

**Status:** PLANNING ONLY — Codex completed the `wtfmedia` workers.dev preview
from `wtfmedia-release-integration` @ `be304bd`. This checkout is not that
deployed unit. No source quiesce, DNS, Custom Domain, or `default` mutation
was performed here.

HITL locked: cut over from `be304bd`; accept no-apex rollback to
`https://wtfmedia-web.sheshnarayan-iyer.workers.dev/`.

Read-only DNS probe: `wtfhq.in` zone visible; no Custom Domain attached;
public apex/www still unanswered; DNS-record API still 403. Next remaining
gates are high-water freeze, then a separately authorized quiesce/delta
window, then Custom Domain attach.

Gates are in
[`2026-08-30-wtfos-internal-release-plan.md`](../docs/superpowers/plans/2026-08-30-wtfos-internal-release-plan.md).

## 2026-08-30 Ungated current-release navigation

**Status:** LOCAL IMPLEMENTATION IN THIS CHECKOUT — same shells and pages, not
Access-gated. Not deployed. Not joined to `be304bd`.

- Public and operator rails share `currentReleaseNavigation`: `/`, `/episodes`,
  `/connections`, `/chat`, `/ops`, `/ops/production`, `/ops/episodes`,
  `/ops/ingest`, `/ops/operators`, `/ops/audit`.
- Missing HMAC no longer bounces page views to recover. Visitor context is
  `public_link`. Mutation APIs (ingest admin, roster writes, audit export,
  delete) stay fail-closed.
- Home “what's open” lists the same destinations. Ingest, operators, and audit
  stay `unavailable` but remain clickable.

**Verified:** web typecheck; current-release-nav unit tests; Storybook
MigratedHomePage / ControlRoom / PublicShell.

**Not verified:** Playwright click-through of every destination (locator fix
landed; the CI rebuild run did not complete). Do not treat ungated navigation
as release evidence.

## 2026-08-30 Ops episodes list from title map

**Status:** LOCAL IMPLEMENTATION — `/ops/episodes` now renders the privacy-safe
title map (59 mapped / 3 quarantined). Not a live catalogue. No Wrangler, D1,
ingest, or 0006 overlap.

- Fail closed if the map is missing, contains URLs, or drops a quarantined title.
- Uncut stays `candidate` / `not-activated`. Quarantined rows are visible so
  they remain excluded; there is no inspect/provenance action.

**Verified:** web typecheck; title-map and provenance-truthfulness unit tests.

## 2026-08-30 Dual-source Ask WTF contract + Excel title map (B1+B2)

**Status:** LOCAL IMPLEMENTATION — no Wrangler writes, no D1 calendar/0006
overlap, no secrets, no Worker deploy.

- Ask WTF request now carries `sourceMode` (`published` default, `uncut`
  explicit). Edge retrieval filters vector `source_mode` before composition.
  Missing metadata is treated as published. A published timestamp is never
  rewritten as uncut.
- Public citations add `source_mode`, `mapping_status`, and `segment_id`.
  The composer exposes a published/uncut toggle; uncut stays unavailable
  unless a mapped uncut citation is returned.
- Excel snapshots at `.planning/inputs/podcast-catalog/2026-08-27/` map 59
  Internal rows to 62 transcript rows by exact title. Artifact:
  `title-map.json` (hashes and statuses only, no URLs). Three quarantined
  titles remain excluded. Internal clean-cut pointers are `candidate` and
  `not-activated`.

**Verified:** web typecheck; unit tests for source-mode and title map;
Cloudflare `source-mode` tests 4/4; api-chat contracts 20/20; chat Storybook
14/14.

## 2026-08-30 Cloudflare target foundation execution

**Status:** LIVE TARGET CREATE/COPY COMPLETE — Worker deployment and cutover
held at reviewed-source, calendar, secret, DNS, final-delta, and rollback gates.

- Executed from the existing
  [`9d9d` migration inventory](../.planning/inputs/2026-08-30-9d9d-cloudflare-migration-inventory.md),
  not a replacement plan. Every source read used `9d9d`, every target write
  used `wtfmedia`, and `default` remained untouched.
- Created target R2 `wtfmedia-catalogue`, KV `WTFMEDIA_STATE`, Vectorize
  `wtfmedia-catalogue-v1`, queues `wtfmedia-ingest` and
  `wtfmedia-ingest-dlq`, and D1 `wtfmedia-ops` without committing account IDs.
- R2: 99 unique objects / 13,204,194 bytes. Fresh source/target enumeration and
  all-object reads proved identical key sets, sizes, ETags, Standard storage,
  metadata, and SHA-256. Wrangler's bucket aggregate is lagging at zero and is
  recorded as stale rather than promoted over direct object evidence.
- KV: 55 persistent keys copied; source/target key sets and values match. No KV
  value was printed or retained in repository evidence.
- Vectorize: 5,742 unique target IDs equal the complete source ID set; contract
  is 1,024 dimensions with cosine distance.
- D1: migrations `0001`–`0005` applied, five receipts, 16 tables, zero pending
  repository migrations. The separately reviewed calendar migration is absent
  and was not invented.
- Queue shells are empty with zero producers and consumers. Their producer,
  consumer, retry, concurrency, and DLQ settings remain coupled to the edge
  deployment.
- Target `wtfmedia-edge` and `wtfmedia-web` remain absent. No Pages project,
  secret, DNS record, Custom Domain, Access policy, source resource, or
  `default` resource was changed or deleted. Temporary local R2 readers were
  stopped and did not create production Workers.

**Critical deployment boundary:** the current root edge suite passes 120/121
and fails the operator-navigation expectation after the Episodes link was
added. The release-integration worktree is dirty and lacks its local declared
dependency install; it is not a reviewed deployment unit. The calendar
migration is absent, and `EDGE_SHARED_SECRET` / `INGEST_TOKEN` values are
non-exportable and have not been recreated in the target. Do not deploy either
Worker, attach queue consumers, quiesce source, or map `wtfhq.in` until these
gates are resolved.

## 2026-08-30 WTF OS copy pass (waves A–D)

**Status:** LOCAL IMPLEMENTATION — copy only. No Cloudflare, deployment, Access,
calendar backend, or registry mutation.

Public `/` is now **the room**; `/ops` stays **control room**. Metadata names
**wtf os** and drops hardcoded 55 / "guest's own words". Production is no
longer labelled not-activated. Recover/sign-in/request-access no longer pretend
Access is live. Ask WTF names published vs uncut. Ingest mock jobs are gone.

**Verified:** web typecheck; focused unit tests; Storybook component suite for
the rewritten stories; Playwright 54/54 on control-room, production, recover,
operators, audit, home/chat rollback, and shell-drawer at 320/1440.

**Did not do:** calendar persistence backend; making `/ops/production` reachable
without ops context from the public home (production row is active, no href);
visual baseline regeneration; live browser walk.

**Next:** owner visual walk of `/`, `/chat`, `/ops`, `/ops/production`, and
recover. Visual snapshots will fail until re-approved.

## 2026-08-30 Cloudflare three-account reconciliation

**Status:** LIVE READ-ONLY INVENTORY + LOCAL DOCUMENTATION — the target
`wtfmedia` Wrangler profile was freshly reauthenticated; no Cloudflare write,
deployment, data copy, DNS/domain change, or secret mutation occurred. Current
release direction, the corrected source discrepancy ledger, and truthfulness
repairs are recorded in
[`2026-08-30-wtfos-internal-release-decisions.md`](../.planning/inputs/client-questions/2026-08-30-wtfos-internal-release-decisions.md)
and
[`2026-08-30-wtfos-internal-release-plan.md`](../docs/superpowers/plans/2026-08-30-wtfos-internal-release-plan.md).
The read-only 9d9d source inventory and target mapping are in
[`2026-08-30-9d9d-cloudflare-migration-inventory.md`](../.planning/inputs/2026-08-30-9d9d-cloudflare-migration-inventory.md).
No provider, deployment, R2/D1/vector, calendar, Access, DNS, or hostname state
changed.

**Historical baseline:** target create/copy actions were subsequently executed;
see the newer foundation receipt above. This section remains the pre-write
inventory checkpoint.

- Current release policy is a temporary ungated public link: anyone who knows
  the URL may view WTF OS and list/create/update production-calendar records.
  Delete and non-calendar administrative mutations remain unavailable or
  protected. Fine-grained RBAC and Cloudflare Access are next-release work.
- Three account roles are now explicit: `9d9d` is the read/copy source;
  repository-bound `wtfmedia` is the target that owns the active `wtfhq.in`
  zone; `default` is an unrelated Thoughtseed Labs control account with no WTF
  resource match and must remain untouched.
- Source evidence confirms administrable `wtfmedia-web` and `wtfmedia-edge`
  settings/deployments, 99 R2 objects (13.2 MB), 55 persistent
  `WTFMEDIA_STATE` keys, 5,742 vectors at 1,024 dimensions/cosine, and the
  ingest/DLQ queues. Source D1 and WTF Pages are absent.
- The target migration is clone-and-cutover, reusing the R2, KV, Vectorize,
  queues, live Workers AI binding, and Ask WTF pipeline. NVIDIA is only a
  code/planning seam in this inventory, not a proven live Cloudflare resource.
- Target OAuth reauthentication succeeded, but R2 remains disabled
  (Cloudflare code `10042`) and no R2 scope is granted; DNS-record reads are
  also denied. Enable/authorize those capabilities and obtain a bounded owner
  execution window before creating, copying, deploying, or cutting over.
- Cutover consistency now uses two passes: initial bulk R2/KV/Vectorize
  population, followed by a separately authorized source-ingress/producer
  quiesce, queue settlement, and final R2/KV/Vectorize delta. Record and restore
  the exact source Worker/queue before-state if that window aborts.
- The verified emergency source endpoint is
  `https://wtfmedia-web.sheshnarayan-iyer.workers.dev/` (HTTP 200). Current
  rollback removes the target Custom Domain and restores the pre-cutover
  no-apex state; it does not preserve same-host `wtfhq.in` continuity. Owner
  acceptance or a separately rehearsed same-host rollback route is required.
- The previous empty-KV, unresolved-edge-ownership, and generic-target-token
  blocker statements are superseded by this checkpoint.
- Corrected evidence: 59 Internal rows versus 62 transcript rows yields three,
  not two, unmatched transcript titles: `Brain Armstrong`, `WEF - Economics`,
  and `WTF is a Battery?`. They remain excluded from all data and UI outputs
  pending a source-backed outcome.
- The root operator episode drafts now fail closed: no mock catalogue, fixture
  provenance, simulated transcript activation, or default verified alignment
  is presented when the live source is absent.
- Local verification passed: web typecheck; 54 unit tests; ESLint; privacy
  scan (0 violations); and optimized Next build. An authenticated production
  build browser pass returned 200 for episode catalogue/detail and production
  calendar at 1440px and 320px with no console errors or failed requests.
- The UI Wave 1 and Cloudflare web-migration worktrees remain separate and
  uncommitted. Do not merge or deploy either as part of this checkpoint.

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
