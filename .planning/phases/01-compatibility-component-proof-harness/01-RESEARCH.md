# Phase 1: Compatibility + Component Proof Harness - Research

**Researched:** 2026-08-19
**Domain:** Next.js public-route compatibility, repository-owned design-system migration, and executable UI proof harness
**Confidence:** HIGH on repository architecture and locked scope; MEDIUM on newly introduced package versions because `slopcheck` was unavailable

<user_constraints>
## User Constraints (from CONTEXT.md)

The following decisions, discretion areas, and deferred ideas are copied verbatim from `01-CONTEXT.md`; they are authoritative for planning. [VERIFIED: `.planning/phases/01-compatibility-component-proof-harness/01-CONTEXT.md`]

### Locked Decisions

#### First proof slice

- **D-01:** Build `EpisodesBrowser` plus `ScrollRail` as the first vertical proof slice.
- **D-02:** Activating an episode opens an accessible URL-backed drawer or dialog. Browser back, refresh, sharing, and focus return must behave predictably.
- **D-03:** `ScrollRail` uses native horizontal scrolling, visible previous/next controls, scroll snap, keyboard navigation, and touch/trackpad input. Pointer dragging is an optional enhancement, not the only interaction. Reduced motion makes scrolling immediate.
- **D-04:** The episode drawer contains compatibility-safe public detail only: existing public title, show, thumbnail, duration, and views when available; transcript availability, context, or excerpt; verified source and timestamp links; and existing Ask WTF entry points. It excludes workflow, ownership, private assets, operator permissions, and dossier features.

#### Visual migration depth

- **D-05:** Use controlled hybrid adoption: preserve route function, data meaning, and recognizable WTF identity while applying semantic tokens, stronger hierarchy, tactile surfaces, explicit focus, responsive behavior, and reduced-motion policy.
- **D-06:** Visibly redesign all protected public UI routes in Phase 1: `/`, `/episodes`, `/connections`, and `/chat`. Preserve the complete `/api/chat` contract.
- **D-07:** Use one shared shell, token, typography, control, and state language while giving Home, Episodes, Connections, and Ask WTF distinct editorial compositions suited to their jobs.
- **D-08:** Use playful WTF motion selectively as signature effects. Sparkles, marquees, tactile hover, and an optional desktop cursor appear only where purposeful; the native cursor is the baseline; looping effects can pause; reduced-motion preferences take effect immediately.

#### Compatibility policy

- **D-09:** Freeze URLs, bookmarks, query strings, navigation meaning, data semantics, episode selections, deep links, streaming, citations, source fields, required headers, status codes, and safe error shapes. Only approved visual and layout changes are allowed without a new explicit contract decision.
- **D-10:** `/chat` remains the canonical public Ask WTF URL and retains its complete streaming behavior. Remove `ModelPicker` from the public experience and present one consistent Ask WTF identity; any diagnostic model control remains internal and feature-gated.
- **D-11:** `/connections` presents the redesigned public graph and an equivalent accessible list on the same page. Both projections use the same public evidence and expose no operator permissions, tasks, owners, leads, budgets, briefs, health, or production state.
- **D-12:** Migrate and verify routes one at a time while retaining the previous versions for rollback. Cut over Phase 1 only after every public route and `/api/chat` pass together.

#### Acceptance evidence

- **D-13:** Provide one blocking `npm run verify:phase1` command used locally and in CI. It aggregates lint, types, build, component, browser, accessibility, privacy, visual, performance, API/RAG compatibility, and rollback checks.
- **D-14:** Capture reviewed evidence for every redesigned route and changed shared component at 320px, 768px, and 1440px, including applicable loading, empty, error, focus, and open-overlay states. Visual baseline replacements require owner approval.
- **D-15:** Measure current route, bundle, and browser-performance baselines before implementation. Planning derives explicit numeric budgets from that repository evidence, and the proof command blocks material regressions.
- **D-16:** Phase 1 is accepted only when every protected public route and `/api/chat` pass the automated gate, the owner approves the visual evidence, and a documented rollback restores the prior public experience without data changes.

### The agent's Discretion

- Select exact testing packages, versions, and harness wiring during planning, within the selective Radix, headless TanStack, repository-owned styling, and Storybook direction in `DESIGN.md`. Dependency installation happens only inside an approved implementation plan.
- Set exact performance thresholds after measuring the current repository baseline; thresholds may not be invented without evidence.
- Choose internal component/module boundaries and deterministic privacy-safe fixture structure as long as the locked public contracts and acceptance evidence remain intact.
- Choose the implementation order among public routes after the Episodes proof slice, provided migration stays route-by-route and release remains phase-wide.

### Deferred Ideas (OUT OF SCOPE)

- Authenticated `/ops`, organization identity, server-enforced capability policy, and the truthful operator shell belong to Phase 2 after Phase 1 acceptance.
- Canonical episode provenance, dual timelines, Knowledge/dossiers, Production, Control Room, Analytics, People, integrations, and migration closure remain in Phases 3–8 under their recorded authorization gates.
- No external-service change, deployment, corpus mutation, registry mutation, provider change, or new private-data surface is part of Phase 1 planning.
</user_constraints>

<phase_requirements>
## Phase Requirements

All 21 required IDs below are assigned to Phase 1 in the approved requirements and roadmap. [VERIFIED: `.planning/REQUIREMENTS.md`; `.planning/ROADMAP.md`]

