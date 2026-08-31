# WTF OS Whole-App Shell Design

**Status:** approved direction; implementation contract for the Phase 2 UI refinement

**Decision date:** 2026-08-27

**Authority:** the owner's instruction makes the WTF OS shell the primary application experience and retires the catalogue-era presentation to an explicit legacy rollback version. `DESIGN.md`, `PRODUCT.md`, and the approved Phase 2 UI contract remain the visual, brand, accessibility, privacy, and policy authorities except where this document intentionally supersedes their old shell split.

## 1. Decision

The product will no longer present one catalogue application and a visually separate operations application. Every current application route will use one WTF OS shell and one component language:

- `/` becomes the WTF OS control room and application overview.
- `/episodes` becomes the episode workspace index.
- `/connections` becomes the evidence/connections workspace.
- `/chat` becomes the Ask WTF knowledge workspace.
- `/ops`, `/ops/operators`, and `/ops/audit` remain protected operator routes, but render inside the same WTF OS shell.
- `/ops/recover` remains outside protected application chrome because recovery must not retain or reveal protected context.
- `/api/chat` and `/api/ops/*` keep their existing contracts and authority boundaries.

The former catalogue presentation remains available only through the server-side legacy version selector for rollback and comparison. It is not a competing default, an alternate navigation mode, or a source of new visual direction.

The common shell does **not** make protected data public. Presentation converges; authorization does not. Public routes receive a public-safe shell projection. Protected routes receive capability-projected navigation, context, data, and actions only after the existing Access and D1 policy boundary succeeds.

## 2. Why the Current UI Is Incomplete

The current implementation has three conflicting visual systems:

1. the catalogue-era public shell;
2. the first-pass protected operator shell;
3. the generated WTF One Brain references.

The protected shell carries the right route and policy foundation but does not yet express the approved product. It reads as a sparse administration screen, uses unresolved semantic utility names, hand-builds controls that already have repository primitives, and shows several static service states as if they were live observations. The public migrated pages still center the product around episode browsing instead of presenting episodes, connections, and Ask WTF as workspaces in one operating system.

The reference set establishes a stronger, coherent direction:

- persistent dense ink rail;
- warm paper workspace with restrained grain;
- editorial display hierarchy and tactile print depth;
- a dashboard composition made from ledgers, timelines, sources, queues, and work surfaces rather than equal feature cards;
- explicit component states and active workspace markers;
- a receipts-to-actions loop connecting source evidence to the next valid action.

## 3. Goals

- Make the WTF OS shell unmistakably the product on every application route.
- Translate the generated references into real reusable components, not a one-screen imitation.
- Make `/` a useful control room using only real public-safe or verified operator-safe facts.
- Preserve current route URLs, deep links, query state, streaming chat behavior, citations, and public API contracts.
- Preserve all Phase 2 authentication, authorization, audit, recovery, cache, and privacy boundaries.
- Make active, inactive, unavailable, empty, loading, error, stale, and permission-denied states visually complete.
- Retain the old application only as a tested, server-selected legacy rollback.
- Establish a substrate that later Episodes, Production, Analytics, People, and Integration capabilities can enter without another shell redesign.

## 4. Non-Goals

- Activating future workflow modules or inventing their data.
- Moving, renaming, or exposing protected APIs.
- Changing Cloudflare Access, D1 policy, roles, audit retention, credentials, or deployment state.
- Adding fabricated metrics, tasks, users, platform health, owners, timestamps, or integration statuses.
- Rebuilding the product as fourteen equal dashboard cards.
- Reintroducing a public model picker or infrastructure controls.
- Deleting the legacy implementation before rollback proof passes.

## 5. Route and Authority Model

### 5.1 Shared presentation

`RootLayout` selects only the application version:

- `wtfos` — default; renders the WTF OS shell.
- `legacy` — explicit rollback; renders the preserved catalogue-era shell and pages.

Within the `wtfos` version, the shell derives a route projection from the request:

| Route class | Shell projection | Data authority |
|---|---|---|
| `/`, `/episodes`, `/connections`, `/chat` | public-safe WTF OS | current public contracts only |
| `/ops` and protected descendants | operator WTF OS | verified request context plus deny-by-default policy |
| `/ops/recover` | recovery frame | no protected shell or retained protected state |

The shell may share layout, brand primitives, navigation geometry, workspace headers, status treatments, and responsive behavior across route classes. It must not share protected server data, prefetched protected links, role labels, audit existence, operator roster facts, or protected action availability into public routes.

### 5.2 Route behavior

#### `/` — Control Room

The root route is the application overview, not a catalogue landing page. For a public-safe request it shows:

