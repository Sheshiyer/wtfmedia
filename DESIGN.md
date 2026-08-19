# WTF Media Design System

Status: design authority for the proposed One Brain re-foundation. This file
defines the product narrative, visual rules, information architecture,
component contracts, and migration seams that GSD planning must decompose. It
does not authorize implementation, dependency installation, deployment, or an
external integration.

Acceptance remains in `ISA.md`. This file explains how the intended experience
should be built; it does not create a second definition of done.

## 1. Product Thesis

WTF Media is not a catalogue with extra admin pages. It is an evidence-native
podcast operating system whose public catalogue is one protected projection.

The internal product should make one loop feel inevitable:

1. See what needs attention.
2. Open the episode or operational record.
3. inspect the exact source, transcript, moment, owner, and state.
4. Ask, decide, or create the next piece of work.
5. Return to the control room with the outcome recorded.

The memorable idea is **receipts become actions**. Ask WTF is not a floating AI
feature. It is the evidence interface connecting catalogue knowledge to briefs,
clips, production decisions, research, and performance.

## 2. Design Research Brief

Designing a web operating system for the WTF production, research, and
operations team.

- Goal: move from an episode, question, or blocker to verified evidence and the
  next accountable action without switching mental models.
- Tone: curious, irreverent, exact, tactile, editorial, and operationally calm.
- Main risk: turning the existing brand into either a generic SaaS dashboard or
  a decorative poster that cannot support daily work.
- Must remember: the provenance spine is the product, and the public catalogue
  is not the internal navigation model.
- Constraints: retain Next.js App Router, React, TypeScript, Tailwind 3, the
  committed brand identity, the protected retrieval path, and privacy/security
  boundaries until an approved architecture phase changes them.
- Research needed: visual direction, high-density product patterns, evidence
  navigation, episode workflows, transcript reading, and multi-step operational
  continuity.

Live Refero catalogue queries were attempted, but the configured subscription
is inactive. No subscription or external account was changed. The research
workflow therefore uses the committed project imagery as its real reference set
and Refero's bundled craft guidance as a secondary ruleset.

## 3. Reference Lock

### Primary direction

The committed `contact-sheet.png`, `control-room.png`, and `flow-diagram.png`
are the visual and product north star.

Preserve:

- Warm cream paper canvas, dense ink, halftone/grain, and offset-print depth.
- Large condensed-feeling display hierarchy and the extruded lowercase
  `wtfmedia` wordmark.
- Sharp editorial color blocks with black structure, not translucent SaaS
  glass.
- A persistent operator rail for internal workspaces.
- The sequence Control Room → Episode → Transcript → Ask WTF → action.
- Real episode, transcript, evidence, status, and performance content as the
  primary visual material.

### Secondary references

- The shipping public catalogue supplies the real wordmark, fonts, episode
  imagery, public Ask WTF interaction, connection graph, texture, and voice.
- The bundled Refero craft references supply type scales, semantic color roles,
  motion timing, focus behavior, responsive rules, and anti-generic checks.
