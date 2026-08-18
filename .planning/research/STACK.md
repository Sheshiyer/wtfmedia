# Technology Stack Research: One Brain Re-foundation

**Project:** WTF Media
**Milestone:** v1.0 One Brain Re-foundation
**Researched:** 2026-08-18
**Scope:** Additions and changes needed for the authenticated operator shell, provenance spine, repository-owned component system, dense workspaces, read-only adapters, and safe migration
**Overall confidence:** HIGH for the existing baseline and UI/test recommendations; MEDIUM for authentication and database package choices because the organization identity provider, database provider, deployment Node major, and data residency requirements are not recorded in the repository.

## Executive Recommendation

Keep the shipping platform boundary intact: Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind 3, Vercel for the browser/server boundary, and the existing Cloudflare edge RAG path. The milestone does not require a framework rewrite, a Tailwind major upgrade, a new retrieval stack, or a separate backend service. Next.js route groups can separate public and operator layouts without changing URLs, and Server Components plus a server-only data access layer are sufficient for the first internal operating-system release. This directly preserves the compatibility constraints in `.planning/PROJECT.md`, `DESIGN.md` sections 5, 13, and 17, and `ISA.md` ISC-13–24 and ISC-111–118. [Next.js 15 route groups](https://nextjs.org/docs/15/app/api-reference/file-conventions/route-groups) do not contribute a URL segment, and [Next.js 15 data-security guidance](https://nextjs.org/docs/15/app/guides/data-security) recommends a server-only DAL that performs authorization and returns minimal DTOs.

Add capabilities in four bounded layers:

1. **Identity and authorization:** use an established authentication library, an organization-owned OAuth/OIDC provider, optimistic protection at `/ops`, and authoritative checks in a server-only DAL. Default to stable `next-auth@4.24.15` only if no existing identity vendor is mandated; do not adopt the `5.0.0-beta` line or build password authentication in this repository. This is required by `.planning/PROJECT.md` Active requirements, `DESIGN.md` section 5, and ISC-21–22, 64, 108, and 123–125. Next.js explicitly recommends an auth library and requires authorization at data/action boundaries, not only at routing middleware. [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
2. **Durable provenance and operations:** introduce managed PostgreSQL, repository-owned SQL migrations, Drizzle ORM, and Zod boundary schemas. Keep the current file-backed public catalogue and Cloudflare retrieval projection live until a shadow-read/parity phase proves a replacement. PostgreSQL provider selection and provisioning remain separate owner-approved infrastructure work. This is required by the canonical IDs, referential integrity, dual timelines, ownership, reporting windows, adapter health, and idempotency acceptance criteria in ISC-71–110. [Drizzle PostgreSQL guide](https://orm.drizzle.team/docs/get-started/postgresql)
3. **Accessible repository-owned UI:** add current stable Radix Primitives beneath WTF wrappers, Phosphor React icons at one chosen weight, and TanStack Table only as a headless state engine. Plain CSS custom properties and Tailwind aliases remain the token implementation; no visual kit owns WTF styling. This follows `DESIGN.md` sections 7, 11–13 and ISC-25–58. Radix is explicitly unstyled, accessible, and incrementally adoptable. [Radix introduction](https://www.radix-ui.com/primitives/docs/overview/introduction), [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
4. **A test pyramid that matches acceptance:** use Storybook Next/Vite plus its Vitest and accessibility addons for component states, Vitest for domain/schema tests, and Playwright plus axe for route contracts, keyboard behavior, authenticated journeys, responsive viewports, reduced motion, and deterministic screenshots. Add Lighthouse CI only when a measured LCP budget exists. This is required by ISC-24, 33–58, 69–70, and 111–118. [Storybook Vitest integration](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index), [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing), [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

Install nothing as one bulk “foundation” change. Each package enters in the phase that proves one real workflow and owns its compatibility tests. In particular, authentication and PostgreSQL are architectural requirements, but provider accounts, credentials, and production resources are not authorized by this research artifact.

## Current Baseline

| Area | Confirmed repository state | Decision |
|---|---|---|
| Application | `web/package-lock.json` resolves Next.js `15.5.19`, React/React DOM `19.0.0`, and TypeScript `5.7.3`; `web/tsconfig.json` has `strict: true` and App Router aliases. | Retain for this milestone. Do not combine the product re-foundation with Next 16, React 19.2, or TypeScript 7 migration. |
| Styling | Tailwind `3.4.17`, PostCSS `8.5.1`, Autoprefixer `10.4.20`; colors, fonts, motion, and global component classes currently live in `web/tailwind.config.ts` and `web/app/globals.css`. | Retain Tailwind 3. Move values incrementally to semantic CSS custom properties and Tailwind aliases; do not introduce a token compiler yet. |
| Rendering boundary | `web/app/layout.tsx` is the single public-oriented shell. Interactive catalogue/chat components are client components, while route files can remain Server Components. | Split source into `(public)` and `(ops)` route groups under one top-level layout. Keep Server Components as the default and push `use client` to interaction leaves. [Next.js client boundary](https://nextjs.org/docs/app/api-reference/directives/use-client) |
| Public data | `web/lib/episodes.ts` and `web/lib/connections.ts` import committed JSON projections; transcripts are served from public assets and loaded by `EpisodesBrowser`. | Preserve as the public compatibility projection during migration. Introduce a repository interface before changing its backing store. |
| Retrieval | `web/app/api/chat/route.ts` is a Node route that forwards server-to-server to the existing Cloudflare Worker, keeps the shared secret server-side, and returns the established answer/source headers. `cloudflare/` owns Workers AI, Vectorize, R2, KV, and queue ingestion. | Freeze the `/api/chat` browser contract and Cloudflare architecture. Extend scope through explicit request fields only after contract tests; do not move internal operational records into the RAG worker. |
| Authentication | No auth dependency, auth route, middleware, operator session, or authorization DAL is present. | Required addition before any `/ops` data is exposed. |
| Operational persistence | No relational database, ORM, migration tool, durable workflow store, or audit-event store is present in `web`. | Required addition for the provenance and operations spine; static JSON is not an operational source of truth. |
| Components | Nine bespoke reusable components exist, but no `components/ui`, semantic-token layer, or isolated story surface exists. | Add WTF-owned layers and migrate consumers; never replace the brand layer wholesale. |
| Tests | `web/package.json` exposes only `dev`, `build`, and `start`. No repository-owned unit, component, browser, axe, visual, or performance test runner is configured. | Required addition before route reorganization or component replacement. |
| Linting | `eslint-config-next@15.5.19` is in production dependencies, but `eslint` and a lint script are absent. | Add ESLint 9 as a dev dependency, move the config package to dev dependencies, and add a deterministic lint command. `eslint-config-next@15.5.19` declares compatibility through ESLint 9, not ESLint 10. [Package registry](https://www.npmjs.com/package/eslint-config-next/v/15.5.19) |
| Node runtime | Node types are pinned to 22, but the repository has no `engines` field or checked-in runtime-version declaration. The production runtime major is not evidenced. | Before Storybook/Playwright CI, explicitly align local, CI, and Vercel on one supported major. Prefer Node 22 to match the existing type baseline unless deployment evidence selects another supported major. Storybook 10 and Playwright require Node 20 or newer. |

## Required Additions

Versions below are the verified stable registry versions on 2026-08-18 or a deliberately pinned prior major where official documentation is not yet coherent. Use exact versions in the first adoption change, refresh the lockfile only in that owned phase, and rerun the public compatibility suite before widening ranges.

### Runtime and Data Dependencies

| Dependency/capability | Recommended version or gate | Purpose and rationale | Repository seam and proof |
|---|---|---|---|
| `server-only` | `0.0.1` | Marks authorization, database, and adapter modules as server-only so accidental imports into a client graph fail at build time. Next.js 15 specifically recommends this boundary for the DAL. [Next.js data security](https://nextjs.org/docs/15/app/guides/data-security) | Import first in `web/lib/auth/*`, `web/lib/db/*`, and `web/lib/adapters/*`. Prove that a deliberate client import fails and that built browser chunks contain no credentials (ISC-120). |
| Authentication library | **Gate first.** Default: stable `next-auth@4.24.15`, whose published peer range includes Next 15 and React 19. Do not select `5.0.0-beta.*`. | Supplies OAuth/OIDC session handling instead of locally authored password and cookie cryptography. Provider choice must follow the team’s existing identity authority and allowlist policy. Next.js recommends a library and distinguishes authentication, session management, and authorization. [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [next-auth 4.24.15 registry](https://www.npmjs.com/package/next-auth/v/4.24.15) | Add the auth route and config inside `web`; protect `/ops` optimistically in `web/middleware.ts` because this is Next 15, then re-check session and role in every DAL query, route handler, and Server Action. Preserve all public routes and `/api/chat` as anonymous unless an approved requirement changes them. |
| Managed PostgreSQL | Provider-supported maintained major; exact provider/major is an owner decision. | Relational constraints and transactions match stable episode IDs, source assets, transcript/timestamp maps, people/roles, workflow ownership, reporting windows, integration runs, and append-only activity. Do not store binary media or credentials in it. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | New `web/lib/db` schema/repository layer and checked-in migrations. Public catalogue imports remain untouched until parity. Provisioning, region, backup, retention, and residency are explicitly outside this report and remain unknown. |
| `drizzle-orm` + PostgreSQL driver | `drizzle-orm@0.45.2`; `pg@8.23.0` and `@types/pg@8.23.1` after the managed provider confirms pooled Node connections. | Keeps schema and SQL migrations repository-owned with a small runtime layer. Drizzle officially supports both node-postgres and postgres.js; node-postgres is the safer default while the hosting pool mode is unknown. [Drizzle PostgreSQL guide](https://orm.drizzle.team/docs/get-started/postgresql) | `web/lib/db/schema/*`, `web/lib/db/client.ts`, and server-only repositories. Driver selection must be rechecked against the selected provider’s pooling/transaction mode. Do not call `drizzle-kit push` against shared or production environments; generate reviewed SQL migrations. |
| `zod` | `4.4.3` | Runtime validation is required because TypeScript does not validate adapter payloads, route input, committed reconciliation inputs, or environment presence. Zod 4 is stable and the repository already meets its strict-TypeScript requirement. [Zod 4](https://zod.dev/packages/zod) | Place canonical schemas in a server-safe domain package and parse at ingest, adapter, auth-claim, query-string, and API response boundaries. Return explicit unavailable/error states rather than coercing missing metrics to zero (ISC-97–110). |
| `radix-ui` | `1.6.7`; import only the stable primitive subpaths actually used by the current vertical slice. | Current Radix recommends the unified tree-shakeable package to avoid per-primitive version conflicts, while still supporting per-primitive subpath imports. Its peer range includes React 19, and recent releases explicitly fix React 19/19.2 focus, ref, and overlay issues. [Radix introduction](https://www.radix-ui.com/primitives/docs/overview/introduction), [Radix releases](https://www.radix-ui.com/primitives/docs/overview/releases) | Wrap stable Dialog, DropdownMenu, Popover, Select, Tabs, Tooltip, Checkbox, RadioGroup, and Switch behavior under `web/components/ui`. Build Drawer on Dialog’s modal contract. Use native inputs/buttons/links where the platform already supplies correct semantics. Never import Radix styling or expose it as the public component API. |
| `@phosphor-icons/react` | `2.1.10` | Provides the one normalized interface icon family required by `DESIGN.md`; repository brand glyphs remain custom. Package peer ranges include React 19 and support tree shaking. [Official React package](https://github.com/phosphor-icons/react) | Add icons only inside WTF wrappers, use one approved weight, accessible names on icon-only controls, and specific icon imports if build measurement shows barrel-import cost. Do not replace `Wordmark` or `Sparkle`. |
| TanStack Table | **Pin `@tanstack/react-table@8.21.3` for the first table spike.** Re-evaluate v9 after official React docs and migration guidance consistently describe its API. | TanStack remains the correct headless engine for sorting, filtering, selection, pagination, and controlled state while WTF owns semantic markup and styles. On the research date, npm `latest` is 9.1.2, but official pages still mix `useReactTable`/v8 stable guidance with the newer v9 `useTable` API. Choosing v8.21.3 avoids importing a documentation transition into the first operator workflow. [TanStack headless model](https://tanstack.com/table/latest), [v8 overview](https://tanstack.com/table/v8/docs/overview) | Introduce only with the first Episodes/Production inventory table. Keep filters, sort, pagination, and shareable scope in URL state. Render a semantic `<table>` or explicit small-screen alternate; the library does not supply accessibility or markup. Record the v9 decision as a phase research flag. |

### Development and Verification Dependencies

| Dependency | Recommended version or gate | Responsibility | Why it is required |
|---|---|---|---|
| `eslint` | `9.39.5` with existing `eslint-config-next@15.5.19` moved to dev dependencies | Static checks and a deterministic `lint` script | The config is present but unusable as a direct project check without ESLint. ESLint 10 is outside the current config peer range. |
| `storybook`, `@storybook/nextjs-vite` | Matched exact `10.5.9` versions | Repository-owned component documentation, fixture states, and interaction harness | The framework’s published peers include Next 15 and React 19. Keep Server Component pages out of primitive stories; use serializable fixtures and leaf Client Components, matching `DESIGN.md` sections 11 and 17. [Storybook Next.js framework](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite) |
| `@storybook/addon-a11y`, `@storybook/addon-vitest` | Matched exact `10.5.9` versions | Automated axe checks and executable story interactions | Storybook documents the a11y/Vitest integration as the supported test path; the Vitest addon supports Next.js 14.1+ only through `@storybook/nextjs-vite`, which the baseline satisfies. [Vitest addon requirements](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index), [a11y testing](https://storybook.js.org/docs/writing-tests/accessibility-testing) |
| `vitest`, `@vitest/browser-playwright` | Matched exact `4.1.10` versions | Fast domain/schema tests plus real-browser execution of stories | Storybook 10.5.9 declares Vitest 3 or 4 peers and browser-playwright 4. Use a separate `storybook` Vitest project so domain tests and browser component tests remain independently diagnosable. |
| `@playwright/test` | `1.62.1` | Route/API continuity, authentication/authorization journeys, keyboard, focus, viewports, reduced motion, and visual regression | One tool covers browser projects, web-server startup, request assertions, and deterministic screenshots. It requires Node 20+, which drives the runtime-version gate. [Playwright Test](https://playwright.dev/docs/intro), [visual comparisons](https://playwright.dev/docs/test-snapshots) |
| `@axe-core/playwright` | `4.13.0` | Full-page axe analysis for core authenticated and anonymous routes | Story-level axe is necessary but cannot prove composed page behavior. The official Deque package injects and analyzes pages through Playwright. [Deque Playwright package](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) |
| `drizzle-kit` | `0.31.10` | Generate and apply reviewed SQL migrations | Migration files are part of the repository’s provenance and rollback evidence. Use `generate` and `migrate`; prohibit unreviewed schema push in shared environments. [Drizzle migrations](https://orm.drizzle.team/docs/get-started/postgresql-existing) |

## Optional, Evidence-Gated Additions

These are not milestone-foundation dependencies. Add them only when the owning phase records the triggering measurement or requirement.

| Optional dependency/capability | Add only when | Current recommendation |
|---|---|---|
| `@tanstack/react-virtual` | A production-shaped table or transcript has enough mounted rows to miss the approved interaction/render budget. | Start with server pagination and ordinary semantic markup. Virtualization complicates focus, screen-reader position, sticky headers, and screenshots; do not pre-install it. TanStack itself positions Virtual as a separate concern paired only when rendering volume demands it. [TanStack Table](https://tanstack.com/table/latest) |
| `@lhci/cli@0.15.1` | The performance phase defines URLs, a stable CI browser image, an LCP budget, and fixture/auth strategy for internal routes. | Required eventually for ISC-117, but not part of the component foundation. Run multiple samples in stable CI and assert a measured budget rather than treating one score as truth. [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci), [Lighthouse variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) |
| `msw` | Stories or browser tests must simulate an HTTP boundary that cannot be represented by serializable repository fixtures. | Prefer direct fixtures and adapter fakes first. If added, use MSW 2+ because Storybook’s Vitest integration documents that compatibility floor. |
| Auth.js database adapter | Revocation, cross-device session inventory, or organization policy requires database sessions rather than signed stateless sessions. | Do not add with the first OAuth/OIDC slice. Keep local operator/role records in PostgreSQL either way. |
| PostgreSQL row-level security | The chosen provider and threat model require database-enforced tenant/role isolation in addition to the DAL. | The first milestone still needs authoritative DAL authorization. RLS is defense in depth, not a substitute for minimal DTOs and action checks. |
| Chart library | Real analytics sources, chart types, keyboard/alternate-table behavior, and bundle budgets are approved. | Start with semantic values, tables, and small repository-owned SVG/CSS visuals. No current requirement justifies Recharts, Visx, or ECharts. |
| Command-palette package | The Control Room search spike proves that native input/listbox plus Radix Dialog is insufficient for grouped, async, scoped results. | Do not add `cmdk` by default. The command palette is a product pattern and should remain a WTF-owned component contract. |
| Form library | A real operational form demonstrates repeated nested arrays, cross-field validation, or unacceptable rerender/boilerplate cost. | Use native forms, React 19/Next Server Actions, and Zod at the server boundary first. Re-authorize and re-validate every Server Action because it is a public endpoint boundary. [Next.js data security](https://nextjs.org/docs/15/app/guides/data-security) |
| Background-job system | Read-only sync volume, duration, retries, or rate limits exceed bounded scheduled Node execution. | Define the adapter/run contract first. Do not reuse the existing RAG ingestion queue for unrelated operational sync, and do not provision another queue from this milestone research. |

## Explicitly Do Not Add

| Avoid | Reason and replacement |
|---|---|
| Next.js 16, React 19.2, Tailwind 4, or TypeScript 7 as part of this milestone | Major upgrades expand the migration surface without satisfying a One Brain criterion. Keep the existing locked baseline; handle security/maintenance patches in separate changes protected by the public route/API suite. |
| shadcn/ui, Radix Themes, MUI, Chakra, Ant Design, or another pre-styled kit | `DESIGN.md` and ISC-127 require repository-owned WTF visual authorship and prohibit a competing palette/generic kit layer. Use unstyled Radix behavior beneath WTF components. |
| A commercial/monolithic data grid | It would own markup, interaction, and styling where the design authority requires semantic tables, deliberate mobile alternatives, and WTF state presentation. Use headless TanStack state plus repository markup. |
| Redux, Zustand, MobX, or a global client store | The first operator shell can keep server truth in PostgreSQL/DAL, shareable table state in URL parameters, and ephemeral interaction state locally. Add global state only after a demonstrated cross-route client-state requirement. |
| TanStack Query/SWR for all data | App Router Server Components already provide server data loading; blanket client fetching would enlarge the client graph and create two cache authorities. Use it only if a future live-refresh interaction proves a client cache is necessary. |
| tRPC, GraphQL, a BFF service, or microservices | The repository has one Next application and a protected RAG Worker. A server-only DAL and thin route handlers are enough; additional transport layers do not create provenance or permission safety. |
| Prisma alongside Drizzle | One schema/migration authority is essential. Adding two ORMs creates divergent migrations and types. |
| SQLite/D1/KV as the operational source of truth | The internal domain needs relational constraints and cross-entity transactions. Existing Cloudflare KV/R2/Vectorize remain retrieval infrastructure, not the episode/workflow database. |
| A second vector database or RAG framework | Existing Cloudflare retrieval is validated and protected. The milestone extends provenance and operator scope; it does not require replacing the retrieval engine. |
| A token build pipeline, Sass, CSS-in-JS, or runtime theme library | `DESIGN.md` already specifies plain CSS custom properties, contextual theme maps, and Tailwind aliases. Add a compiler only if a future multi-platform consumer exists. |
| `class-variance-authority`, `tailwind-merge`, or a utility grab-bag by default | The initial primitives can use typed variant maps and a small repository-owned class helper. Add a library only when real composition collisions or variant scale justify it. |
| A full icon, illustration, or motion replacement | Phosphor is for interface icons only. Existing wordmark, sparkle, print texture, cursor policy, and public motion remain authored brand components. |
| Integration SDKs during the adapter-contract phase | Begin with server-side `fetch`, Zod response schemas, pagination/retry fixtures, and read-only interfaces. Add a vendor SDK only when required for supported OAuth, webhook verification, pagination, or a capability not safely reproduced. |
| Autonomous write scopes, workflow automation, outbound messaging, payment, e-signature, or credential storage packages | Explicitly out of scope in `.planning/PROJECT.md` and `ISA.md`. Read-only adapters must reject write operations and surface permission/health state. |
| SaaS visual-regression hosting in the first test phase | Playwright screenshots in a pinned CI environment meet the initial need without external project/account state. A hosted reviewer can be evaluated later if baseline review throughput becomes a bottleneck. |

## Integration Map

```text
anonymous browser
  -> Next.js (public) route group
       -> public projection repository
            -> existing committed catalogue/transcript projection
       -> /api/chat (unchanged contract)
            -> existing Cloudflare edge RAG (unchanged)

authenticated operator browser
  -> Next.js (ops) /ops route group
       -> optimistic session gate
       -> Server Component / Route Handler / Server Action
            -> server-only authorization + DTO layer
                 -> PostgreSQL repositories (canonical operations/provenance)
                 -> read-only external adapters (validated with Zod)
                 -> existing evidence/RAG adapter where knowledge scope needs it

repository-owned UI
  -> WTF tokens and brand components
  -> WTF ui wrappers over stable Radix behavior
  -> WTF patterns over TanStack table state
  -> WTF domain components

proof
  -> Vitest domain/schema tests
  -> Storybook stories + Vitest + axe
  -> Playwright public contracts + operator journeys + screenshots + axe
  -> Lighthouse CI after budget definition
```

### File and Boundary Seams

| Seam | Implementation direction | Compatibility guard |
|---|---|---|
| `web/app/layout.tsx` | Keep the top-level document boundary; move public chrome to `(public)` layout and add an authenticated `(ops)/ops` layout. Avoid multiple root layouts unless full-page navigation between them is intentionally accepted; Next.js 15 warns that navigation between different root layouts causes a full page load. [Route-group caveats](https://nextjs.org/docs/15/app/api-reference/file-conventions/route-groups) | Route tests assert `/`, `/episodes`, `/connections`, and `/chat` retain URLs, metadata essentials, query/deep-link behavior, and anonymous access. |
| `web/app/api/chat/route.ts` | Leave as the Vercel-to-Cloudflare trust boundary. If scoped operator knowledge is later added, create a separate authorized handler or a backward-compatible optional request field with an explicit response-contract version. | HTTP contract tests assert status codes, content type, source header schema, cache header, timeout-safe 503, and absence of the edge secret. |
| `web/lib/episodes.ts`, `connections.ts` | Put existing loaders behind public repository interfaces; add PostgreSQL-backed operator repositories separately. A later adapter may generate the same public DTO from PostgreSQL only after parity. | Golden fixture tests compare IDs, route params, transcript availability, connection projection, and source fields before switching reads. |
| `web/components/*` | Keep current brand/domain behavior while extracting `brand`, `ui`, `patterns`, `domain`, and `shells` layers from `DESIGN.md`. A component moves only with a story, keyboard/a11y checks, and a migrated consumer. | Visual snapshots and route journeys prevent generic restyling, focus loss, pointer-only interaction, and reduced-motion regressions. |
| `web/styles/*` + `web/tailwind.config.ts` | Define semantic custom properties once, map Tailwind names to them, and keep raw brand values confined to the token layer. Orange remains provisional until contrast and design approval. | Token schema, contrast, computed-style, and “no second palette” checks satisfy ISC-25–40 and 127. |
| `web/lib/db/*` + migration directory | Keep schema, repositories, transaction boundaries, and migrations server-only. Model canonical IDs and source references explicitly; use JSONB only for bounded source snapshots that do not contain credentials or prohibited raw material. | Schema, referential-integrity, idempotency, migration-up/down rehearsal, and secret scans prove ISC-71–82 and 97–110. |
| `web/lib/adapters/*` | One read-only interface per external system: fetch, validate, normalize, record source window/health, and return explicit unavailable/error. No adapter writes during its first production phase. | Contract fixtures prove write rejection, retries, permission mode, provenance, stale state, and sanitized error output. |
| `.storybook/*`, `web/stories/fixtures/*` | Stories consume synthetic, representative, non-private fixtures. Server pages are tested through Playwright, not coerced into primitive stories. | Privacy scan rejects raw meeting text, embedded private links, credentials, and native identifiers. |
| `web/tests/*` | Separate `domain`, `accessibility`, `contracts`, `journeys`, and `visual` suites. Use saved authenticated test state generated from local/test-only identity fixtures, never real sessions. | CI scripts run build, lint, schema/unit, Storybook browser, and Playwright contract suites independently so failures remain attributable. |

## Recommended Dependency Manifest Shape

This is a planning target, not an installation command. Exact additions happen per owning phase.

### Production dependencies, phased

```text
# authorization phase, after identity-provider gate
next-auth@4.24.15
server-only@0.0.1

# provenance phase, after managed-Postgres/provider gate
drizzle-orm@0.45.2
pg@8.23.0
zod@4.4.3

# first accessible primitive vertical
radix-ui@1.6.7
@phosphor-icons/react@2.1.10

# first dense inventory table; deliberate v8 hold
@tanstack/react-table@8.21.3
```

### Development dependencies, phased

```text
eslint@9.39.5
@types/pg@8.23.1
drizzle-kit@0.31.10

storybook@10.5.9
@storybook/nextjs-vite@10.5.9
@storybook/addon-a11y@10.5.9
@storybook/addon-vitest@10.5.9
vitest@4.1.10
@vitest/browser-playwright@4.1.10

@playwright/test@1.62.1
@axe-core/playwright@4.13.0

# later, only after an LCP budget exists
@lhci/cli@0.15.1
```

Do not run an unconstrained `npm install` against the current caret ranges while also adding these packages. The first change should record the resolved baseline, align the Node major, and make any transitive Next/React movement visible in review.

## Migration and Testing Implications

### Phase-entry gates

1. **Before package changes:** capture the current `package-lock.json` resolutions, add public route/API contract tests, and record the CI/deployment Node major. Existing public functionality is the migration oracle.
2. **Before operator routes:** choose the organization identity provider, approved email/domain or group mapping, session lifetime, role vocabulary, logout/revocation requirement, and test-identity strategy. Route middleware is only an optimistic filter; DAL checks are mandatory.
3. **Before PostgreSQL:** approve provider, region/residency, pooling mode, backups/PITR, migration role, application role, connection-secret ownership, and non-production database strategy. These are currently unknown and cannot be inferred from the repository.
4. **Before Radix adoption:** install the current stable package in the phase branch, verify React 19 behavior for Dialog/Drawer, Select, Tabs, Tooltip, and nested overlays, then migrate one workflow. Recent Radix releases contain React 19-specific fixes, so a stale pin is not acceptable. [Radix releases](https://www.radix-ui.com/primitives/docs/overview/releases)
5. **Before TanStack adoption:** run the Episodes table spike on v8.21.3; test semantic headers, keyboard sort controls, URL-backed state, small-screen alternate, empty/error states, and 55/62-record shapes. Revisit v9 only when its official React/migration documentation is internally consistent.
6. **Before Storybook 10:** align Node 20+ in local/CI/deploy, configure Next/Vite once, and keep all Storybook packages on the exact same release. Do not add Webpack configuration unless an evidenced feature requires it.

### Minimum scripts the web package should eventually expose

```text
lint                 ESLint 9 with Next configuration
typecheck            TypeScript --noEmit
test:domain          Vitest node project
storybook            isolated component workshop
test:storybook       Vitest Storybook browser project
test:e2e             Playwright journeys/contracts
test:a11y            Playwright + axe core routes
test:visual          Playwright screenshot project
test:performance     Lighthouse CI, added only with budget
db:generate          generate reviewed SQL migrations
db:migrate           apply committed migrations in an authorized environment
```

### Required migration proof

- The `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat` contracts pass before and after each route-group or repository change.
- Anonymous requests cannot enumerate operator routes or their data; redirects alone are not proof. Direct DAL/route/action authorization tests must return 401/403 without leaking existence or payloads.
- Every component story covers ready, loading, empty, partial, error, permission-denied, offline/stale where relevant, focus-visible, disabled, and reduced-motion behavior.
- Storybook axe failures and Playwright serious axe findings are blocking, but manual keyboard, screen-reader spot checks, focus order, and color/meaning review remain required because automated axe does not prove total accessibility.
- Visual baselines run in one pinned OS/browser/font environment. Playwright warns that host and rendering differences change screenshots; do not accept broad thresholds that conceal brand drift. [Playwright screenshots](https://playwright.dev/docs/test-snapshots)
- Database migrations are tested against a disposable PostgreSQL instance from empty-to-head and previous-to-head. Production schema changes are not generated at deploy time.
- Adapter tests use recorded, redacted, synthetic fixtures shaped like provider responses. No private links, raw meeting/transcript text, secrets, or real user/session identifiers enter stories, snapshots, logs, or committed fixtures.
- Public catalogue switching uses dual reads or offline parity reports first; no flag points production users to the new repository until stable IDs, transcript timing honesty, source fields, and connection projections match.

## Risks and Unknowns

| Risk/unknown | Impact | Mitigation / roadmap flag |
|---|---|---|
| Organization identity provider and group source are unknown. | Auth package/provider choice, role claims, MFA, revocation, and test strategy cannot be finalized. | Authentication phase must begin with identity discovery. Default to stable next-auth v4 only if it integrates with the approved provider; do not create local passwords. **Confidence: MEDIUM.** |
| PostgreSQL provider, residency, backup, pooling, and deployment topology are unknown. | Driver behavior, connection limits, migrations, recovery, and privacy controls remain unproved. | Separate architecture/infrastructure approval before provisioning. Keep `pg` as the planning default, recheck against provider docs. **Confidence: MEDIUM.** |
| Node deployment major is not recorded. | Storybook 10, Vitest 4, and Playwright require Node 20+, and local-only success could differ from CI/Vercel. | Pin one supported major before test-tool installation; Node 22 is the evidence-aligned default. **Confidence: HIGH that a pin is needed; LOW on the actual deployed major.** |
| TanStack Table official surfaces are transitioning between v8 and v9 APIs. | Choosing v9 from the npm dist-tag alone risks unstable or incomplete documentation during the first dense-workspace build. | Pin v8.21.3 for the first slice and create a phase research flag for v9. **Confidence: MEDIUM.** |
| Auth.js current documentation emphasizes v5-style APIs while npm stable remains v4 and v5 is beta. | Copying current examples into a stable-v4 install can produce incorrect middleware/config structure. | Pin stable v4 and use versioned v4 docs/API; or select another organization-approved stable library. Never mix major-version examples. **Confidence: HIGH.** |
| Storybook cannot faithfully execute every Next Server Component/page concern in primitive stories. | False confidence if authenticated pages are mocked only as client stories. | Stories prove components/patterns; Playwright proves real server routes, auth, metadata, loading/error boundaries, and navigation. **Confidence: HIGH.** |
| PostgreSQL could become a premature replacement for the validated public corpus. | A big-bang cutover could break catalogue and retrieval behavior. | Treat PostgreSQL as the canonical internal operations store first; public reads remain existing projections until parity gates pass. **Confidence: HIGH.** |
| Read-only adapters may still expose sensitive source payloads through logs/errors. | Privacy breach despite no write permission. | Zod allowlisted DTOs, sanitized structured errors, server-only modules, minimal persisted snapshots, fixture privacy scans, and no response-body logging. **Confidence: HIGH.** |
| Automated accessibility/visual tooling may be treated as complete proof. | Keyboard, semantics, focus continuity, readable density, and brand authorship can still regress. | Keep manual acceptance probes and moderated first-click testing from ISC-128 alongside automated gates. **Confidence: HIGH.** |

## Source Ledger

### Repository evidence

| Source | Evidence used |
|---|---|
| `.planning/PROJECT.md` | Milestone scope, active requirements, compatibility, privacy, architecture, and read-only integration constraints. |
| `DESIGN.md` | Brand/token authority, route split, component foundation, component layers, current-to-target migration map, Server/Client boundary, build order, and anti-patterns. |
| `ISA.md` | Acceptance requirements and test gates, especially ISC-13–24, 25–58, 71–118, and 119–127. |
| `PRODUCT.md` | Shipping palette, fonts, wordmark, tone, tactile motion, and anti-generic authorship. |
| `web/package.json` and `web/package-lock.json` | Current dependency surface and exact locked Next/React/Tailwind/TypeScript versions; absence of test/lint/auth/data dependencies. |
| `web/tsconfig.json` | Strict TypeScript, bundler module resolution, App Router plugin, and alias configuration. |
| `web/tailwind.config.ts`, `web/app/globals.css` | Current raw tokens, fonts, motion, and global styling seam. |
| `web/app/layout.tsx` | Single-shell navigation, global public cursor, current metadata/chrome, and route-group migration seam. |
| `web/app/api/chat/route.ts` | Existing server-only Cloudflare secret boundary and `/api/chat` response contract. |
| `web/lib/episodes.ts`, `web/lib/connections.ts`, `web/components/EpisodesBrowser.tsx` | Current committed public projections and transcript-loading behavior. |
| `cloudflare/package.json`, `cloudflare/wrangler.jsonc`, `cloudflare/src/index.ts` | Existing edge RAG, storage/binding, queue, observability, secret, and authorization boundaries that this milestone preserves. |

### Primary external sources

| Source | Finding | Confidence |
|---|---|---|
| [Next.js 15 route groups](https://nextjs.org/docs/15/app/api-reference/file-conventions/route-groups) | Groups do not affect URL paths; multiple root layouts can cause full-page reloads. | HIGH |
| [Next.js 15 data security](https://nextjs.org/docs/15/app/guides/data-security) | Use one server-only DAL, authorize data access, return minimal DTOs, validate inputs, and treat actions as public endpoints. | HIGH |
| [Next.js authentication](https://nextjs.org/docs/app/guides/authentication) | Prefer an authentication library; distinguish optimistic route checks from secure authorization. | HIGH |
| [Next.js client boundary](https://nextjs.org/docs/app/api-reference/directives/use-client) | Keep `use client` at interactive entry points and pass serializable props across the boundary. | HIGH |
| [Radix introduction](https://www.radix-ui.com/primitives/docs/overview/introduction), [accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility), and [releases](https://www.radix-ui.com/primitives/docs/overview/releases) | Unstyled accessible primitives, incremental/tree-shakeable adoption, and current React 19 fixes. | HIGH |
| [TanStack Table](https://tanstack.com/table/latest) and [v8 overview](https://tanstack.com/table/v8/docs/overview) | Headless state model; application owns markup/styles. Documentation transition makes the v9 adoption gate prudent. | MEDIUM |
| [Storybook Next/Vite](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite), [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index), and [a11y testing](https://storybook.js.org/docs/writing-tests/accessibility-testing) | Supported Next/Vite story harness, real-browser Vitest integration, and axe-based story checks. | HIGH |
| [Playwright](https://playwright.dev/docs/intro) and [visual comparisons](https://playwright.dev/docs/test-snapshots) | Cross-browser journeys, web-server orchestration, assertions, and screenshot regression with environment-stability caveats. | HIGH |
| [Deque axe Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) | Official Playwright integration for automated full-page axe analysis. | HIGH |
| [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql) and [existing-project migrations](https://orm.drizzle.team/docs/get-started/postgresql-existing) | Supported PostgreSQL drivers and repository-owned generate/migrate workflow. | HIGH |
| [Zod 4](https://zod.dev/packages/zod) | Stable TypeScript-first runtime schemas for untrusted boundaries. | HIGH |
| [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) | Primary/foreign/unique/check constraints for the provenance graph. | HIGH |
| [Phosphor React](https://github.com/phosphor-icons/react) | Current React package, tree-shaking, and server/client import guidance. | HIGH |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) and [variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) | Automated budgets and the need for repeated, stable-environment measurement. | HIGH |
| npm registry metadata retrieved 2026-08-18 for all versioned packages | Current stable versions, peer ranges, and Node engine floors quoted in this report. Direct package pages are linked in the relevant rows where version choice is material. | HIGH for registry state on the research date |

## Roadmap Guidance

The stack should enter the roadmap in this dependency order:

1. **Compatibility harness and toolchain pin:** Node major, ESLint, Vitest domain tests, and Playwright public route/API contracts.
2. **Token and component proof:** CSS semantic tokens, Storybook Next/Vite, a11y/Vitest addons, Radix plus Phosphor, and one real component migration.
3. **Authenticated shell:** approved identity provider, stable auth library, server-only authorization/DAL, `/ops` layout, and anonymous-denial tests.
4. **Provenance store:** approved PostgreSQL provider, Drizzle migrations, Zod schemas, canonical entities, reconciliation, and shadow reads.
5. **Dense workspace:** TanStack Table v8 spike, URL state, responsive semantic alternate, then optional virtualization only on measured need.
6. **Read-only adapters:** server fetch plus Zod contracts, sync-run health/provenance, synthetic fixtures, retries, and explicit write rejection; add vendor SDKs/job infrastructure only when proven necessary.
7. **Performance gate:** Lighthouse CI after the route, fixture, auth, and LCP budgets are stable.

This order makes the compatibility and accessibility evidence exist before migration, makes authentication exist before protected data, and makes the canonical data contracts exist before integration breadth. It also keeps the public catalogue, WTF brand authorship, and Cloudflare retrieval path continuously shippable.