| ID | Description | Research Support |
|---|---|---|
| COMP-01 | A public visitor can continue using `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` throughout the migration. | Baseline contract manifest, route-by-route migration, and phase-wide Playwright gate. [VERIFIED: codebase route inventory] |
| COMP-02 | A public visitor's supported bookmarks, query parameters, filters, and episode deep links retain their meaning after route files move. | URL-state tests plus query-preserving episode drawer controller. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-search-params] |
| COMP-03 | A public Ask WTF client receives compatible request validation, streaming behavior, citation/source fields, status codes, required headers, and safe error shapes. | Direct Route Handler contract tests and browser journey against a deterministic edge stub. [VERIFIED: `web/app/api/chat/route.ts`; `web/app/chat/page.tsx`] |
| COMP-04 | An anonymous response exposes only allowlisted published fields and never enumerates internal tasks, owners, leads, budgets, briefs, health, or production state. | Explicit public DTO/fixture allowlist and forbidden-field response/DOM scans. [VERIFIED: `web/lib/episodes.ts`; `web/lib/connections.ts`; `web/app/api/chat/route.ts`] |
| COMP-05 | A public user sees a read-only `/connections` projection that shares evidence-domain truth without sharing operator permissions or interaction state. | One shared public evidence projection feeding both canvas and semantic list; privacy assertions. [VERIFIED: `web/app/connections/page.tsx`; `web/components/ConnectionGraph.tsx`] |
| DSYS-01 | A component consumes repository-owned semantic tokens for canvas, surface, foreground, editorial, live, attention, knowledge, information, and production roles instead of raw color values. | Token schema test and raw-color lint over migrated component paths. [VERIFIED: `DESIGN.md` §7] |
| DSYS-02 | A user sees the shipping WTF wordmark, committed palette, Bricolage Grotesque, Fraunces, Poppins, cream/ink dominance, tactile depth, and editorial voice preserved across migrated surfaces. | Computed-style assertions plus brand-critical screenshots. [VERIFIED: `PRODUCT.md`; `web/components/Wordmark.tsx`] |
| DSYS-03 | A user sees orange only as a provisional production-state token whose foreground pairing has passed contrast and design approval. | One `production` token, no raw orange use, contrast result, and owner visual approval. [VERIFIED: `DESIGN.md` §7] |
| DSYS-04 | A keyboard user can operate every shipped control, overlay, selection widget, filter, table, and navigation pattern without pointer-only behavior. | Story play tests and Playwright keyboard journeys. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/] |
| DSYS-05 | A user can distinguish unknown, unavailable, stale, partial, empty, permission-denied, error, offline, unmapped, conflicted, and measured-zero states without relying on color alone. | Typed state fixtures, visible labels/icons/copy, and story matrix. [VERIFIED: `docs/design/APP-FLOW.md`] |
| DSYS-06 | A keyboard user always receives a visible high-contrast focus indicator and focus returns predictably after overlays close or routes change. | Global focus policy, Radix dialog tests, route focus tests. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/] |
| DSYS-07 | A user requesting reduced motion receives static or shortened alternatives for marquees, sparkles, drawers, transitions, charts, and other nonessential movement. | Media-query CSS, paused animation fixtures, and Playwright emulation. [CITED: https://www.w3.org/WAI/WCAG22/Techniques/] |
| DSYS-08 | A user can complete each shipped workflow at 320, 768, and 1440 CSS-pixel viewport widths without hidden actions or horizontal page overflow. | Parameterized route and state viewport projects with overflow assertions. [CITED: https://www.w3.org/WAI/WCAG22/Understanding/reflow] |
| DSYS-09 | A screen-reader user receives a semantic alternative containing equivalent meaning whenever a canvas graph, chart, timeline, or spatial board is shown. | Graph/list parity derived from the same data and parity tests by node ID/count/links. [VERIFIED: `web/lib/connections.ts`] |
| DSYS-10 | A maintainer can trace each shipped component from tokens through primitives and patterns to a named consuming workflow, with deterministic stories and complete state fixtures. | Story metadata/fixtures and a component-consumer manifest. [CITED: https://storybook.js.org/docs/writing-tests] |
| QUAL-01 | A maintainer can run one documented command set that proves lint, type checking, production build, unit tests, and component tests for the owned slice. | `verify:phase1` orchestrator with named child scripts and fail-fast exit. [VERIFIED: `01-CONTEXT.md` D-13] |
| QUAL-02 | A maintainer can run blocking contract and browser journeys for every protected public route and `/api/chat` behavior. | Route matrix, API matrix, and Playwright journeys. [CITED: https://nextjs.org/docs/app/guides/testing] |
| QUAL-03 | A maintainer can run keyboard, focus, accessible-name, live-region, reduced-motion, and serious-axe checks for every shipped workflow. | Storybook a11y in error mode plus `@axe-core/playwright` route scans and manual keyboard assertions. [CITED: https://storybook.js.org/docs/writing-tests/accessibility-testing; https://playwright.dev/docs/accessibility-testing] |
| QUAL-04 | A maintainer can compare deterministic 320, 768, and 1440 viewport evidence plus brand-critical visual snapshots before approving a migration. | Playwright committed screenshots in a pinned Chromium/CI image; updates require owner approval. [CITED: https://playwright.dev/docs/test-snapshots] |
| QUAL-05 | A maintainer can prove synthetic fixtures, bundles, rendered payloads, logs, errors, snapshots, and planning artifacts contain no credentials, private source payloads, embedded private links, or machine-local paths. | Bounded source/artifact scanner plus public-field allowlists and test-only synthetic data. [VERIFIED: `AGENTS.md`; `ISA.md` ISC-119..127] |
| QUAL-06 | A maintainer can measure and approve route performance, bundle impact, RAG latency, and interaction regressions against the recorded baseline. | Wave 0 baseline with repeated Lighthouse runs, bundle manifest, deterministic RAG stub timing, then owner-locked numeric budgets. [CITED: https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Read `PROJECT.md` and `.project/HANDOFF.md` before work. This research did so. [VERIFIED: `AGENTS.md`]
- Treat the Thoughtseed Labs vault as referenced knowledge only; never copy private notes, transcripts, or seed corpora into runtime or fixtures. [VERIFIED: `AGENTS.md`]
- Preserve existing tooling and deployment boundaries, use declared project commands, and keep generated output ignored. [VERIFIED: `AGENTS.md`; `PROJECT.md`]
- Keep changes in this repository. Do not mutate vault registries, client stores, Paseo, OmniRoute, credentials, or external deployment state without a separate approved task. [VERIFIED: `AGENTS.md`]
- Never add secrets, `.env` data, native session identifiers, prompt/response bodies, or machine-local absolute checkout paths. [VERIFIED: `AGENTS.md`]
- A reviewed implementation checkpoint must be recorded in `.project/HANDOFF.md`; this research-only task is explicitly restricted to `01-RESEARCH.md`, so it does not update the handoff. [VERIFIED: `AGENTS.md`; task scope]

## Summary

Phase 1 should be planned as a compatibility migration with an evidence-producing Wave 0, not as a styling sweep. The current web app has four App Router UI routes and one Route Handler, but no repository-owned web test configuration, Storybook, browser suite, CI workflow, or aggregate verifier. The protected files are also part of a materially dirty working tree: the current `/api/chat` implementation is an uncommitted Vercel-to-Cloudflare proxy and differs substantially from `HEAD`. The plan must first record the accepted working-tree behavior in executable contract fixtures without reverting, staging, or silently replacing it. [VERIFIED: `git status --short`; `git diff -- web/app/api/chat/route.ts`; `web/package.json`]

The first implementation slice should introduce tokens, minimal accessible wrappers, deterministic fixtures, Storybook/Vitest, and Playwright before migrating `EpisodesBrowser`. The episode selection should be represented by a preserved query parameter on `/episodes`, backed by a controlled Radix Dialog styled as a drawer. `ScrollRail` should retain native overflow and add previous/next buttons, snap, touch/trackpad input, and keyboard behavior. After this slice proves the harness, migrate Home, Connections, and Ask WTF one route at a time; final acceptance runs both migrated and retained legacy variants together. [VERIFIED: `01-CONTEXT.md` D-01..D-16; CITED: Radix Dialog and Next.js URL-state documentation]

Testing should deliberately separate concerns: Vitest node projects for pure helpers and `/api/chat` contracts, Storybook’s Vitest addon in Chromium for component states/interactions, Playwright Test for whole-route compatibility/accessibility/visual journeys, Lighthouse CI for repeated route/bundle measurements, and a repository-specific bounded privacy scan for the project’s explicit leak classes. No performance number belongs in the plan until Wave 0 measures the accepted baseline; insert a human checkpoint to approve the numeric budget file before visual implementation begins. [CITED: official Storybook, Vitest, Playwright, and Lighthouse CI documentation]

**Primary recommendation:** Build a baseline-first, dual-variant proof harness; migrate Episodes → Connections → Ask WTF → Home through shared tokens/shells; then require `cd web && npm run verify:phase1` plus owner-approved visual and budget manifests before cutover. [VERIFIED: `01-CONTEXT.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Semantic tokens, focus, motion, responsive policy | Browser / Client | CDN / Static | CSS/custom properties and fonts govern rendered behavior; static assets remain repository-owned. [VERIFIED: `DESIGN.md` §§7–10] |
| Public shell and URL continuity | Frontend Server (SSR) | Browser / Client | App Router owns route layout/metadata while client islands own navigation focus and interactive state. [VERIFIED: `web/app/layout.tsx`] |
| Episodes browser, ScrollRail, URL drawer | Browser / Client | Frontend Server (SSR) | The server supplies public episode data; the client owns native scrolling, focus, query selection, and transcript loading. [VERIFIED: `web/app/episodes/page.tsx`; `web/components/EpisodesBrowser.tsx`] |
| Connections graph and equivalent list | Browser / Client | Frontend Server (SSR) | Canvas simulation is client-side; both projections must consume the same server-imported public JSON. [VERIFIED: `web/components/ConnectionGraph.tsx`; `web/lib/connections.ts`] |
| Ask WTF presentation and streaming/body consumption | Browser / Client | API / Backend | The client submits/reads the response; the Route Handler validates and proxies without exposing the edge secret. [VERIFIED: `web/app/chat/page.tsx`; `web/app/api/chat/route.ts`] |
| `/api/chat` contract | API / Backend | External Cloudflare service boundary | Next preserves the browser contract and maps the authenticated Worker JSON response to public text/headers. [VERIFIED: `web/app/api/chat/route.ts`; `cloudflare/src/index.ts`] |
| Component stories and unit contracts | Build / CI | Browser / Client | Storybook/Vitest run deterministic components in Chromium while node tests cover pure/API contracts. [CITED: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon] |
| Route, accessibility, visual, rollback proof | Build / CI | Frontend Server (SSR) | Playwright starts production-like Next servers and exercises both retained route variants. [CITED: https://playwright.dev/docs/test-webserver] |
| Route and bundle performance budgets | Build / CI | Browser / Client | Lighthouse CI measures repeated browser runs and asserts an owner-approved budget file. [CITED: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md] |

## Current Repository Evidence

- `web/package.json` pins Next `15.5.19`, React `19.0.0`, TypeScript `5.7.3`, and Tailwind `3.4.17`, with only `dev`, `build`, and `start` scripts. [VERIFIED: `web/package.json`; npm registry]
- There is no `web/tests`, `.storybook`, Vitest config, Playwright config, web CI workflow, or direct test runner dependency. [VERIFIED: codebase file scan; `npm ls --prefix web --depth=0`]
- `EpisodesBrowser` keeps the active episode only in React state; refresh, back, and sharing therefore cannot reproduce the open drawer. The bespoke overlay adds Escape/body locking but not a dialog role, label contract, focus trap, or trigger focus restoration. [VERIFIED: `web/components/EpisodesBrowser.tsx`]
- `DragRow` implements pointer dragging and suppresses clicks after drag, but has no previous/next controls, snap contract, or keyboard behavior. [VERIFIED: `web/components/DragRow.tsx`]
- `ConnectionGraph` is a pointer-driven canvas with an absolutely positioned selection panel. The page already contains related disclosure/list content, but there is no tested one-to-one semantic parity contract for the graph’s exact nodes/edges. [VERIFIED: `web/components/ConnectionGraph.tsx`; `web/app/connections/page.tsx`]
- `/chat?q=...` auto-submits once, reads `X-Sources`, `X-Model`, and `X-Fallback`, consumes the body with `ReadableStream.getReader()`, and currently exposes `ModelPicker`; the locked decision removes only the public picker while preserving the rest of the contract. [VERIFIED: `web/app/chat/page.tsx`; `01-CONTEXT.md` D-10]
- The current `/api/chat` validates JSON, retains at most eight messages, selects the last non-empty user message, limits it to 2,000 characters, requires the server-only edge secret, maps Worker sources to snake_case public fields, returns `text/plain`, and emits `X-Sources`, `X-Model`, `X-Fallback`, and `Cache-Control: no-store` on success. [VERIFIED: `web/app/api/chat/route.ts`]
- `web/app/globals.css`, Tailwind config, and components still contain raw hex values, `transition: all`, indefinite animations, smooth scrolling without a reduced-motion override, and native-cursor suppression on fine pointers. [VERIFIED: `web/app/globals.css`; `web/tailwind.config.ts`; codebase grep]
- `web/.next` exists but predates the current working-tree API/UI changes, so it is not a valid numeric Phase 1 baseline. [VERIFIED: filesystem timestamps; current git diff]

## Standard Stack

### Core (preserve)

| Library | Version | Purpose | Why Standard Here |
|---|---:|---|---|
| Next.js | 15.5.19 | App Router, server rendering, Route Handler | Locked existing framework; no major upgrade in this phase. [VERIFIED: `web/package.json`; `.planning/REQUIREMENTS.md` Out of Scope] |
| React / React DOM | 19.0.0 | UI and client interaction islands | Existing version; compatible with selected Radix and Storybook peers. [VERIFIED: `web/package.json`; npm peer metadata] |
| TypeScript | 5.7.3 | Strict contracts and fixture types | Existing strict/noEmit setup. [VERIFIED: `web/tsconfig.json`] |
| Tailwind CSS | 3.4.17 | Existing utility layer over semantic CSS variables | Locked existing major; retain repository-owned visual authorship. [VERIFIED: `web/package.json`; `DESIGN.md`] |
| `@radix-ui/react-dialog` | 1.1.23 [ASSUMED] | Accessible controlled Dialog styled as the episode drawer | The individual primitive preserves selective adoption and declares React 19 peers; exact package remains human-gated because slopcheck was unavailable. [CITED: https://www.radix-ui.com/primitives/docs/components/dialog] |

### Proof Harness

| Library | Version | Purpose | When to Use |
|---|---:|---|---|
| ESLint | 9.39.5 [ASSUMED] | Blocking source lint with existing `eslint-config-next` | Direct dev dependency; do not use ESLint 10 because `eslint-config-next@15.5.19` declares support only through ESLint 9. [VERIFIED: npm peer metadata] |
| Storybook | 10.5.9 [ASSUMED] | State-complete component catalogue | Every changed shared component and proof pattern; no Server Page stories. [CITED: https://storybook.js.org/docs/get-started/frameworks/nextjs-vite] |
| `@storybook/nextjs-vite` | 10.5.9 [ASSUMED] | Next-aware Vite Storybook framework | Required by the locked Storybook/Next/Vite direction and Vitest addon. [CITED: https://storybook.js.org/docs/get-started/frameworks/nextjs-vite] |
| `@storybook/addon-vitest` | 10.5.9 [ASSUMED] | Execute story render/interaction tests in browser | `vitest --project=storybook` locally and in CI. [CITED: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon] |
| `@storybook/addon-a11y` | 10.5.9 [ASSUMED] | axe-backed component accessibility gate | Configure `parameters.a11y.test = "error"`. [CITED: https://storybook.js.org/docs/writing-tests/accessibility-testing] |
| Vite | 8.2.1 [ASSUMED] | Storybook/Vitest transform layer | Direct peer matching Storybook’s `^8` range; not an application bundler replacement. [VERIFIED: npm peer metadata] |
| Vitest | 4.1.11 [ASSUMED] | Node unit/API contracts and Storybook projects | Keep node and Storybook browser projects separate. [CITED: https://vitest.dev/guide/browser/] |
| `@vitest/browser-playwright` | 4.1.11 [ASSUMED] | Chromium provider for Storybook/Vitest browser tests | Component interactions in a real browser rather than jsdom event simulation. [CITED: https://vitest.dev/guide/browser/] |
| `@playwright/test` | 1.62.1 [ASSUMED] | Route journeys, viewports, screenshots, keyboard/focus, rollback | One Chromium project for blocking proof; optional extra engines can remain nonblocking. [CITED: https://playwright.dev/docs/test-webserver] |
| `@axe-core/playwright` | 4.13.0 [ASSUMED] | Whole-route axe scans after relevant UI states open | Scan ready, drawer-open, error, and result states; fail serious/critical violations. [CITED: https://playwright.dev/docs/accessibility-testing] |
| `@lhci/cli` | 0.15.1 [ASSUMED] | Repeated route metrics and approved performance budgets | Measure production builds only; keep reports on filesystem. [CITED: https://github.com/GoogleChrome/lighthouse-ci] |

### Deliberately Not Installed in Phase 1

| Package / Approach | Disposition | Reason |
|---|---|---|
| TanStack Table | Defer | No Phase 1 consuming workflow needs headless table state; `/connections` needs a semantic list/table, not sorting/pagination infrastructure. [VERIFIED: `01-CONTEXT.md`; `DESIGN.md` selective-adoption rule] |
| Phosphor Icons | Defer | Current proof can use semantic text controls and retained brand glyphs; add only when a consumed pattern needs normalized icons. [VERIFIED: `DESIGN.md` component foundation] |
| Full `radix-ui` bundle or shadcn visual layer | Reject | Phase 1 needs Dialog behavior only; the project owns appearance and avoids broad adoption. [VERIFIED: `DESIGN.md` §11] |
| Jest/jsdom + React Testing Library | Reject | Vitest node projects and Storybook Chromium cover the owned unit/component surface with fewer duplicate environments. [CITED: Storybook Vitest documentation] |
| Chromatic or another hosted visual service | Reject for this phase | Playwright has local screenshot comparison; external service/account changes are out of scope. [CITED: https://playwright.dev/docs/test-snapshots; VERIFIED: `01-CONTEXT.md` Deferred Ideas] |
| Cypress | Reject | Playwright is already needed for Storybook’s browser provider and supplies webServer, screenshots, and multi-viewport journeys. [CITED: official Playwright and Storybook documentation] |

### Planned Installation

Do not run this until an approved implementation task reaches its package-verification checkpoint. [VERIFIED: `01-CONTEXT.md`; `DESIGN.md`]

```bash
cd web
npm install --save-exact \
  @radix-ui/react-dialog@1.1.23
npm install --save-dev --save-exact \
  eslint@9.39.5 \
  storybook@10.5.9 \
  @storybook/nextjs-vite@10.5.9 \
  @storybook/addon-vitest@10.5.9 \
  @storybook/addon-a11y@10.5.9 \
  vite@8.2.1 \
  vitest@4.1.11 \
  @vitest/browser-playwright@4.1.11 \
  @playwright/test@1.62.1 \
  @axe-core/playwright@4.13.0 \
  @lhci/cli@0.15.1
npm exec playwright install chromium
```

The Storybook/Vitest versions were published one day before this research. Pin them exactly, install in a dedicated Wave 0 commit, run one minimal story and one CI Chromium test, and stop before application migration if peer resolution or transforms fail. [VERIFIED: npm registry publish timestamps; ASSUMED package legitimacy]

## Package Legitimacy Audit

`slopcheck` was not installed, and the task forbids installing dependencies during research. Per the legitimacy protocol, every proposed package is therefore `[ASSUMED]` and the planner must add a `checkpoint:human-verify` immediately before the install. Registry versions, creation dates, weekly downloads, source repositories, peer ranges, and postinstall metadata were queried on 2026-08-19; no proposed package returned a `scripts.postinstall` value. Registry existence/downloads do not waive the human gate. [VERIFIED: npm registry; npm downloads API; environment audit]

| Package | Registry | Age | Downloads last week | Source Repo | slopcheck | Disposition |
|---|---|---:|---:|---|---|---|
| `eslint@9.39.5` | npm | ~13 years | 135,093,798 | github.com/eslint/eslint | unavailable | Human verify; exact ESLint-9 pin [ASSUMED] |
| `storybook@10.5.9` | npm | ~10 years | 18,182,125 | github.com/storybookjs/storybook | unavailable | Human verify [ASSUMED] |
| `@storybook/nextjs-vite@10.5.9` | npm | ~2 years | 2,028,679 | github.com/storybookjs/storybook | unavailable | Human verify [ASSUMED] |
| `@storybook/addon-a11y@10.5.9` | npm | ~9 years | 8,797,202 | github.com/storybookjs/storybook | unavailable | Human verify [ASSUMED] |
| `@storybook/addon-vitest@10.5.9` | npm | ~1.4 years | 2,972,410 | github.com/storybookjs/storybook | unavailable | Human verify [ASSUMED] |
| `vite@8.2.1` | npm | ~6 years | 142,923,941 | github.com/vitejs/vite | unavailable | Human verify [ASSUMED] |
| `vitest@4.1.11` | npm | ~4.7 years | 77,612,487 | github.com/vitest-dev/vitest | unavailable | Human verify [ASSUMED] |
| `@vitest/browser-playwright@4.1.11` | npm | ~10 months | 5,614,323 | github.com/vitest-dev/vitest | unavailable | Human verify [ASSUMED] |
| `@playwright/test@1.62.1` | npm | ~6 years | 37,489,737 | github.com/microsoft/playwright | unavailable | Human verify [ASSUMED] |
| `@axe-core/playwright@4.13.0` | npm | ~5 years | 7,538,685 | github.com/dequelabs/axe-core-npm | unavailable | Human verify [ASSUMED] |
| `@lhci/cli@0.15.1` | npm | ~7 years | 1,314,931 | github.com/GoogleChrome/lighthouse-ci | unavailable | Human verify [ASSUMED] |
| `@radix-ui/react-dialog@1.1.23` | npm | ~5.7 years | 60,882,808 | github.com/radix-ui/primitives | unavailable | Human verify [ASSUMED] |

**Packages removed due to slopcheck `[SLOP]` verdict:** none; slopcheck did not run.

**Packages flagged as suspicious `[SUS]`:** none classified; all remain `[ASSUMED]` and human-gated because slopcheck was unavailable.

**Fresh-release caution:** Storybook `10.5.9` and Vitest `4.1.11` were published on 2026-08-18; do not combine package bootstrap and route migration in one task. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
anonymous browser
  │
  ├─ GET /, /episodes, /connections, /chat
  │      │
  │      ▼
  │  Next App Router public pages ──► PublicShell + semantic tokens
  │      │                                  │
  │      ├─ server-imported public JSON     ├─ legacy variant (retained)
  │      │                                  └─ migrated variant (candidate)
  │      ▼
  │  client interaction islands
  │      ├─ ScrollRail ──► episode query state ──► Radix-backed drawer
  │      ├─ canvas graph ─┬─► visual projection
  │      │                └─► semantic list projection (same data)
  │      └─ Ask WTF composer/thread
  │                         │ POST /api/chat
  │                         ▼
  └──────────────────► Next Route Handler
                            │ validate + allowlist + safe errors
                            │ server-only X-Edge-Secret
                            ▼
                       Cloudflare RAG Worker (unchanged external boundary)
                            │
                            ▼
                 text body + encoded source headers/status

deterministic proof path
  fixtures ─► Storybook/Vitest component proof
           ├► Vitest API/unit contracts
           ├► Playwright route/a11y/visual/rollback journeys
           ├► Lighthouse repeated baseline/budget assertions
           └► bounded privacy/artifact scan
                         │
                         ▼
                 npm run verify:phase1
```

The graph makes the service boundary explicit: Phase 1 may test the Next proxy against a local Worker-shaped stub, but it does not mutate Cloudflare, Vercel, corpus data, secrets, or deployments. [VERIFIED: `AGENTS.md`; `01-CONTEXT.md`]

### Recommended Project Structure

```text
web/
├── app/                              # protected public URLs remain unchanged
│   ├── page.tsx
│   ├── episodes/page.tsx
│   ├── connections/page.tsx
│   ├── chat/page.tsx
│   └── api/chat/route.ts
├── components/
│   ├── brand/                        # Wordmark, Sparkle, Marquee, optional cursor
│   ├── ui/                           # Button, IconButton, Dialog/Drawer, state surfaces
│   ├── patterns/                     # PublicShell, ScrollRail, GraphWithList, SourcePanel
│   ├── domain/public/                # EpisodeCard/Drawer, public chat pieces
│   └── legacy/public/                # retained pre-migration route/component variants
├── lib/public/                       # public DTOs, URL state, route variant, contract helpers
├── styles/                           # tokens.css, themes.css, motion.css
├── stories/fixtures/                 # deterministic privacy-safe fixtures only
├── tests/
│   ├── contracts/                    # URL/API/DTO contract tests
│   ├── journeys/                     # Playwright protected-route journeys
│   ├── accessibility/                # axe + keyboard/focus suites
│   ├── visual/                       # route/component screenshots + approval manifest
│   ├── performance/                  # LHCI config, captured baseline, approved budgets
│   ├── privacy/                      # bounded source/build/artifact scan
│   ├── rollback/                     # both-variant proof
│   └── support/                      # RAG stub and fixtures
├── .storybook/                       # Next/Vite config and global token decorators
├── vitest.config.ts
├── playwright.config.ts
└── scripts/verify-phase1.mjs         # thin child-script orchestrator, not a test runner
```

Do not move route files into `(public)` until contract tests are green. Route groups do not change URLs, but moving every route while simultaneously changing layout and interactions makes failures difficult to localize. [VERIFIED: `DESIGN.md`; CITED: Next.js App Router testing guidance]

### Pattern 1: Executable Compatibility Manifest

**What:** Freeze the accepted pre-migration behavior as machine-readable fixtures plus tests before visual work. Include URL/path/query examples, navigation labels/destinations, public episode/connection field allowlists, `/chat?q=` behavior, and every `/api/chat` request/response branch. [VERIFIED: `01-CONTEXT.md` D-09]

**When to use:** Wave 0 and every route migration task.

```ts
// Source: repository contract derived from web/app/api/chat/route.ts
export const chatContract = {
  successHeaders: [
    "content-type",
    "x-sources",
    "x-model",
    "x-fallback",
    "cache-control",
  ],
  sourceKeys: ["n", "video_id", "title", "score", "t", "time", "url"],
  safeFailures: [
    { case: "bad-json", status: 400, body: "bad json" },
    { case: "no-user", status: 400, body: "no user message" },
    { case: "too-long", status: 400, body: "question too long" },
    { case: "unconfigured", status: 503, jsonKey: "error" },
    { case: "upstream-failure", status: 503, jsonKey: "error" },
  ],
} as const;
```

Treat executable current code as the contract source when older prose conflicts. For example, current Worker code accepts 2,000 question characters while `docs/CLOUDFLARE-INFRASTRUCTURE.md` still says 1,500. Phase 1 must freeze or explicitly reconcile this difference before implementation; it may not choose silently. [VERIFIED: `cloudflare/src/index.ts`; `docs/CLOUDFLARE-INFRASTRUCTURE.md`]

### Pattern 2: URL State Controls the Episode Drawer

**What:** Keep `/episodes` canonical; set one namespaced query parameter (recommended `episode=<video_id>`) while preserving all existing search parameters. Derive the selected public episode from the server-provided dataset. Invalid IDs render the list with a safe not-found/unavailable notice, never operator data. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-search-params]

**When to use:** Opening, closing, refreshing, sharing, and navigating the episode drawer.

```tsx
// Sources: Next.js useSearchParams docs + Radix Dialog docs
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";

function useEpisodeSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const hrefWithEpisode = (id?: string) => {
    const next = new URLSearchParams(search.toString());
    id ? next.set("episode", id) : next.delete("episode");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return {
    selectedId: search.get("episode"),
    open: (id: string) => router.push(hrefWithEpisode(id), { scroll: false }),
    close: () => router.replace(hrefWithEpisode(), { scroll: false }),
  };
}

function EpisodeDrawer({ episode }: { episode: PublicEpisode | null }) {
  const selection = useEpisodeSelection();
  return (
    <Dialog.Root open={Boolean(episode)} onOpenChange={(open) => !open && selection.close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer-content" aria-describedby={undefined}>
          <Dialog.Title>{episode?.title}</Dialog.Title>
          {/* structured public detail and transcript states */}
          <Dialog.Close>close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Wrap the `useSearchParams` client subtree in `Suspense` or pass Page `searchParams` into the client island; static production builds can otherwise fail even when development appears fine. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-search-params]

The final close implementation must additionally restore focus to the invoking episode card when it still exists; direct/shared loads should focus a stable Episodes heading or results region instead. Test both paths explicitly. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]

### Pattern 3: Native ScrollRail, Progressive Enhancement

**What:** Use `overflow-x: auto`, scroll snap, ordinary links/buttons inside the rail, and visible previous/next buttons. Let Tab traverse interactive content naturally; controls scroll without moving focus. Pointer dragging may be layered on after keyboard/touch/trackpad proof. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/]

**When to use:** Episode groups and `GuestStrip`/future PersonRail.

```tsx
// Source: WAI Carousel APG; native overflow remains the baseline
const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
  ? "auto"
  : "smooth";

function move(direction: -1 | 1) {
  rail.current?.scrollBy({
    left: direction * Math.max(rail.current.clientWidth * 0.8, 240),
    behavior,
  });
}

return (
  <section aria-labelledby={labelId}>
    <div className="rail-controls">
      <button type="button" aria-label="previous episodes" onClick={() => move(-1)}>previous</button>
      <button type="button" aria-label="next episodes" onClick={() => move(1)}>next</button>
    </div>
    <div ref={rail} className="overflow-x-auto snap-x snap-mandatory">
      {children}
    </div>
  </section>
);
```

### Pattern 4: One Evidence Projection, Two Connection Renderers

**What:** Normalize public nodes/edges once, then pass the exact same typed projection to the canvas and semantic list. The list exposes node label/category/episode count and source links; it must not be a loose summary elsewhere on the page. A parity test compares stable IDs and source links. [VERIFIED: `web/lib/connections.ts`; `01-CONTEXT.md` D-11]

**When to use:** `/connections` and any future visual-only public evidence view.

```ts
// Source: repository public connection types
type PublicConnectionProjection = {
  nodes: Array<{
    id: string;
    label: string;
    category: string;
    episodeCount: number;
    episodeIds: string[];
  }>;
  edges: Array<{ a: string; b: string; shared: number }>;
};

expect(ids(renderedSemanticList)).toEqual(ids(canvasProjection.nodes));
expect(sourceLinks(renderedSemanticList)).toEqual(sourceLinks(canvasProjection.nodes));
```

### Pattern 5: Retained Route Variants for Rollback

**What:** Keep each old route/component implementation under `components/legacy/public`, wrap the route in a tiny server-side variant selector, and test both variants against the same compatibility manifest. The selector is a non-secret server configuration value; never expose it as a public query switch. No corpus/data migration is involved. [VERIFIED: `01-CONTEXT.md` D-12/D-16]

**When to use:** Every protected route until Phase 1 acceptance and later migration-closure authority.

```ts
// Source: project rollback decision; exact environment name is a recommendation
export function publicUiVariant(): "legacy" | "migrated" {
  return process.env.WTF_PUBLIC_UI_VARIANT === "legacy" ? "legacy" : "migrated";
}
```

The plan must rehearse the legacy selector locally/CI only. Changing Vercel configuration or deploying either variant is a separate owner-approved task. [VERIFIED: `AGENTS.md`; `01-CONTEXT.md` Deferred Ideas]

### Anti-Patterns to Avoid

- **Snapshotting the old Git commit instead of accepted current behavior:** the working tree contains the deployed edge proxy behavior not present in `HEAD`. Establish authority first and snapshot the accepted worktree. [VERIFIED: git diff; `.project/HANDOFF.md`]
- **One massive route-group move:** it entangles URL, shell, styles, and interaction failures. Keep URLs/files stable until the per-route manifest is green. [VERIFIED: `01-CONTEXT.md` D-12]
- **Local state as shareable selection:** React-only `active` state cannot satisfy back/refresh/share. Use URL state. [VERIFIED: `web/components/EpisodesBrowser.tsx`]
- **A canvas plus a vaguely related list:** semantic equivalence requires the same projection and testable parity. [VERIFIED: DSYS-09]
- **CSS-only reduced motion after JavaScript starts loops:** gate both CSS animations and requestAnimationFrame behavior; the current graph continues scheduling frames indefinitely. [VERIFIED: `web/components/ConnectionGraph.tsx`]
- **Visual snapshots from mixed developer machines:** Playwright warns that rendering varies by OS/browser/hardware. Generate and approve baselines in the same pinned CI container/browser used for comparison. [CITED: https://playwright.dev/docs/test-snapshots]
- **Calling production RAG inside every deterministic test:** use a Worker-shaped local stub for blocking contract/latency tests; keep the existing production evaluation as an explicit approved smoke. [VERIFIED: `scripts/evaluate_production_rag.mjs`; project external-service boundary]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Modal focus/inertness/Escape/announcements | A custom overlay plus window key listener | Radix Dialog under a repository-owned Drawer wrapper | Dialog focus containment, labelling, Escape, and restoration have many edge cases. [CITED: https://www.radix-ui.com/primitives/docs/components/dialog] |
| Component execution environment | A custom fixture viewer/test renderer | Storybook Next/Vite + Vitest addon | Stories become browser render/interaction tests and remain reviewable. [CITED: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon] |
| Browser server lifecycle/retries/screenshots | Shell sleeps and screenshot scripts | Playwright Test `webServer`, locators, traces, and `toHaveScreenshot` | It owns readiness, browser isolation, assertions, and diagnostics. [CITED: https://playwright.dev/docs/test-webserver; https://playwright.dev/docs/test-snapshots] |
| Accessibility engine | A home-grown ARIA checker | Storybook a11y + `@axe-core/playwright`, supplemented by explicit keyboard/focus tests | Automated axe catches only part of accessibility; interaction assertions cover the rest. [CITED: https://playwright.dev/docs/accessibility-testing] |
| Performance runner/statistics | One-off `performance.now()` page scripts | Lighthouse CI repeated runs and budget assertions | Browser performance is variable; repeated runs and versioned budgets are required. [CITED: https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md] |
| Carousel physics | A drag-only JavaScript carousel | Native overflow, scroll snap, buttons, keyboard, touch/trackpad; optional pointer enhancement | Native scrolling survives input diversity and reduced motion. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/] |
| General secret-scanning engine | A claim that a regex proves all secrets absent | Use the project’s bounded privacy scanner for named leak classes; add an approved established secret scanner later if required | Phase 1 must prove exact prohibited artifacts without pretending a small regex is universal secret detection. [VERIFIED: QUAL-05; environment audit] |
| Test runner/orchestrator | A custom assertion framework | A thin Node script that invokes named npm scripts and propagates exit codes | The repository needs one command, not another testing abstraction. [VERIFIED: `01-CONTEXT.md` D-13] |

**Key insight:** custom code is appropriate only for project-specific contracts (public field allowlists, compatibility manifest, privacy denylist, route-variant selector). Interaction engines, browsers, accessibility analysis, and performance collection should remain established tools. [VERIFIED: phase requirement split]

## Runtime State Inventory

This is a migration phase, so source-file grep is insufficient. The canonical question is: after route and component files change, what runtime state could still carry the old public experience or contract? [VERIFIED: phase-research runtime-state protocol]

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | Public episode/connection JSON, 55 transcript files/sidecars, corpus manifest, and external user bookmarks/query URLs exist, but Phase 1 does not rename datastore keys or migrate corpus records. `/chat?q=` is existing bookmarkable state; the proposed episode selection adds URL state without rewriting data. [VERIFIED: `web/src/data`; `web/public/transcripts`; `web/app/chat/page.tsx`] | **Code edit + contract fixtures, no data migration.** Preserve public IDs/URLs and validate unknown IDs safely. Do not modify corpus data. |
| Live service config | Vercel currently supplies the public site and server-only proxy variables; Cloudflare owns the Worker, bindings, queues, storage, and edge secret. These live settings are outside Phase 1. [VERIFIED: `.project/HANDOFF.md`; `cloudflare/wrangler.jsonc`; `web/app/api/chat/route.ts`] | **None in this phase.** Test against a local stub. Document, but do not perform, any later variant cutover/deployment. |
| OS-registered state | No launchd/systemd/Task Scheduler/pm2 registration is referenced by the web app or phase artifacts. Local Playwright browser caches exist but are tooling caches, not application identity. [VERIFIED: repository scan; environment audit] | **None.** CI installs pinned Chromium; do not depend on a developer’s cached revision. |
| Secrets/env vars | `VERCEL_URL`, `CLOUDFLARE_RAG_URL`, and `CLOUDFLARE_EDGE_SHARED_SECRET` are read by protected web code; Cloudflare separately has `EDGE_SHARED_SECRET` and `INGEST_TOKEN`. No values were inspected. [VERIFIED: codebase grep] | **Code edit only if adding the non-secret rollback selector.** Preserve existing names/semantics; fixtures use dummy values; privacy tests prove no value reaches bundles/snapshots/logs. |
| Build artifacts / installed packages | `web/.next` and `web/node_modules` exist from earlier work; the `.next` output predates current route/API changes. Future Storybook, coverage, Playwright, Lighthouse, and test-result outputs are already broadly ignored, but Storybook-specific output must be verified ignored. [VERIFIED: filesystem; `web/.gitignore`; `.gitignore`] | **Regenerate, do not migrate.** Never derive budgets from stale `.next`; pin packages in `web/package-lock.json`; verify generated directories remain ignored. |

**Runtime conclusion:** no production data migration or live-service mutation belongs in Phase 1. The runtime risks are compatibility state (bookmarks/queries), server-only environment names, stale build output, and variant rollback behavior. [VERIFIED: inventory above]

## Common Pitfalls

### Pitfall 1: Baseline Authority Is Ambiguous

**What goes wrong:** tests freeze `HEAD` while the accepted/deployed `/api/chat` proxy and public cleanup exist only in the dirty working tree, or they silently bless unrelated edits. [VERIFIED: git status/diff; `.project/HANDOFF.md`]

**Why it happens:** source control and deployment history are temporarily out of sync. [VERIFIED: repository state]

**How to avoid:** first implementation checkpoint records the exact base SHA, relevant dirty-file diff inventory, deployed release note, and owner decision about which behavior is canonical; no stage/clean/revert. [VERIFIED: task boundary]

**Warning signs:** contract fixtures differ from current `web/app/api/chat/route.ts`, or a task modifies a pre-existing dirty file without documenting overlap.

### Pitfall 2: “Streaming” Is Assumed Rather Than Measured

**What goes wrong:** a UI refactor preserves final text but changes first-byte/chunk behavior, source-header timing, error handling, or loading announcements. [VERIFIED: COMP-03]

**Why it happens:** the current Next proxy awaits Worker JSON and then returns a text body, while the client still consumes a `ReadableStream`; older `HEAD` streamed provider tokens directly. [VERIFIED: current file and git diff]

**How to avoid:** Wave 0 records an accepted production/local trace for response headers, first byte, chunk sequence, terminal body, and UI state transitions; the contract test preserves exactly what the owner accepts.

**Warning signs:** tests assert only HTTP 200/final text or replace `getReader()` with `.text()` without explicit contract approval.

### Pitfall 3: Query State Breaks Static Builds or Existing Queries

**What goes wrong:** `/episodes?episode=...` works in `next dev` but `next build` fails, or opening a drawer drops unrelated query parameters. [CITED: Next.js `useSearchParams` docs]

**Why it happens:** App Router static rendering requires Suspense around client `useSearchParams`, and manual string construction overwrites the query.

**How to avoid:** clone `URLSearchParams`, mutate only the namespaced key, wrap the client island in Suspense, and test unknown/repeated/encoded parameters.

**Warning signs:** `router.push("?episode=" + id)` or development-only verification.

### Pitfall 4: Focus Return Works Only for Click-Opened Drawers

**What goes wrong:** Escape restores focus for an on-page trigger but a refreshed/shared deep link closes to `body`, a removed node, or hidden content. [CITED: WAI Dialog APG]

**Why it happens:** direct navigation has no invoking element.

**How to avoid:** define two focus paths: return to the stable episode trigger after same-page open; otherwise focus the Episodes heading/results region. Test Escape, close button, backdrop, browser Back, refresh, and invalid ID.

**Warning signs:** only pointer-close tests or `document.activeElement === body` after close.

### Pitfall 5: Visual Evidence Depends on Live Fonts/Thumbnails

**What goes wrong:** screenshots change because Google Fonts or YouTube thumbnails load differently, not because UI changed. [VERIFIED: `web/app/globals.css`; `web/lib/episodes.ts`; CITED: Playwright screenshot warning]

**Why it happens:** current fonts and images are network-hosted.

**How to avoid:** wait for `document.fonts.ready`; use committed privacy-safe image fixtures or deterministic request interception for blocking screenshots; capture separate owner-review evidence with real public media if required. Generate baselines only in the pinned CI browser environment.

**Warning signs:** snapshots contain fallback fonts, blank images, or platform-specific suffixes.

### Pitfall 6: Axe Is Treated as Complete Accessibility Proof

**What goes wrong:** zero axe errors passes while Arrow keys, Back, focus restoration, reduced motion, canvas parity, or live-region timing fail. [CITED: Playwright accessibility documentation disclaimer]

**Why it happens:** automated rules detect only machine-identifiable violations.

**How to avoid:** pair axe with explicit keyboard, focus, semantic-parity, motion-emulation, and viewport journeys.

**Warning signs:** QUAL-03 maps to one axe scan only.

### Pitfall 7: Canvas Motion Ignores Reduced Motion

**What goes wrong:** CSS animations stop but `ConnectionGraph` continues requestAnimationFrame simulation. [VERIFIED: `web/components/ConnectionGraph.tsx`]

**Why it happens:** motion policy is applied only in stylesheets.

**How to avoid:** initialize a stable layout without animation when reduced motion is active; pause when offscreen; provide list access independent of the canvas.

**Warning signs:** RAF count grows during a reduced-motion browser test.

### Pitfall 8: Performance Numbers Are Invented Before Wave 0

**What goes wrong:** the plan encodes generic “good” thresholds unrelated to the current app and violates D-15. [VERIFIED: `01-CONTEXT.md`]

**Why it happens:** planners want static acceptance numbers before measurement.

**How to avoid:** make baseline capture a blocking Wave 0 task, collect repeated route metrics, then pause for owner approval of exact budgets committed to a versioned file. [CITED: Lighthouse variability guidance]

**Warning signs:** numeric LCP/bundle/RAG thresholds appear before a baseline artifact exists.

### Pitfall 9: Fresh Harness Packages and App Migration Land Together

**What goes wrong:** failures cannot be attributed to package/tool setup versus application changes. [VERIFIED: npm publish timestamps]

**Why it happens:** Storybook/Vitest current patches are one day old and no prior harness exists.

**How to avoid:** package legitimacy checkpoint → lockfile-only bootstrap → minimal smoke story/browser → config commit → baseline commit → first component migration.

**Warning signs:** the first harness commit also rewrites `EpisodesBrowser`.

## Code Examples

Verified patterns from official sources and current repository contracts appear in the Architecture Patterns section. Two additional validation patterns are central.

### Route-level Axe After Opening the Drawer

```ts
// Source: https://playwright.dev/docs/accessibility-testing
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("episode drawer has no serious axe violations", async ({ page }) => {
  await page.goto("/episodes?episode=RSB58m7Xwhg");
  await expect(page.getByRole("dialog")).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(({ impact }) =>
      impact === "serious" || impact === "critical"
    )
  ).toEqual([]);
});
```

### Deterministic Visual Evidence

```ts
// Source: https://playwright.dev/docs/test-snapshots
for (const viewport of [
  { name: "320", width: 320, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 1000 },
]) {
  test(`episodes drawer ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/episodes?episode=RSB58m7Xwhg");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`episodes-drawer-${viewport.name}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Storybook Jest-based `test-runner` | Storybook Vitest addon with Next/Vite browser tests | Current Storybook documentation; current package line 10.5.9 | Use `vitest --project=storybook`; do not add legacy test-runner/coverage packages. [CITED: Storybook migration guide] |
| Experimental Next/Vite Storybook package | `@storybook/nextjs-vite` | Current Storybook framework docs | Use the stable framework name; it supports Next ≥14.1 and current test features. [CITED: Storybook Next/Vite docs] |
| jsdom-only component proof | Vitest Browser Mode with Playwright provider | Vitest 4 documentation | Exercise native browser focus, layout, media queries, and events. [CITED: https://vitest.dev/guide/browser/] |
| Bespoke overlay with manual Escape/body lock | Accessible primitive or native dialog contract | Current Radix/WAI guidance | Obtain focus containment, naming, and restoration, then style as WTF. [CITED: Radix Dialog; WAI Dialog APG] |
| Pointer-drag carousel | Native scroll + visible controls + optional enhancement | WAI Carousel APG | Tab order remains native; control and motion policies are testable. [CITED: WAI Carousel APG] |
| Single screenshot on a developer machine | Pinned browser/container snapshots with reviewed updates | Current Playwright guidance | Visual diffs become reproducible; owner approves baseline changes. [CITED: Playwright visual comparisons] |

**Deprecated/outdated for this phase:**

- Storybook `@storybook/test-runner`: current docs recommend the Vitest addon for Vite/Next projects. [CITED: Storybook Vitest migration guide]
- `next lint`: use direct ESLint CLI with the existing Next config; the project currently has no lint script. [VERIFIED: current Next/package configuration]
- Public `ModelPicker`: explicitly removed by D-10; do not rebuild it inside Ask WTF. [VERIFIED: `01-CONTEXT.md`]
- Pointer-only `DragRow`: replaced by `ScrollRail`; pointer drag can return only as an optional enhancement. [VERIFIED: `01-CONTEXT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The proposed external package set installs and resolves together exactly as registry peer metadata indicates. [ASSUMED] | Standard Stack | Harness bootstrap may need a patch-level adjustment; human verification must happen before install. |
| A2 | The relevant current dirty working-tree behavior, after explicit owner confirmation, is the intended compatibility baseline. [ASSUMED] | Current Evidence / Pitfalls | Freezing the wrong baseline could preserve abandoned behavior or overwrite unrelated work. |
| A3 | `episode=<video_id>` is an acceptable new query key for the public drawer. [ASSUMED] | Architecture Pattern 2 | A collision with an undocumented consumer would require a different namespaced key. |
| A4 | A non-secret server-side `WTF_PUBLIC_UI_VARIANT` selector is acceptable for local/CI rollback rehearsal. [ASSUMED] | Architecture Pattern 5 | If deployment policy rejects runtime selectors, rollback must use a separately built legacy artifact or revert commit. |
| A5 | Deterministic Worker-shaped stubs are acceptable as the blocking RAG latency/contract gate, with the existing live evaluation treated as separate release evidence. [ASSUMED] | Validation Architecture | Owner may require live latency in the blocking command, which would introduce network variance and credential/rate-limit concerns. |

## Open Questions (RESOLVED)

1. **Which exact dirty working-tree behavior is the Phase 1 compatibility baseline? — RESOLVED by authority procedure.**
   - Settled decision: the baseline is the bounded protected-file inventory and content hashes captured from the current dirty worktree, then explicitly approved by the owner in `phase1-baseline-approval.json`. `HEAD`, stale `.next` output, and unrelated dirty files are not baseline authority.
   - Required procedure: Plan 01-01 captures repository-relative paths, base SHA, protected hashes, route/query/navigation/API behavior, and streaming trace without staging, cleaning, reverting, or copying raw diffs. No later plan may execute unless the approval status and protected hashes still match.

2. **What numeric route, bundle, interaction, and RAG budgets should block? — RESOLVED by measurement-and-approval procedure.**
   - Settled decision: research does not invent numeric thresholds. Plan 01-06 produces a fresh build, five repeated Lighthouse runs per protected UI route, route resource summaries, controlled interaction/RAG timings, sample identifiers, observed maxima/ranges, and evidence-derived headroom. Plan 01-07 pauses for owner approval of the exact resulting `phase1-budgets.json` values before any migrated styling executes.
   - Required procedure: every numeric budget cites measured samples, units, environment identity, baseline/proposal hashes, and any owner adjustment rationale; absent, stale, or unapproved values fail closed.

3. **What exact aspect of “streaming behavior” is frozen? — RESOLVED by observed-trace procedure.**
   - Settled decision: the approved current dirty-worktree behavior is authoritative, not an assumption about older `HEAD`. Plan 01-01 records that the browser consumes a `ReadableStream` while the current Next proxy awaits Worker JSON before returning the public text body, and captures first-byte, chunk sequence/count, completion, headers, statuses, and safe-error behavior.
   - Required procedure: the owner approves that trace in `phase1-baseline-approval.json`; Plans 01-05, 01-06, and 01-15 assert the same trace. Any requested change to token cadence requires a new explicit contract decision rather than silent normalization.

4. **How will the retained legacy variant be selected after acceptance? — RESOLVED by bounded selector procedure.**
   - Settled decision: Phase 1 uses the non-secret server-only `WTF_PUBLIC_UI_VARIANT=legacy|migrated` selector for local and CI builds, never a query, cookie, client value, or public control. The legacy route/style/shared-presentation baseline remains runnable and is compared at 320/768/1440 before cutover.
   - Required procedure: the final rollback runner builds and smokes both selector values without data or external-system mutation. The plan documents a separately built legacy artifact and explicit revert as operational alternatives, but any Vercel environment/deployment change remains outside Phase 1 and requires separate owner approval.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---:|---|
| Node.js | Next, Vitest, Storybook, Playwright, verifier | ✓ | 26.7.0 | CI must pin a supported Node line rather than inherit “latest.” [VERIFIED: environment audit] |
| npm | exact dependency/lockfile install | ✓ | 11.19.0 | none needed [VERIFIED: environment audit] |
| Existing web dependencies | current build/baseline | ✓ | matches `web/package.json` | run `npm ci` in CI [VERIFIED: `npm ls --prefix web --depth=0`] |
| Storybook/Vitest/Playwright/axe project packages | component/browser proof | ✗ | — | install only after package legitimacy checkpoint [VERIFIED: environment audit] |
| Playwright browser cache | local browser proof | ✓, unverified compatibility | multiple cached revisions | implementation runs pinned `npm exec playwright install chromium`; CI uses pinned browser/container [VERIFIED: environment audit] |
| Google Chrome | Lighthouse local measurement | ✓ | app installed | Playwright-bundled Chromium for route tests [VERIFIED: environment audit] |
| Lighthouse CLI | ad-hoc local probe | ✓ | 13.3.0 | project-pinned `@lhci/cli` for reproducible CI [VERIFIED: environment audit] |
| Wrangler | existing Worker inspection only | ✓ | 4.124.0 | no Worker mutation required [VERIFIED: environment audit] |
| CI workflow | blocking shared gate | ✗ | — | Wave 0 adds repository-owned workflow; no CI provider config currently exists [VERIFIED: codebase scan] |
| `gitleaks` or equivalent | generic secret scan | ✗ | — | bounded Phase 1 privacy scanner + existing ignore rules; any future general scanner needs separate approved tool bootstrap [VERIFIED: environment audit] |
| `slopcheck` | research package legitimacy | ✗ | — | all proposed packages remain `[ASSUMED]` and human-gated [VERIFIED: environment audit] |
| Context7 CLI/MCP | library documentation | ✗ | — | official primary documentation was used [VERIFIED: environment audit] |

**Missing dependencies with no fallback:** the shared CI workflow and project-pinned test packages block implementation acceptance; Wave 0 owns them after human package verification. [VERIFIED: QUAL-01..06]

**Missing dependencies with fallback:** `gitleaks`, Context7, and slopcheck are not implementation blockers if the bounded privacy scan, official docs, and human package checkpoint are used as documented. [VERIFIED: audit above]

## Validation Architecture

`.planning/config.json` does not set `workflow.nyquist_validation` to `false`, so Nyquist validation is enabled and this section is required. [VERIFIED: `.planning/config.json`]

### Test Framework

| Property | Value |
|---|---|
| Unit/API framework | Vitest 4.1.11 node projects [ASSUMED] |
| Component framework | Storybook 10.5.9 + Vitest addon + Chromium [ASSUMED] |
| Route/E2E/visual framework | Playwright Test 1.62.1, blocking Chromium project [ASSUMED] |
| Accessibility | Storybook a11y in error mode plus `@axe-core/playwright` and explicit keyboard/focus tests [ASSUMED] |
| Performance | Lighthouse CI 0.15.1 plus deterministic proxy/RAG timing fixture [ASSUMED] |
| Config files | none today — Wave 0 creates `eslint.config.mjs`, `.storybook/*`, `vitest.config.ts`, `playwright.config.ts`, and `lighthouserc.*` [VERIFIED: codebase scan] |
| Quick run command | `cd web && npm run test:contracts` (proposed) |
| Full suite command | `cd web && npm run verify:phase1` (locked name) |

### Proposed Script Contract

The aggregate script should be a small Node process runner with a static command list, clear section labels, exit-code propagation, and artifact locations. It must never swallow failures or mutate external services. [VERIFIED: D-13; project constraints]

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --project=unit",
    "test:contracts": "vitest run --project=contracts",
    "test:components": "vitest run --project=storybook",
    "build:storybook": "storybook build",
    "test:browser": "playwright test --project=phase1-chromium --grep-invert @visual",
    "test:a11y": "playwright test --project=phase1-chromium --grep @a11y",
    "test:visual": "playwright test --project=phase1-chromium --grep @visual",
    "test:privacy": "node tests/privacy/scan.mjs",
    "test:performance": "lhci autorun --config=./lighthouserc.cjs",
    "test:rollback": "node tests/rollback/verify.mjs",
    "verify:phase1": "node scripts/verify-phase1.mjs"
  }
}
```

The verifier sequence should be: preflight/baseline manifest → lint → types → unit/contracts → Storybook render/interactions/a11y → Storybook build → migrated production build → route/browser/a11y/visual → performance/RAG fixture → privacy scan of source and generated artifacts → retained-variant rollback rehearsal. If the variant is build-time, the rollback step must build and smoke both variants; do not claim a source-level selector alone proves rollback. [VERIFIED: D-13..D-16]

### Immutable Threat Definitions and Mutable Execution Evidence

PLAN `<threat_model>` tables and their mirror in `01-VALIDATION.md` are design-time definitions, not mutable test logs. They retain `defined` status and supply globally unique threat ID, owning plan/task, exact command, severity, ASVS mapping, and mitigation. Executors must never rewrite PLAN rows to `passed` or `failed`. [VERIFIED: fail-closed validation architecture]

`web/scripts/run-phase1-threat.mjs` executes the exact command owned by a task and atomically records the result in `web/tests/security/phase1-threat-results.json`, keyed by threat ID. Each result records owner, task, exact command, exit code, SHA-256 output digests, bounded sanitized evidence, completion timestamp, and `passed|failed`. The runner records failures before returning nonzero, rejects definition drift, uses bounded locking plus atomic rename, and excludes raw output, environment values, secrets, request/response bodies, private payloads, user content, and machine-local paths. [VERIFIED: AGENTS.md privacy and portability constraints]

Candidate aggregation scopes evidence to plans with completed summaries plus earlier completed tasks in the current plan. Exemptions are literal IDs for future approval/finalization tasks; candidate mode must reject overbroad/inferred exemptions and must never require future-plan results. Final aggregation has no exemptions: Plan 01-20 records its focused threat commands first, verifies all 72 high/critical results are present and passed, then runs the unqualified aggregate, and only afterward sets final Validation flags. This ordering removes the self-referential condition in which an aggregate waits for the result of a command that itself invokes that aggregate. [VERIFIED: D-13/D-16; fail-closed ordering]

### Phase Requirements → Test Map

No proposed Phase 1 test file exists yet; every row is a Wave 0 or implementation gap. [VERIFIED: codebase scan]

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| COMP-01 | All five protected URLs resolve in both variants | contract + E2E | `npm run test:browser -- tests/journeys/public-routes.spec.ts` | ❌ Wave 0 |
| COMP-02 | Bookmarks/queries/deep links preserve meaning | contract + E2E | `npm run test:browser -- tests/journeys/url-state.spec.ts` | ❌ Wave 0 |
| COMP-03 | Complete Ask WTF request/response contract | unit integration + E2E | `npm run test:contracts -- tests/contracts/api-chat.contract.test.ts` | ❌ Wave 0 |
| COMP-04 | Anonymous public field allowlist/no internal fields | unit + DOM + artifact | `npm run test:contracts -- tests/contracts/public-projection.contract.test.ts` | ❌ Wave 0 |
| COMP-05 | Connections is read-only public projection | unit + E2E | `npm run test:browser -- tests/journeys/connections.spec.ts` | ❌ Wave 0 |
| DSYS-01 | Migrated components use semantic tokens | schema/lint | `npm run test:unit -- tests/unit/tokens.test.ts` | ❌ Wave 0 |
| DSYS-02 | Wordmark/palette/fonts/depth/voice preserved | computed style + visual | `npm run test:visual -- --grep @brand` | ❌ Wave 0 |
| DSYS-03 | Orange is one provisional approved token | schema + contrast + visual | `npm run test:unit -- tests/unit/tokens.test.ts` | ❌ Wave 0 |
| DSYS-04 | All controls keyboard-operable | story interaction + E2E | `npm run test:components && npm run test:browser -- --grep @keyboard` | ❌ Wave 0 |
| DSYS-05 | State vocabulary is distinct and non-color-only | stories + assertions | `npm run test:components -- AvailabilityState` | ❌ Wave 0 |
| DSYS-06 | Focus visible/restored on overlay/route changes | story interaction + E2E | `npm run test:browser -- tests/journeys/focus.spec.ts` | ❌ Wave 0 |
| DSYS-07 | Reduced-motion alternatives apply immediately | browser media emulation | `npm run test:browser -- tests/journeys/motion.spec.ts` | ❌ Wave 0 |
| DSYS-08 | 320/768/1440 workflows have no hidden actions/page overflow | parameterized E2E | `npm run test:browser -- tests/journeys/viewports.spec.ts` | ❌ Wave 0 |
| DSYS-09 | Canvas graph and semantic list have equal meaning | unit parity + E2E | `npm run test:contracts -- tests/contracts/connections-parity.test.ts` | ❌ Wave 0 |
| DSYS-10 | Tokens→component→workflow trace and deterministic stories | manifest + Storybook | `npm run test:components && npm run test:unit -- tests/unit/component-trace.test.ts` | ❌ Wave 0 |
| QUAL-01 | Lint/types/build/unit/component command set passes | aggregate | `npm run verify:phase1` | ❌ Wave 0 |
| QUAL-02 | Contract/browser matrix is blocking | contract + E2E | `npm run test:contracts && npm run test:browser` | ❌ Wave 0 |
| QUAL-03 | Keyboard/focus/names/live/motion/serious axe pass | component + E2E a11y | `npm run test:components && npm run test:a11y` | ❌ Wave 0 |
| QUAL-04 | Three-viewport visual baselines are unchanged/approved | visual regression | `npm run test:visual` | ❌ Wave 0 |
| QUAL-05 | Source/build/artifacts contain no prohibited data | bounded privacy scan | `npm run test:privacy` | ❌ Wave 0 |
| QUAL-06 | Route/bundle/RAG/interaction stay inside approved budgets | performance + timing | `npm run test:performance && npm run test:contracts -- tests/contracts/rag-latency.test.ts` | ❌ Wave 0 |

### Required `/api/chat` Contract Matrix

At minimum, the contract suite must cover these current branches before `/chat` visual work begins. [VERIFIED: `web/app/api/chat/route.ts`; `web/app/chat/page.tsx`]

| Case | Required Proof |
|---|---|
| Invalid JSON | exact status/body/content-type behavior |
| Missing/empty/non-array user message | status and safe body; no upstream call |
| More than eight messages | only the last eight are considered; last user chosen |
| Question over accepted limit | status/body; no upstream call |
| Missing edge secret | safe 503 JSON; no secret/name value in body |
| Network/timeout failure | safe 503 JSON; provider detail absent |
| Upstream non-OK/malformed/missing answer | safe 503 JSON |
| Grounded success | upstream status; exact public body; encoded `X-Sources`; `X-Model`; `X-Fallback=false`; no-store |
| Ungrounded/abstention success | body/sources retained; `X-Fallback=true`; no fabricated timing |
| Source mapping | exact keys/types, timestamp formatting, URL preservation, header encoding/decoding |
| Client consumption | loading → response; body-reader behavior; citation linkification; sources; safe error/live announcement |
| Security boundary | outbound secret/IP/request-ID headers exist server-side; secret never appears in client bundle/DOM/log/snapshot |

Do not add “improvements” to validation/status/error shapes while establishing the baseline. Any current inconsistency that needs correction requires a separate explicit contract decision and updated fixture. [VERIFIED: D-09]

### Visual Evidence Matrix

Every migrated route needs ready/focus plus applicable loading, empty, error, reduced-motion, and overlay/result states at 320, 768, and 1440. Changed shared components need deterministic stories for their applicable state matrix. [VERIFIED: D-14; Component Inventory]

| Surface | Required Captures |
|---|---|
| `/` | ready, keyboard focus, reduced motion, narrow nav/reflow |
| `/episodes` | ready, rail start/mid/end, drawer loading/timestamped/untimed/unavailable, focus, reduced motion |
| `/connections` | ready canvas+list, selected node, keyboard list use, reduced-motion stable graph, narrow layout |
| `/chat` | empty, query-autosubmit loading, grounded response/sources, abstention, safe error, focus/live state |
| Shared shell/brand | nav focus/active meaning, wordmark, marquee paused/reduced, optional cursor fallback |

Visual baseline files are not self-approving. Store a small approval manifest with snapshot hashes, browser/container identity, baseline commit, and owner approval reference. `verify:phase1` fails when pixels change without a matching approved manifest update. [VERIFIED: D-14/D-16; CITED: Playwright visual comparisons]

### Performance Baseline and Budget Gate

1. Reconcile/confirm the accepted compatibility baseline; never use stale `.next`. [VERIFIED: repository state]
2. Build the accepted legacy variant in production mode. [VERIFIED: D-15]
3. Run Lighthouse CI five times for `/`, `/episodes`, `/connections`, and `/chat` in the pinned CI browser; keep reports on filesystem, not temporary public upload. [CITED: Lighthouse variability and configuration docs]
4. Record per-route browser metrics and resource-summary script/image/font sizes, Next build output, key interaction timings (drawer open/focus, rail control, graph list availability, chat UI update), and controlled `/api/chat` first-byte/total timing. [VERIFIED: QUAL-06]
5. Pause for owner approval of exact numeric budgets in `tests/performance/phase1-budgets.json`; this research intentionally supplies no threshold. [VERIFIED: D-15]
6. Re-run the same measurement on each migrated route and block beyond the approved budget. [VERIFIED: QUAL-06]

The deterministic RAG test should start a local Worker-shaped HTTP stub, use dummy secret values, return grounded/ungrounded/error fixtures, and support controlled delay. The existing `scripts/evaluate_production_rag.mjs` remains a separate owner-approved live smoke; do not make ordinary component commits depend on an external model response. [VERIFIED: existing script and external-service boundary]

### Sampling Rate

- **Per task commit:** relevant targeted Vitest/Storybook/Playwright file plus `npm run lint` and `npm run typecheck`. [VERIFIED: proposed harness]
- **Per route migration wave:** all contract/component tests plus that route’s browser/a11y/visual/performance subset. [VERIFIED: D-12]
- **Per wave merge:** migrated production build, all routes completed so far, privacy scan, and rollback smoke. [VERIFIED: D-12..D-16]
- **Phase gate:** full `cd web && npm run verify:phase1`, owner-approved performance/visual manifests, all protected routes/API together, and documented rollback. [VERIFIED: D-13..D-16]

### Wave 0 Gaps

- [ ] Confirm the accepted dirty-worktree compatibility baseline and record exact source authority without modifying unrelated changes.
- [ ] Run the package legitimacy human checkpoint; install exact dev dependencies and Chromium only after approval.
- [ ] Add `eslint.config.mjs` and direct ESLint 9 script.
- [ ] Add `.storybook/main.ts`, `.storybook/preview.ts`, deterministic fixture decorators, a11y error mode, and a single smoke story before migration.
- [ ] Add `vitest.config.ts` with separate `unit`, `contracts`, and `storybook` projects.
- [ ] Add `playwright.config.ts` with production-like `webServer`, pinned Chromium, three viewport projects/data, trace-on-retry, stable snapshot paths, and external-resource fixtures.
- [ ] Add `tests/support/rag-stub.mjs` and the full `/api/chat` contract matrix.
- [ ] Add route/DTO compatibility manifests and public forbidden-field fixtures.
- [ ] Add `lighthouserc.cjs`, baseline capture script, versioned baseline artifact, and a human checkpoint before numeric budget creation.
- [ ] Add bounded privacy scanner for source, `.next`, Storybook static output, Playwright/Lighthouse reports, snapshots, fixtures, logs, and planning artifacts.
- [ ] Add `scripts/verify-phase1.mjs` and CI workflow invoking only `npm run verify:phase1` from `web`.
- [ ] Verify `storybook-static/`, coverage, reports, traces, Lighthouse output, and temporary servers are ignored while approved screenshots/manifests remain tracked.

## Security Domain

Security enforcement is enabled because `.planning/config.json` does not explicitly disable it. The current OWASP ASVS stable release is 5.0.0; versioned references should be used when exact requirement identifiers are later selected. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| ASVS 5.0 V1 Encoding and Sanitization | yes | Render public/model content as safe text or sanitized markdown; reject unsafe URL schemes. [VERIFIED: COMP-03/04] |
| ASVS 5.0 V2 Validation and Business Logic | yes | Preserve JSON/message/type/length validation at the trusted Route Handler; allowlist episode IDs and public projections. [CITED: https://nextjs.org/docs/app/guides/backend-for-frontend] |
| ASVS 5.0 V3 Web Frontend Security | yes | Keep URL state deterministic, render untrusted content safely, and retain browser security behavior. [VERIFIED: D-02/D-04] |
| ASVS 5.0 V4 API and Web Service | yes | Freeze proxy validation, safe errors, no-store, source mapping, and the server-to-server edge-secret boundary. [VERIFIED: COMP-03] |
| ASVS 5.0 V6 Authentication and V7 Session Management | no | Phase 1 remains anonymous/public and adds no identity or session state; episode query state is navigation state. [VERIFIED: phase boundary] |
| ASVS 5.0 V13 Configuration | yes | Keep the UI variant selector server-only and constrain CI/build configuration to repository-owned inputs. [VERIFIED: D-12/D-13] |
| ASVS 5.0 V14 Data Protection | yes | Scan source, browser bundles, RSC/rendered payloads, fixtures, logs, errors, screenshots, and reports for named prohibited data. [VERIFIED: QUAL-05] |
| ASVS 5.0 V15 Secure Coding and Architecture | yes | Enforce exact package legitimacy, supported dependencies, explicit public field subsets, and fail-closed verification. [VERIFIED: QUAL-01/05] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Operator/private fields leak into public DTO/DOM/RSC/cache | Information Disclosure | Dedicated public allowlists, forbidden-field tests, separate interaction state; never import future operator DTOs into public components. [VERIFIED: COMP-04/05] |
| Edge secret appears in browser bundle/log/snapshot | Information Disclosure | Read only in server Route Handler, fixture dummy values, bundle/artifact scan, never `NEXT_PUBLIC_*`. [VERIFIED: current boundary] |
| Invalid/tampered episode query selects arbitrary data | Tampering | Resolve only against the public episode map; preserve other params; safe unavailable state for unknown ID. [CITED: Next URL-state docs; VERIFIED: public data types] |
| Model markdown or source URL produces unsafe navigation/content | Tampering / XSS | Keep `react-markdown` without raw HTML plugins, preserve its safe URL transform, and allowlist public source URL protocols/domains at the API boundary. [CITED: https://github.com/remarkjs/react-markdown] |
| Provider details or raw payload leak through errors | Information Disclosure | Preserve generic safe 503 response; contract-test every failure; do not log prompt/response bodies. [CITED: Next.js Backend-for-Frontend guide; VERIFIED: AGENTS.md] |
| Oversized/invalid chat request consumes upstream resources | Denial of Service | Preserve bounded last-eight message handling, non-empty last user, current accepted character limit, timeout, and upstream rate limit. [VERIFIED: web/Worker code] |
| Visual/RAG test sends private fixtures to live services | Information Disclosure | Blocking suite uses synthetic local fixtures/stub; live evaluation uses only approved public prompts and explicit invocation. [VERIFIED: QUAL-05; existing production evaluation] |
| Canvas/pointer-only UI excludes keyboard/screen-reader users | Denial of Service (accessibility) | Equivalent semantic list, native controls, focus policy, reduced motion, keyboard journeys. [VERIFIED: DSYS-04/06/07/09] |

## Sources

### Primary (HIGH confidence)

- Repository code and configuration: `web/app`, `web/components`, `web/lib`, `web/package*.json`, `web/tsconfig.json`, `web/tailwind.config.ts`, `cloudflare/src/index.ts`, `cloudflare/wrangler.jsonc` — current implementation and service boundary. [VERIFIED: codebase inspection + CodeGraph]
- Planning/acceptance/design authority: `01-CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `ISA.md`, `DESIGN.md`, `PRODUCT.md`, `APP-FLOW.md`, `COMPONENT-INVENTORY.md` — locked scope, requirements, design, and proof. [VERIFIED: repository docs]
- [Next.js testing guide](https://nextjs.org/docs/app/guides/testing) — test types, tools, and async Server Component guidance.
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) and [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router) — preserved query mutation and Suspense/static behavior.
- [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) — Route Handler validation, proxying, and safe errors.
- [Storybook Next/Vite](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite) — recommended framework and Next support.
- [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) — browser component execution and Next/Vite requirement.
- [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing) — a11y error mode and Vitest integration.
- [Vitest Browser Mode](https://vitest.dev/guide/browser/) — Playwright provider, projects, and Chromium execution.
- [Playwright webServer](https://playwright.dev/docs/test-webserver), [visual comparisons](https://playwright.dev/docs/test-snapshots), and [accessibility](https://playwright.dev/docs/accessibility-testing) — route lifecycle, screenshots, and axe.
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) and [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) — controlled modal behavior and focus/keyboard contracts.
- [WAI Dialog APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [Carousel APG](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) — focus restoration, modal keyboard behavior, and carousel controls.
- [WCAG 2.2 techniques](https://www.w3.org/WAI/WCAG22/Techniques/) and [Reflow understanding](https://www.w3.org/WAI/WCAG22/Understanding/reflow) — reduced motion, focus, target sizing, and 320 CSS-pixel reflow.
- [Lighthouse CI configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) and [Lighthouse variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) — repeated runs and asserted budgets.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — current stable standard and versioned reference guidance.
- [react-markdown](https://github.com/remarkjs/react-markdown) — safe-by-default markdown rendering and security boundary.
- npm registry metadata and npm downloads API queried 2026-08-19 — exact versions, publish dates, peers, engines, repositories, postinstall metadata, and weekly download counts. [VERIFIED: npm registry; package legitimacy remains ASSUMED without slopcheck]

### Secondary (MEDIUM confidence)

- None. All external technical recommendations above were checked against official project or standards documentation. [VERIFIED: source review]

### Tertiary (LOW confidence)

- None. Unverified package legitimacy and implementation assumptions are isolated in the Package Legitimacy Audit and Assumptions Log. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**

- Standard stack: **MEDIUM** — official docs and npm peer metadata align with the locked stack, but new packages were not installed and slopcheck was unavailable. [VERIFIED: source/audit record]
- Architecture: **HIGH** — based on locked decisions, current source, CodeGraph, and official App Router/interaction documentation. [VERIFIED: repository + primary docs]
- Compatibility contract: **HIGH for enumerated current code paths; MEDIUM for baseline authority/stream cadence** — dirty working-tree acceptance and exact streaming meaning still need owner confirmation. [VERIFIED: git diff; Open Questions]
- Validation architecture: **HIGH in test responsibility; MEDIUM in exact package bootstrap** — no test infrastructure exists yet and current Storybook/Vitest patches are newly published. [VERIFIED: repository/package audit]
- Pitfalls/security: **HIGH** — directly evidenced in current code and mapped to WAI/Next/OWASP primary guidance. [VERIFIED: source review]

**Research date:** 2026-08-19
**Valid until:** 2026-08-26 for package versions; repository architectural findings remain valid until protected files or Phase 1 context changes. [ASSUMED]