- real catalogue scope derived from the current public dataset;
- active workspaces: Episodes, Connections, and Ask WTF;
- source/provenance explanation;
- recent or representative episode material only when it comes from the current public projection;
- explicit `not activated` or `unavailable` rows for future systems, never fake health.

For a verified operator, `/ops` remains the protected control room and adds effective role, workspace/environment context, authorized administrative navigation, operator access state, and audit state where policy permits.

#### `/episodes`

Episodes is an active workspace, not a disconnected catalogue page. It keeps existing real episode data, search/filter state, drawers, transcript behavior, and deep-link behavior. The shell and workspace header mark Episodes active. Public-safe users see only the public episode projection.

#### `/connections`

Connections is an active evidence workspace. It keeps the public recurring-ideas projection and its accessible non-canvas alternative. The page must not imply that transcript mentions prove people, employers, leads, or ownership. Future protected knowledge actions remain absent until authorized and activated.

#### `/chat`

Ask WTF is an active knowledge workspace. It keeps the current streaming and citation contract. The active scope, composer, answer, quoted evidence, and source panel use the new component language. Provider/model controls remain absent from the public surface.

#### `/ops/*`

Protected pages use the same shell geometry and design system with a capability-projected operator rail. Operators and Audit appear only when both activated and authorized. Recovery and sign-out behavior remain fail closed.

## 6. Version and Rollback Contract

The canonical server-only variant becomes:

```ts
type AppUiVariant = "legacy" | "wtfos";
```

`WTF_PUBLIC_UI_VARIANT=legacy` remains the explicit rollback command during the migration so existing operational tooling does not need an immediate environment rename. Any current `migrated` value is accepted temporarily as a compatibility alias for `wtfos`, but it is never serialized to the client and is removed only after rollback tooling and tests adopt the canonical name.

The version switch remains server-only. It must not appear in URLs, cookies, local storage, client props, HTML data attributes, analytics, or public API responses. Legacy code stays isolated under `components/legacy/public` and receives only fixes required for rollback correctness and security.

Rollback proof must confirm:

- both variants build independently;
- protected data files remain byte-identical during variant tests;
- the five public route/API compatibility contracts still pass;
- no protected route or DTO becomes reachable through the legacy surface;
- switching to legacy does not require a code deployment.

## 7. Visual Translation from the References

### 7.1 Material system

- Cream paper is the dominant canvas.
- Ink creates the rail, borders, typography, dividers, and offset depth.
- Grain/halftone is restrained to fixed paper and brand surfaces; it does not reduce readability in lists, transcripts, forms, or tables.
- One semantic accent leads per workspace: yellow for command/attention, purple for Ask WTF/knowledge, blue for information, green for verified/live, red for critical/editorial, and provisional orange only for actual production warning/in-progress states.
- Panels are separated primarily by rules, spacing, and contrast. Rounded white SaaS cards and glass effects are prohibited.

### 7.2 Typography

- Bricolage Grotesque: wordmark, route titles, and large dashboard hierarchy.
- Poppins: navigation, controls, ledgers, filters, tables, status, and body copy.
- Fraunces: brief editorial quotes and evidence excerpts only.
- Tabular numerals: counts and times where real measurements exist.

### 7.3 Reference elements that become components

| Reference element | Product component | Required states |
|---|---|---|
| Dense black sidebar | `AppRail` | default, hover, focus-visible, active, compact, drawer |
| Workspace masthead | `WorkspaceHeader` | title, eyebrow, scope, status, primary action, tools |
| Command search | `CommandSearch` | idle, focus, typing, loading, results, empty, error |
| Status blocks | `StatusLedger` + `StatusRow` | verified, unknown, unavailable, restricted, not activated, stale |
| Evidence receipt | `EvidenceCard` | source-ready, partial, untimed, selected, unavailable |
| Right source panel | `SourcePanel` | closed, open, loading, source-ready, missing, error |
| Activity strip | `Timeline` | ready, empty, partial, retry, stale |
| Filter/control row | `FilterBar` | default, active filters, overflow, loading, reset |
| Workspace switcher | `ViewToggle`/tabs | active, hover, focus, disabled only when truly unavailable |
| Episode/evidence rows | `EpisodeRow`/`EvidenceRow` | default, active, selected, loading, unavailable |
| Future system entries | `ActivationState` | not activated only; never a disabled fake link |

Decorative charts, schedules, boards, and metrics in the generated compositions remain reference-only until a real source and an authorized workflow exist.

## 8. Information Architecture and Active States

### 8.1 Public-safe rail

1. Control Room — `/`
2. Episodes — `/episodes`
3. Connections — `/connections`
4. Ask WTF — `/chat`

The rail may include a compact `operations` entry only as an authentication boundary, never as a preview of protected content.

### 8.2 Protected additions

