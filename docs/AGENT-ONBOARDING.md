# Agent onboarding

This is the fast path for a new engineer or coding agent picking up
`wtfmedia`. Load this file at session start; it replaces ad-hoc codebase
exploration and keeps every session non-destructive.

## Project goal

WTFMedia turns the WTF podcast catalogue into a source-backed operating system:
catalogue browsing, episode workspaces, connection discovery, and Ask WTF. Ask
WTF must answer from retrieved transcript evidence or say when evidence is not
strong enough.

Do not promise "no hallucinations." The correct claim is narrower: the live
chat path is grounded against retrieved transcript excerpts, returns source
metadata, and has truthful fallback behavior when synthesis citations are weak.

## Architecture overview

WTFMedia is a two-worker Cloudflare deployment:

- **`wtfmedia-web`** — the Next.js 15 app, deployed via OpenNext.js for
  Cloudflare. Serves the public UI, operator workspace, and `/api/chat` route.
- **`wtfmedia-edge`** — the data/API layer. Handles RAG retrieval, chat
  inference (Workers AI), transcript ingestion (Queues), provenance (D1),
  asset storage (R2), and state (KV). The web worker has a service binding to
  the edge worker.

The web app uses the App Router with two audience surfaces:

| Surface | Routes | Auth |
|---|---|---|
| Public | `/`, `/chat`, `/episodes`, `/connections` | None |
| Operator | `/ops/*`, `/api/ops/*` | Cloudflare Access |
| Recovery | `/sign-in`, `/request-access`, `/ops/recover` | None |

Middleware (`web/middleware.ts`) injects auth headers (`x-wtf-ops-context`,
`x-wtf-ops-proof`) for operator routes and tags each request with
`x-wtf-route-kind` so the root layout can choose between the public shell and
operator shell.

## Current production surface

- Public domain: `https://wtfhq.in`
- Public chat route: `/api/chat`
- Chat request body: `messages: [{ role, content }]` plus `sourceMode`
- Supported source modes: `published`, `uncut`, `both`
- Response body: streamed/plain text
- Source metadata: `X-Sources` response header
- Fallback metadata: `X-Fallback` response header

The web UI reads headers before consuming the body stream. When writing tests or
manual probes, parse `X-Sources`; do not expect a JSON response body from the
production web route.

## Cloudflare resources

| Kind | Name | Purpose |
| --- | --- | --- |
| Worker | `wtfmedia-web` | Public web app and `/api/chat` route |
| Worker | `wtfmedia-edge` | Edge RAG, retrieval, inference, ingest consumer |
| R2 | `wtfmedia-catalogue` | Published transcripts, timestamp sidecars, uncut text, manifests |
| KV | `WTFMEDIA_STATE` | Ingest receipts, rate-limit windows, operational state |
| Vectorize | `wtfmedia-catalogue-v1` | 1,024-dimensional retrieval index |
| D1 | `wtfmedia-ops` | Provenance, source assets, transcript versions, chunks, jobs |
| Queue | `wtfmedia-ingest` | Transcript ingest jobs |
| Queue DLQ | `wtfmedia-ingest-dlq` | Terminal ingest failures |

Cloudflare resources are reached through bindings at runtime. Account API
tokens are operator-local and must not be committed or printed.

## Current corpus receipt

Approved/queryable corpus as of the 2026-09-01 release:

- 55 published YouTube transcript text assets.
- 43 published timestamp sidecars.
- 49 approved uncut text assets mapped to public episode IDs.
- 104 KV `ingest:` receipts: 55/55 published plus 49/49 mapped uncut.
- 11,948 Vectorize records with `source_mode` and `video_id` indexes.
- D1 provenance verifies all 49 mapped uncut assets.
- Queue backlog 0; DLQ held at its pre-release baseline of 18.

The 49-item mapping proves episode membership and evidence availability. It
does not prove trusted cross-timeline alignment, synchronized seeking, or
browser-playable uncut media.

Deferred from the clean ingestion claim:

- `WTF is a Battery?`
- `WEF - Economics`
- `The Foundery`
- `Brain Armstrong` transcript-row mismatch

Those rows can return fallback/source-adjacent answers, but they are not part
of the "fully ingested" corpus claim until their sheet/source mismatches are
resolved and receipted.

## Release state

| Track | Version | Status |
|---|---|---|
| Production | `v0.2.0` | Live at `wtfhq.in` |
| Latest alpha | `v0.3.2-alpha.1` | Named-person retrieval, source panel filtering |
| Latest beta | `v0.3.3-beta.1` | Authenticated staging lane, AppRail, login flow |