- Current official documentation anchors the component-foundation decision:
  [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility),
  [Radix composition](https://www.radix-ui.com/primitives/docs/guides/composition),
  [Radix releases](https://www.radix-ui.com/primitives/docs/overview/releases),
  [TanStack React Table](https://tanstack.com/table/latest/docs/framework/react/react-table),
  [Storybook for Next.js](https://storybook.js.org/docs/9/get-started/frameworks/nextjs),
  and [Phosphor Icons](https://phosphoricons.com/).

Borrow only:

- Purpose-named semantic tokens instead of color names in component code.
- Accessible headless interaction behavior beneath fully custom WTF styling.
- State-complete components: default, hover, focus-visible, pressed, loading,
  empty, error, disabled, and success where applicable.

Reject:

- Generic white rounded-card dashboards.
- Indigo gradients, neon AI glows, glass panels, and decorative bento grids.
- A calm editorial marketing template that weakens the loud WTF identity.
- Cards used only to group content that a divider or layout can explain.
- Perpetual motion in operator surfaces.
- A public model picker, exposed infrastructure jargon, or roadmap marketing.
- Fake metrics, fake users, fabricated integration states, or guessed
  timestamps.

### Media strategy

Use actual episode thumbnails, transcript excerpts, status records, charts,
brand assets, and source evidence. When a future data source is unavailable,
render a clearly labelled unavailable/empty state. Do not invent stock metrics
or replace missing evidence with decorative graphics.

## 4. Experience Dials

The product has two related surfaces with different operating densities.

| Surface | Variance | Motion | Density | Character |
|---|---:|---:|---:|---|
| Public catalogue | 7/10 | 5/10 | 4/10 | Expressive, image-led, inviting |
| Internal shell | 4/10 | 3/10 | 7/10 | Structured, fast, evidence-dense |
| Episode workspace | 5/10 | 3/10 | 8/10 | Focused, inspectable, source-first |
| Ask WTF | 5/10 | 4/10 | 6/10 | Conversational, cited, calm |

Asymmetry belongs in brand framing, episode media, and section composition.
Tables, filters, forms, transcripts, and production state must remain aligned
and predictable.

## 5. Product Architecture

### Public projection

Public visitors can discover episodes, recurring ideas, and grounded answers.
They cannot enumerate internal tasks, budgets, leads, briefs, integration
health, or production state.

Recommended route group:

```text
web/app/(public)/
  page.tsx                  catalogue landing
  episodes/page.tsx         public episode discovery
  episodes/[episodeId]/     public episode and transcript projection
  connections/page.tsx      recurring themes and ideas
  chat/page.tsx             public Ask WTF; preserves the shipping `/chat` URL
```

### Public compatibility contract

The overhaul must preserve the existing `/`, `/episodes`, `/connections`,
`/chat`, and `/api/chat` contracts until a replacement projection or redirect
has shipped with route-level tests. Moving source files into a Next.js route
group must not change those URLs. Existing bookmarks, supported query strings,
deep links, streaming response behavior, citation/source fields, status codes,
and required headers remain compatible.

`/chat` remains the canonical public Ask WTF URL during migration. A future
`/ask` URL may be introduced only after a tested alias or redirect preserves
`/chat`; it cannot be substituted by moving the page alone. `/connections`
remains the read-only public projection of recurring themes. The internal
`/ops/knowledge` graph is a separate operator projection over shared evidence,
with authenticated controls, saved evidence, and operational context. The two
projections may share domain queries and graph data, but never view-policy,
permission, or interaction-state boundaries.

### Internal operating system

Authenticated operators enter a persistent shell. The current workspace,
active scope, system status, and dominant next action are always legible.

```text
web/app/(ops)/ops/
  page.tsx                  control room
  episodes/page.tsx         episode inventory and filters
  episodes/[episodeId]/     episode workspace
  knowledge/page.tsx        Ask WTF, dossiers, saved evidence
  production/page.tsx       stage board and calendar
  analytics/page.tsx        performance and reporting windows
  people/page.tsx           guests, leads, and relationships
  settings/integrations/    health, permissions, and retries
```

### Primary operator navigation

1. Control Room
2. Episodes
3. Knowledge
4. Production
5. Analytics
6. People

Settings and integration health sit below the primary workspaces. Contracts,
budgets, clips, briefs, credentials, and large-file workflows appear inside the
episode, production, people, or settings contexts instead of becoming fourteen
equal top-level destinations.

### Episode workspace

An episode is the canonical join point. Its workspace should expose:

- Overview: show/IP, title, owner, dates, current stage, and blockers.
- Assets: source, clean cut, published video, audio, thumbnails, and readiness.
- Transcript: source timeline, speakers, search, selection, and citations.
- Clips: candidate moments, status, destinations, and evidence.
- Brief: research structure, approvals, goals, and production notes.
- Performance: source-labelled reporting windows and platform metrics.
- Activity: who changed what, when, and why.

## 6. Narrative and Copy System

### Product hierarchy

- Internal promise: **run the show from the source**.
- Public promise: **ask the catalogue and get the moment**.
- Evidence promise: every grounded claim resolves to a source, timestamp when
  verified, or an explicit unknown.

### Voice

- Curious: questions invite inspection rather than pretending certainty.
- Irreverent: lowercase display copy and short, sharp labels remain welcome.
- Exact: statuses, dates, owners, sources, and failures are named plainly.
- Operational: buttons use concrete verbs such as `open transcript`, `assign
  owner`, `review clip`, and `retry ingest`.

Avoid corporate scale language, AI clichés, duplicated headings, unexplained
technical model names, and vague CTAs such as `continue` or `learn more`.

## 7. Color System

The shipping `PRODUCT.md` palette is fixed. The overhaul changes its roles and
implementation, not its identity. Orange is a comp-derived semantic extension
already present in the committed contact sheet and Tailwind configuration; it
remains provisional until the token and its foreground pair pass contrast and
design approval in the owning GSD phase.

| Token | Value | Role |
|---|---|---|
| `canvas` | `#FFF6EA` | Primary page background and paper field |
| `surface-subtle` | `#F0EADF` | Filters, inactive rows, skeleton bases |
| `surface-raised` | `#FFFCF7` | Elevated working surface; not every section |
| `foreground` | `#1A1A1A` | Text, structure, borders, and offset depth |
| `editorial` | `#C53B3A` | Brand emphasis, critical state, destructive action |
| `live` | `#0C9367` | Live, connected, healthy, approved, completed |
| `attention` | `#F1B333` | Primary action, selection, due attention; ink text |
| `production` | `#F07633` | Provisional comp-derived extension for in-progress production and warning states |
| `knowledge` | `#6758A5` | Ask WTF, evidence selection, knowledge scope |
| `information` | `#2D6BE0` | Neutral information, links, and platform data |

Rules:

- Components consume semantic tokens, never raw hex values.
- Cream and ink carry at least 80% of an internal screen.
- One workspace accent leads at a time. Other colors appear only when their
  semantic state is present.
- Yellow is not body text on cream. Use it as a fill with ink or as a bounded
  highlight.
- Red is not used for ordinary navigation selection; it retains editorial or
  critical meaning.
- Purple is permitted because it is committed brand color, but it is restricted
  to knowledge/AI scope and never rendered as a neon glow.
- Every solid/tinted semantic has foreground, background, border, hover, and
  disabled pairs validated for WCAG AA.

Recommended token location:

```text
web/styles/tokens.css        raw and semantic custom properties
web/styles/themes.css        public/ops contextual mappings
web/tailwind.config.ts       aliases that point to CSS custom properties
```

## 8. Typography

The shipping identity in `PRODUCT.md` wins over older visual comps.

- Display and wordmark: Bricolage Grotesque, 700–800.
- Editorial voice and quotations: Fraunces, 400–600.
- Body, controls, tables, and dense product UI: Poppins, 400–600.
- Operational numbers: Poppins with `font-variant-numeric: tabular-nums`.
- Technical identifiers only: a system mono stack; do not introduce a fourth
  branded family.

Type scale:

| Token | Size | Use |
|---|---|---|
| `label-xs` | 11px | Metadata and compact status labels |
| `body-sm` | 13px | Dense rows and secondary interface text |
| `body` | 16px | Default reading and controls |
| `lead` | 19px | Introductory or explanatory prose |
| `title-sm` | 23px | Panels and workspace sections |
| `title` | 28px | Page subsections |
| `heading` | 34px | Internal page title |
| `display` | `clamp(40px, 6vw, 72px)` | Public and control-room brand moments |

Rules:

- Body copy is at least 16px with 1.5 line height and a 65ch maximum measure.
- Dense UI text may use 13px only with sufficient weight and contrast.
- Uppercase labels use at least `0.08em` tracking.
- Headings use `text-wrap: balance`; prose uses `text-wrap: pretty` selectively.
- Fraunces never appears in a button, filter, table header, or dense status UI.
- The extruded wordmark remains a brand asset, not a general text-shadow recipe.

## 9. Space, Shape, Structure, and Depth

Spacing follows a 4px base rhythm:

```text
4, 8, 12, 16, 24, 32, 48, 64, 96
```

- Compact controls: 8–12px internal gaps.
- Workspace sections: 24–32px gaps.
- Public storytelling sections: 48–96px gaps.
- Primary content is contained at 1400px maximum; transcripts use a narrower
  readable measure.

Shape tokens:

- `radius-control`: 8px.
- `radius-panel`: 12px.
- `radius-card`: 16px where a true card is warranted.
- `radius-pill`: 999px for chips and compact actions only.

Depth:

- Default operator grouping uses borders, dividers, and space, not shadows.
- Brand/interactive media cards may use a 4–6px ink offset shadow.
- Hover may increase offset by at most 3px while moving the card oppositely.
- Drawers and dialogs use one overlay layer and a bounded ink edge.
- Texture lives on fixed/paper surfaces, never on scrolling data containers.

## 10. Motion and Feedback

Motion serves feedback, continuity, or hierarchy. If it serves none, remove it.

| Token | Value | Use |
|---|---:|---|
| `duration-fast` | 120ms | Hover, focus, press |
| `duration-default` | 200ms | Tabs, disclosure, inline state |
| `duration-slow` | 320ms | Drawer, dialog, large transition |
| `ease-out` | `cubic-bezier(0,0,.2,1)` | Enters and feedback |
| `ease-in` | `cubic-bezier(.4,0,1,1)` | Exits |
| `ease-in-out` | `cubic-bezier(.4,0,.2,1)` | State continuity |

Rules:

- Animate only transform and opacity unless a measured exception is documented.
- Never use `transition: all`.
- Public marquees and sparkles may loop; they pause under reduced motion and do
  not contain essential information.
- Internal status indicators do not breathe, pulse, or auto-sort indefinitely.
- Loading uses layout-matched skeletons, not generic spinners.
- Every animation is interruptible.
- `prefers-reduced-motion: reduce` removes parallax/loops and reduces large
  transitions to short fades.

## 11. Component Foundation Decision

### Recommendation

Adopt Radix Primitives selectively beneath repository-owned components. Do not
install or copy the default shadcn visual layer.

Why:

- Unstyled primitives preserve the exact WTF material language.
- Focus management, keyboard navigation, and ARIA behavior cover the weakest
  areas of the current bespoke implementation.
- Selective packages allow incremental migration rather than a whole-app
  rewrite.
- Data-state attributes map cleanly to Tailwind 3 and semantic CSS tokens.
- Official release notes include React 19 fixes; the implementation phase must
  pin and verify the selected release instead of assuming compatibility.

Use TanStack Table only as the headless state/model layer for data tables. WTF
owns the semantic table markup, keyboard behavior, responsive presentation, and
styling.

Use Phosphor icons at one normalized weight. Existing custom brand glyphs such
as the sparkle and wordmark remain repository components.

Use `@storybook/nextjs-vite` for primitive and pattern development because the
current app has no custom Webpack dependency. Server pages stay out of primitive
stories; stories use serializable fixtures and client-level components.

React Aria Components remains the fallback if a later phase proves that complex
internationalized collection, date, and grid behavior dominates the product.
It is not the first adoption because replacing the current system with one
all-in package creates a larger migration surface than selective Radix
primitives.

No dependency is installed until the GSD implementation phase explicitly owns
its package and migration tests.

## 12. Component Library Layers

```text
web/components/
  brand/       Wordmark, Sparkle, Halftone, PrintFrame
  ui/          accessible primitives; no domain knowledge
  patterns/    FilterBar, DataTable, Timeline, MetricPanel, EmptyState
  domain/      EpisodeCard, TranscriptReader, Citation, ProductionStage
  shells/      PublicShell, OperatorShell, WorkspaceHeader
```

### UI primitives

| Component | Contract |
|---|---|
| Button | primary, secondary, quiet, destructive; loading and pressed states |
| IconButton | 44px target, required accessible name, tooltip when ambiguous |
| LinkButton | semantic link with button presentation; preserves browser behavior |
| Field | label, control, helper, error, required/optional metadata |
| Input/Textarea | native semantics, invalid and disabled states, no paste blocking |
| Select/Combobox | typeahead, keyboard navigation, visible value and label |
| SearchField | query, clear action, shortcut hint, loading and result count |
| Checkbox/Radio/Switch | label and control share one hit target |
| StatusChip | semantic status mapping; never color alone |
| Tabs | arrow-key navigation and URL-addressable state where useful |
| Tooltip | supplementary only; never essential instructions |
| DropdownMenu | keyboard navigation, typeahead, collision handling |
| Dialog | labelled, focus trapped, scroll contained, focus restored |
| Drawer | same modal contract; transcript/episode drawers become workspace-aware |
| Popover | anchored, dismissible, collision-aware |
| Toast | polite live region, bounded duration, persistent errors where necessary |
| Skeleton | matches final geometry and respects reduced motion |

### Patterns

| Pattern | Contract |
|---|---|
| WorkspaceHeader | title, scope, status, one dominant action, optional secondary tools |
| FilterBar | URL-backed filters, reset, result count, responsive overflow |
| DataTable | sort, filter, selection, pagination/virtualization, empty/error states |
| ViewToggle | list/grid choices preserve URL and user preference |
| CommandPalette | keyboard invocation, grouped results, current scope, escape handling |
| Timeline | source-labelled events, actor, timestamp, outcome, retry state |
| MetricPanel | value, reporting window, provenance, comparison, unavailable state |
| EmptyState | reason, next valid action, no fabricated preview data |
| ErrorState | what failed, what remains safe, retry or recovery action |
| IntegrationStatus | health, permission mode, last sync, next retry, owner |

### Domain components

- EpisodeCard and EpisodeRow share one data contract.
- EpisodeWorkspace joins status, assets, transcript, clips, brief, and evidence.
- TranscriptReader supports speaker labels, search, source timeline, selection,
  and verified timestamp navigation.
- Citation always displays its episode/source context and opens in place.
- AskComposer exposes the active episode/show/catalogue scope.
- ConversationThread visually separates quoted evidence from synthesis.
- ProductionBoard uses real stages, one accountable owner, and explicit blockers.
- ResearchDossier preserves Snacks, Appetizers, Main Course, and Desserts.
- PerformancePanel always names platform and reporting window.

## 13. Current-to-Target Migration Map

| Current source | Keep | Change into | Main risk |
|---|---|---|---|
| `web/app/layout.tsx` | Metadata and wordmark | `PublicShell` plus authenticated `OperatorShell` | Public/internal data leakage |
| `.card`, `.pill`, `.chip` globals | Offset-print material language | Tokenized Button, Card, StatusChip variants | Generic defaults or role drift |
| `Wordmark.tsx` | Letter colors and extrusion | Brand component using semantic/raw brand tokens | Wordmark becoming ordinary text style |
| `Sparkle.tsx` | Brand glyph | Decorative brand primitive with motion policy | Essential meaning hidden in decoration |
| `CustomCursor.tsx` | Playful public personality | Public-only optional effect; native cursor in ops | Accessibility and operator precision |
| `Marquee.tsx` | Public energy | Pausable public-only marquee with static fallback | Reduced-motion failure |
| `DragRow.tsx` | Horizontal discovery | `ScrollRail` with buttons, snap, keyboard, touch | Pointer-only navigation |
| `GuestStrip.tsx` | Real guest imagery | `PersonRail` using ScrollRail and semantic links | Image/label truncation |
| `EpisodesBrowser.tsx` | Real episode/transcript behavior | EpisodeCard/Row, FilterBar, EpisodeWorkspace, TranscriptReader | Monolithic client state and focus loss |
| `ConnectionGraph.tsx` | Real relationship visualization | Canvas graph plus accessible list/table alternative | Canvas-only meaning |
| `ModelPicker.tsx` | Diagnostic model information | Internal, feature-gated diagnostic control only | Public infrastructure exposure |
| `chat/page.tsx` | Streaming, cited sources, and the `/chat` public contract | AskComposer, ConversationThread, SourcePanel at `/chat`; optional `/ask` only behind a tested alias or redirect | Mixed state, inaccessible errors, broken bookmarks, scope ambiguity |
| `connections/page.tsx` | Real theme evidence and the `/connections` public contract | `PublicConnectionsProjection` plus a separate internal `KnowledgeConnections` projection over shared evidence | Permission leakage, coupled interaction state, invented certainty |

## 14. Screen Contracts

### Control Room

- Answers: what is live, due, blocked, unowned, or failing now?
- First viewport: active episodes, current stages, next shoots/publishes,
  blockers, assigned work, and one global command search.
- Every summary links to an already-filtered workspace.
- No vanity metrics without an operational decision attached.

### Episodes

- List is the default for operators; cards are optional for visual browsing.
- Filters include show/IP, stage, owner, transcript status, asset readiness, and
  dates where data exists.
- Add episode is visible only to authorized roles.
- Opening a row preserves list/filter context.

### Transcript

- Source and timeline are always visible.
- Clean-cut and published timelines never masquerade as one timeline.
- Search results preserve speaker/context around the match.
- Selecting text can create an Ask scope, clip candidate, or evidence reference.
- Untimed transcripts never display invented timestamp affordances.

### Ask WTF / Knowledge

- Current retrieval scope is persistent and changeable.
- Quoted evidence and model synthesis have different containers and labels.
- Sources remain visible while reading the answer.
- Errors explain whether retrieval, generation, or source opening failed.
- Save actions create explicit evidence objects, not invisible chat memory.

### Production

- Board and calendar are two views of the same episode workflow records.
- Every active stage has one owner, due state, source record, and blocker state.
- External integration actions begin read-only and show retry/permission state.

### Analytics

- Every metric names platform, reporting window, last refresh, and availability.
- Comparison is explicit; no unexplained up/down arrows.
- Missing platform data produces an unavailable state, never zero.

### People

- Guest and lead are distinct roles, not inferred from mere transcript mention.
- Relationship evidence is shown before derived summaries.
- Contact or sensitive fields obey role-based visibility.

## 15. Responsive and Accessibility Contracts

- Test at 320px, 768px, and 1440px minimum.
- Multi-column layouts collapse to one content column below 768px.
- Operator navigation becomes a labelled drawer; active workspace remains clear.
- No horizontal page scroll. Tables use deliberate responsive strategies rather
  than shrinking text below readability.
- Controls have 44px touch targets where pointer precision cannot be assumed.
- Use semantic links and buttons, never clickable generic containers.
- Every icon button has an accessible name.
- Focus uses `:focus-visible` and remains visible against every semantic fill.
- Dialogs and drawers trap/restore focus and contain scroll chaining.
- Async updates use live regions only when the information benefits the user.
- Images reserve dimensions and use meaningful alt text; decorative texture is
  hidden from assistive technology.
- Canvas visualizations have equivalent semantic lists or tables.
- URL state represents filters, tabs, query scope, and pagination where users
  may need refresh, back, or share behavior.

## 16. State Completeness

Every component and screen design includes:

1. Ready with representative real-shaped fixture data.
2. Loading without layout shift.
3. Empty with the next valid action.
4. Partial when some integrations or evidence are unavailable.
5. Error with cause boundary and recovery.
6. Permission-denied without leaking protected data.
7. Offline/stale where sync recency matters.

No design review passes using only the happy state.

## 17. Repository Implementation Shape

Recommended eventual structure:

```text
web/
  app/
    (public)/
    (ops)/
  components/
    brand/
    ui/
    patterns/
    domain/
    shells/
  styles/
    tokens.css
    themes.css
    motion.css
  stories/
    fixtures/
  tests/
    accessibility/
    visual/
    journeys/
```

Server Components own route layout and data loading. Client Components remain
leaf-level interaction islands. A component moves client-side only when browser
state, focus behavior, pointer/keyboard interaction, streaming, or animation
requires it.

## 18. Recommended Build Order for GSD Decomposition

This is a dependency order, not an approved phase roadmap.

1. Foundations: tokens, fonts, focus, motion policy, fixtures, stories, tests.
2. Primitives: controls, overlays, feedback, and state components.
3. Shells: public/internal route separation, navigation, workspace header.
4. Public projection: migrate home, episodes, connections, and Ask WTF while
   preserving `/`, `/episodes`, `/connections`, `/chat`, and `/api/chat`
   compatibility and protected retrieval behavior.
5. Provenance spine: canonical episode workspace, assets, transcript timelines,
   citations, reconciliation.
6. Knowledge: scoped Ask WTF, evidence panel, saved evidence, dossiers.
7. Operations: production, calendar, briefs, clips, owners, blockers.
8. Insights and people: analytics provenance, guests/leads, access controls.
9. Integrations: read-only adapters, health, retries, permissions, audit trail.
10. Removal: delete old global component classes only after all consumers and
    visual/a11y regression tests have migrated.

Each GSD phase should ship a vertical behavior slice. Do not build the entire
component library before proving it inside one real workflow.

## 19. Verification Matrix

| Surface | Primary proof | ISA coverage |
|---|---|---|
| Narrative/IA | Anonymous/authenticated route and copy tests | ISC-13–24 |
| Public continuity | Bookmark/deep-link, query, redirect, streaming API, and response-shape contract tests | ISC-13–24 |
| Tokens/type/depth | Token schema, contrast, computed style, snapshots | ISC-25–40 |
| Primitives | Stories, keyboard tests, axe, reduced motion | ISC-41–58 |
| Control room | Fixture browser journeys and filtered links | ISC-59–70 |
| Provenance | Schema, reconciliation, citation integration | ISC-71–82 |
| Knowledge | Golden RAG and scoped browser journeys | ISC-83–92 |
| Operations | Fixtures, adapters, permissions, retry states | ISC-93–110 |
| Quality/safety | Build, UI suite, axe, viewports, security scans | ISC-111–128 |

## 20. Design Decision Ledger

| Decision | Source | Role preserved | Why |
|---|---|---|---|
| Internal control room is primary | Kickoff requirements and committed comps | Operator workflow | Catalogue navigation cannot carry operational state |
| Public catalogue remains separate | Shipping product and ISA | Read-only discovery | Protects working retrieval and prevents data leakage |
| Public URLs remain compatible | Shipping route inventory | `/`, `/episodes`, `/connections`, `/chat`, `/api/chat` | Route groups are implementation structure, not permission to break links or clients |
| Connections has two projections | Shipping graph plus internal knowledge requirements | Shared evidence; separate public/operator views | Reuse domain truth without coupling permissions or interaction state |
| Orange remains provisional | Committed comp and Tailwind configuration | Production-state extension | It is not part of the `PRODUCT.md` committed palette and requires token/contrast approval |
| Cream/ink dominate | `PRODUCT.md` and brand assets | Canvas and structure | Makes the seven-color palette disciplined rather than noisy |
| One accent leads per workspace | Color craft reference | Interaction hierarchy | Preserves brand range without competing calls to action |
| Bricolage/Fraunces/Poppins remain | `PRODUCT.md` and current code | Display/editorial/body | Shipping identity is more authoritative than older comp labels |
| Custom cursor becomes public-only | Current code plus craft accessibility | Brand play | Operators need native precision and predictable focus |
| Radix sits below WTF components | Official Radix docs and current bespoke gaps | Behavior only | Accessibility without surrendering visual authorship |
| TanStack powers table state only | Official TanStack docs | Headless data state | WTF retains markup, semantics, and visual language |
| Stories use Next/Vite | Official Storybook docs and current package | Isolated component proof | No current custom Webpack reason; RSC remains route-level |
| Motion is quieter internally | Motion craft reference | Feedback/continuity/hierarchy | Daily use rewards speed and restraint over spectacle |
| Episode is canonical workspace | Workbook/kickoff synthesis and provenance principle | Entity spine | Every downstream workflow can trace back to evidence |
| Missing data is unavailable, not zero | Existing RAG honesty and kickoff gaps | Evidence integrity | Prevents fabricated operational confidence |

## 21. Anti-Patterns

- Do not create fourteen equal home-page cards for fourteen modules.
- Do not make every status a different decorative color.
- Do not use purple outside knowledge/AI context.
- Do not wrap every section in a rounded white card.
- Do not hide operator state behind hover-only interactions.
- Do not retain the custom cursor inside authenticated workspaces.
- Do not auto-play non-essential motion in product views.
- Do not expose model/routing choices to public users.
- Do not collapse clean-cut and published-video time into one guessed timeline.
- Do not show internal work through public navigation or APIs.
- Do not use transcript mention as proof of guest, owner, employer, or lead.
- Do not add dependencies before an implementation phase owns their tests.
- Do not reproduce generic shadcn styling or create a competing palette.
- Do not use private source files, embedded drive links, or raw meeting text as
  runtime content or committed design examples.

## 22. GSD Handoff Contract

After owner approval of the milestone summary, GSD should treat this file as the
design input and `ISA.md` as acceptance. The milestone artifacts must:

- map every design-system and product requirement to stable requirement IDs;
- preserve the public/internal separation and provenance-first dependency order;
- identify which phase owns each dependency installation;
- include migration tests for every current component listed above;
- keep production/deployment and external integration changes separately gated;
- prove every completed phase against the corresponding ISA criteria.

Until that approval, `DESIGN.md` is ready research and design authority, while
`.planning/PROJECT.md`, `REQUIREMENTS.md`, and `ROADMAP.md` remain unpopulated.