The verified operator projection adds only activated, authorized destinations:

- Control Room — `/ops`
- Operators — `/ops/operators` for `super_admin` and `admin`
- Audit — `/ops/audit` for `super_admin` and `admin`

Public workspaces may remain visible as clearly labelled shared workspaces, but protected pages never turn them into evidence of operator authorization.

### 8.3 Active-state contract

Active navigation uses all of:

- `aria-current="page"`;
- an ink/yellow structural marker;
- a weight or inversion change;
- route-aware parent matching for nested paths;
- a visible workspace title in the content header.

Color alone is insufficient. Hover never masquerades as active. A future module with no route is a labelled `not activated` status row, not a disabled navigation item. A route hidden by policy is absent, not greyed out.

## 9. Component Architecture

The first implementation slice converges existing code instead of building a parallel component library:

```text
web/components/
  brand/
    Wordmark
    PrintTexture
  ui/
    Button
    IconButton
    LinkButton
    Drawer
    AvailabilityState
    SkipLink
    LiveRegion
  shells/
    AppShell
    AppRail
    AppShellContext
    RecoveryFrame
  patterns/
    WorkspaceHeader
    StatusLedger
    CommandSearch
    FilterBar
    SourcePanel
    Timeline
  domain/
    public/
    ops/
```

Existing UI primitives are reused and corrected before new bespoke controls are introduced. The current `OperatorShell` and `PublicShell` converge into `AppShell` projections rather than continuing as visually separate products. Domain pages keep their data and behavior while their outer composition moves into workspace patterns.

Server Components own route classification, variant selection, data loading, and capability projection. Client Components own only interactive islands such as drawer state, filters, search, streaming chat, focus transitions, and explicit refresh.

## 10. Control Room Composition

The dashboard must feel like the generated WTF OS reference while staying truthful.

### First viewport

1. persistent rail or mobile ink header;
2. compact context line: application scope and verified operator context where present;
3. `control room` display heading and the promise `run the show from the source`;
4. one dominant command;
5. workspace ledger showing active, unavailable, and not-activated systems;
6. a real episode/evidence surface derived from current public data.

### Dashboard hierarchy

- A broad main column holds current workspaces and source-backed material.
- A narrower side column may hold provenance, recent evidence, or status only when real data exists.
- Future modules occupy one factual activation ledger, not multiple teaser cards.
- Counts are shown only when computed from the current public projection or a verified protected query and labelled with scope.
- `refresh status` either performs a real explicit refresh with announced results or is absent; it cannot remain a no-op.

### Dominant action

- Public-safe Control Room: `ask the catalogue` leading to `/chat`.
- `editor` protected Control Room: `open Ask WTF`.
- `admin` and `super_admin` protected Control Room: `review operator access`.

## 11. State and Truth Contract

Every screen and reusable component supports:

1. ready;
2. loading without layout shift;
3. measured empty;
4. partial/unavailable evidence;
5. error with a bounded recovery action;
6. permission denied without protected detail;
7. offline/stale where observation time matters;
8. active/selected/focus-visible interaction states.

Static claims are prohibited when the UI implies a live observation. Specifically:

- Audit is absent for roles that cannot safely know it exists.
- Public catalogue is active because the current app exposes it; health is `not observed` unless a real check exists.
- Workflow systems are listed by approved name and marked `not activated` individually.
- A refresh control performs a real server refresh or is not rendered.
- Missing data is `unknown` or `unavailable`, never a misleading zero.

## 12. Responsive, Accessibility, and Motion

### Current release navigation contract (owner-approved 2026-08-31)

- The shell uses a fixed top header for the WTF OS wordmark and an operations
  disclosure, plus a fixed bottom application dock.
- The wordmark is the first header link and always uses its structural contrast
  plate. The operations button exposes `aria-expanded` and
  `aria-controls="wtf-operations-navigation"`.
- The disclosure contains only the supplied role-projected operational links.
  It opens on activation, moves focus to its first link, closes on Escape or an
  outside pointer, and restores focus to the button on Escape.
- The bottom dock contains the supplied workspace links in one `Application`
  navigation landmark. Operational links are not duplicated there.
- At 1440px, 768px, and 320px the header and dock remain visible, the
  disclosure is width-capped, and the page has no horizontal overflow.

The centered-logo bottom dock and persistent-rail/drawer arrangement are
historical proposals, not the current release contract. A future drawer may
reuse the same role-projected destinations only with a separately reviewed
contract.

- Main content has a skip target and route changes leave a visible, logical focus destination.
- All controls use semantic links/buttons and 44px touch targets where pointer precision cannot be assumed.
- Canvas graphs have an equivalent semantic list/table.
- Filters and scope use URL state where refresh/back/share behavior matters.
- Internal motion is limited to 120–320ms feedback/continuity transitions; no breathing status lights or perpetual sorting.
- `prefers-reduced-motion` removes non-essential loops and reduces large transitions.