- Release notes: `docs/releases/`
- Changelog: `CHANGELOG.md`
- Root version: `package.json` tracks the latest pre-release.
- Web version: `web/package.json` tracks the web app version independently.

The beta track adds authenticated features (server-side RAG, persisted chat,
consolidation panels) that do not regress the public production path. The
alpha track adds retrieval and UI improvements to the public surface.

## Ingest safety rule

Transcript queue ingestion is fail-closed. Before staging vectors, the consumer
must verify that the declared D1 `source_assets` row:

- exists,
- belongs to the same episode,
- uses R2 storage,
- is marked `available`,
- and has its backing R2 object present.

If any of those checks fail, the job fails as `source_asset_unavailable`.
This prevents the earlier bad state where a Vectorize record could exist while
the expected source object receipt was missing.

## Where things live

### Web application

- Web app root: `web/`
- Public UI routes: `web/app/` (App Router)
- Operator routes: `web/app/(operator)/ops/`
- API routes: `web/app/api/`
- Chat API route: `web/app/api/chat/route.ts`
- Middleware: `web/middleware.ts`

### Components

- UI atoms: `web/components/ui/`
- Composed patterns: `web/components/patterns/`
- Brand elements: `web/components/patterns/brand/`
- App shells: `web/components/shells/`
- Public domain: `web/components/domain/public/`
- Operator domain: `web/components/domain/ops/`
- Legacy rollback: `web/components/legacy/public/`

### Styles and tokens

- Semantic tokens: `web/styles/tokens.css`
- Theme definitions: `web/styles/themes.css`
- Motion policies: `web/styles/motion.css`
- Tailwind config: `web/tailwind.config.ts`

### Edge worker

- Worker entry: `cloudflare/src/index.ts`
- Source-mode logic: `cloudflare/src/chat/source-mode.ts`
- Transcript ingest consumer: `cloudflare/src/ingest/transcript-consumer.ts`
- D1 provenance helpers: `cloudflare/src/db/provenance.ts`
- D1 migrations: `cloudflare/migrations/`
- Auth and RBAC: `cloudflare/src/auth/`

### Stories and tests

- Storybook stories: `web/stories/`
- Unit tests: `web/tests/unit/`
- Contract tests: `web/tests/contracts/`
- Journey tests: `web/tests/journeys/`
- Operator tests: `web/tests/phase2/`
- Visual baselines: `web/tests/visual/`
- Rollback tests: `web/tests/rollback/`
- Accessibility tests: `web/tests/accessibility/`

### Project state

- Architecture docs: `docs/architecture/`
- Release notes: `docs/releases/`
- Live handoff receipts: `.project/HANDOFF.md`
- Planning spine: `.planning/`
- Acceptance criteria: `ISA.md`

## Component hierarchy

Components follow a four-tier pattern under `web/components/`:

```
ui/           → Primitive atoms (Button, IconButton, Drawer, DatePicker)
patterns/     → Composed reusables (PublicShell, ScrollRail, ProductionBoard)
shells/       → App-level chrome (AppShell, AppRail)
domain/       → Feature-specific, split by audience:
  public/     → MigratedHomePage, MigratedChatPage, SourcePanel, etc.
  ops/        → OperatorShell, AuditWorkspace, IngestionJobLedger, etc.
```

Naming conventions:

- `Migrated*` — current implementation that replaced a legacy version.
- `Legacy*` — old implementation preserved for rollback safety.
- The active variant is controlled by the `WTF_PUBLIC_UI_VARIANT` env var.
  When unset or `migrated`, the `Migrated*` components render; when `legacy`,
  the `Legacy*` versions render. This is the production rollback mechanism.

Brand-specific visual elements live in `web/components/patterns/brand/`
(Grainient, MigratedWordmark, SignatureSparkle, WtfOsBoot, etc.).

## Design token system

All visual styling runs through CSS custom properties in the `--wtf-*`
namespace. The token pipeline:

1. **`web/styles/tokens.css`** — canonical semantic token layer.
2. **`web/styles/themes.css`** — light/dark theme definitions.
3. **`web/styles/motion.css`** — animation and motion policies.
4. **`web/tailwind.config.ts`** — maps tokens to Tailwind utilities.

Colors use `rgb(var(--wtf-*-rgb) / <alpha-value>)` for alpha compositing.
Semantic color names: `canvas`, `foreground`, `surface-subtle`,
`surface-raised`, `surface-structure`, `text-primary`, `text-secondary`,
`text-muted`, `overlay`, `editorial`, `live`, `attention`, `production`,
`knowledge`, `information`. Brand colors: `red`, `green`, `yellow`, `orange`,
`purple`, `blue`.