## 13. Security and Privacy

- The whole-app shell is a visual convergence, not an authorization convergence.
- Protected route verification remains server-only and fail closed.
- UI visibility mirrors policy but never grants authority.
- Public shell output contains no protected route payloads, operator context, roles, roster data, audit metadata, protected prefetches, or private cache entries.
- Recovery clears protected client state before rendering and never reuses the application shell.
- Variant selection, provider identities, credentials, raw prompts/responses, and private source paths never reach the client.
- The shell must not cache one user's capability projection for another request.

## 14. Migration Sequence

1. **Correct the substrate:** align semantic tokens, font aliases, radii, focus, motion, and existing UI primitives.
2. **Introduce the shared shell:** build route-aware `AppShell`, `AppRail`, responsive drawer, `WorkspaceHeader`, and truthful navigation projections.
3. **Make root the Control Room:** compose source-backed workspace and evidence/status surfaces without fabricated data.
4. **Bring current routes into the shell:** Episodes, Connections, and Ask WTF keep behavior and gain workspace composition and active states.
5. **Converge protected routes:** move Control Room, Operators, and Audit into the shared shell while preserving policy projections and recovery isolation.
6. **Canonicalize the version seam:** default to `wtfos`, retain explicit legacy rollback, and keep `migrated` only as a temporary server-only alias.
7. **Retire duplicate shells:** remove obsolete default imports/styles only after all browser, visual, accessibility, security, and rollback gates pass.

Each slice is test-first and vertically usable. Foundation work is proven in the Control Room before broad migration.

## 15. Verification and Acceptance

### Static and contract tests

- Semantic token names used by components resolve to emitted CSS.
- Components do not use raw palette hex values.
- Variant values remain server-only.
- Public and protected DTO/import boundaries remain separated.
- All existing route and `/api/chat` response contracts remain compatible.
- Protected routes continue deny-by-default behavior for anonymous, expired, inactive, unknown-role, editor, admin, and `super_admin` cases.

### Component and accessibility tests

- Rail active state, nested-route matching, focus-visible, and drawer keyboard behavior.
- WorkspaceHeader, StatusRow, Button, LinkButton, Drawer, SourcePanel, and AvailabilityState state matrices.
- Axe checks and keyboard-only journeys for every route.
- Reduced-motion behavior.

### Browser journeys

- `/`, `/episodes`, `/connections`, and `/chat` render inside the WTF OS shell at 320, 768, and 1440px.
- `/ops`, `/ops/operators`, and `/ops/audit` render the same shell language only after verified authorization.
- Editors never receive Operators or Audit navigation or payload detail.
- Recovery contains no protected chrome or stale protected content.
- Filters, drawers, citations, sources, graph alternative, chat streaming, and back/refresh behavior remain functional.
- No horizontal page scroll.

### Visual review

The candidate set must prove:

- dense ink rail and warm paper canvas;
- print material without readability loss;
- unmistakable WTF brand typography;
- clear active, hover, focus, selected, unavailable, error, and not-activated states;
- dashboard hierarchy based on ledgers/evidence, not equal cards;
- continuity with the generated moodboard, app-flow reference, contact sheet, and Control Room composition.

### Rollback

Run the full route, visual, accessibility, security, and protected-data hash suite against both `wtfos` and `legacy`. No deployment or production cutover is part of this UI implementation without a separate owner-approved release gate.

## 16. Risks and Controls

| Risk | Control |
|---|---|
| Shared shell leaks protected information | Server-owned route projection, import/DTO tests, no protected prefetch on public routes |
| Visual work drifts into generic SaaS | Reference-based visual acceptance and anti-pattern checks |
| Dashboard fabricates operational confidence | Source labels, observed times, explicit unknown/unavailable/not-activated states |
| Legacy remains a competing product | Default `wtfos`, legacy server-only, no legacy navigation or feature development |
| Broad migration breaks current behavior | Vertical route slices, existing contract tests, tested rollback |
| New shell duplicates existing primitives | Reuse and repair `ui/` first; prohibit one-off interactive controls |
| Dirty worktree loses unrelated work | Surgical patches, path-scoped review, no reset/clean/revert |

## 17. Acceptance Statement

The refinement is complete only when a user can enter any current application route and recognize one coherent WTF OS; identify the active workspace and available actions; distinguish verified, unavailable, and not-activated states; inspect real episode/evidence material; and traverse public or protected capabilities without any change to their authority boundary. The catalogue-era presentation is then a tested rollback version, not the current product.