Fonts: Bricolage Grotesque (display), Fraunces (editorial/serif), Poppins
(body). Custom scales for font size (`label`, `body`, `heading`, `display`),
border radius (`control`, `panel`, `card`, `pill`), and animations (`marquee`,
`twinkle`, `floaty`, `popin`, `wtf-os-boot`).

When adding new components, use existing token names. Do not introduce raw
color values or new `--wtf-*` tokens without updating `tokens.css`.

## Verification commands

Use the smallest command that proves the change:

```bash
npm --prefix cloudflare test
npm --prefix cloudflare test -- transcript-ingest
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test:unit
npm --prefix web run test:contracts
npm --prefix web run test:journeys
npm run docs:architecture:check
npm run verify:phase3
```

For Storybook development and visual review:

```bash
npx --prefix web storybook dev -p 6006
```

For live chat smoke tests, use the production message shape and parse headers:

```bash
node - <<'NODE'
const res = await fetch('https://wtfhq.in/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    sourceMode: 'both',
    messages: [{ role: 'user', content: 'Compare the catalogue evidence on AI.' }]
  })
});
console.log(res.status, res.headers.get('x-fallback'));
console.log(decodeURIComponent(res.headers.get('x-sources') || '[]'));
console.log((await res.text()).slice(0, 240));
NODE
```

## Test infrastructure

| Suite | Location | Runner | Count |
|---|---|---|---|
| Unit | `web/tests/unit/` | Vitest | 22 |
| Contracts | `web/tests/contracts/` | Vitest | 7 |
| Journeys | `web/tests/journeys/` | Playwright | 15 |
| Operator (Phase 2) | `web/tests/phase2/` | Playwright | 8 |
| Visual | `web/tests/visual/` | Playwright | 3 viewports |
| Rollback | `web/tests/rollback/` | Playwright | 5 |
| Accessibility | `web/tests/accessibility/` | Playwright | per-route |
| Storybook | `web/stories/` | Storybook | 17 stories |
| Cloudflare | `cloudflare/src/__tests__/` | Vitest | 156+ |

Visual baselines are approved snapshots at 320px, 768px, and 1440px. Update
baselines intentionally when changing layout; do not auto-accept diffs.

## Planning spine

| File | Purpose |
|---|---|
| `.planning/STATE.md` | Current project phase and status |
| `.planning/ROADMAP.md` | 14-module development roadmap |
| `.planning/REQUIREMENTS.md` | Full requirements document |
| `ISA.md` | 166 acceptance criteria (50 complete as of 2026-09-01) |
| `.project/HANDOFF.md` | Reverse-chronological handoff log |
| `AGENTS.md` | Operating contract and boundary rules |

Check `ISA.md` for acceptance criteria before marking a feature complete.
Check `.planning/STATE.md` before planning new work to understand the current
phase.

## Non-destructive work patterns

These rules keep multiple engineers and agents productive on the same repo
without clobbering each other:

1. **Start clean.** Run `git status` before doing anything. If there are
   uncommitted changes from a prior session, stash them (`git stash -u`) or
   commit them before starting your work.
2. **Branch from `main`.** Never commit directly to `main` in a shared
   session. Never force-push to `main`.
3. **Scope your changes.** Touch only the files your task requires. Do not
   reformat, reorganize, or "clean up" unrelated code.
4. **Verify before opening a PR.** Run the smallest verification command that
   covers your change. At minimum: `typecheck` + `lint` for any web change,
   `npm --prefix cloudflare test` for any edge change.
5. **Write a handoff.** Update `.project/HANDOFF.md` with a checkpoint entry
   when your reviewed change is ready for another session to pick up.
6. **Refresh architecture docs.** Run `npm run docs:architecture:update` if
   you added, removed, or renamed modules.
7. **Track versions.** Root `package.json` and `web/package.json` versions
   track releases. Do not bump them unless cutting a release.
8. **Read before writing.** Check `AGENTS.md` for boundary rules, `ISA.md`
   for acceptance criteria, and `.planning/STATE.md` for current phase before
   planning new work.
9. **Do not duplicate exploration.** This file, plus `AGENTS.md` and
   `PROJECT.md`, contains everything you need to start. Do not re-explore the
   directory tree, re-read every component, or re-derive the architecture from
   scratch.

## Gated actions

Do not perform these without explicit owner approval in the current task:

- Cloudflare production deploys.
- DNS or custom-domain changes.
- Secret rotation or secret readback.
- Live ingest enqueue/replay.
- Corpus expansion from Google Drive, Frame.io, local uncut folders, or vault
  material.
- Force pushes, history rewrites, or cleanup of unrelated dirty files.

When in doubt, write the receipt and stop before the external mutation.
