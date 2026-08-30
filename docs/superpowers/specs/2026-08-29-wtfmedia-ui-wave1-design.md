# WTF Media UI Wave 1 Design

## Purpose

Deliver a visibly complete first production-app layer without representing planned infrastructure as live. This wave makes the existing WTF OS shell more personal and usable, turns the public home into an editorial workspace rather than a generic catalogue landing, gives operators a truthful Settings scaffold, and upgrades the existing local production sketchpad.

**Additive refinement (2026-08-29):** the approved contrast, responsive-shell, Connections, and global Ask WTF work extends this wave. It does not replace the Cloudflare migration, Phase 3 provenance work, or any existing GSD phase.

## Reference lock

The direction is **WTF OS printroom**: warm cream paper, dense ink structure, restrained texture, offset-print depth, and one semantic accent per workspace. Public rooms may be expressive and image-led; operator rooms remain dense, calm, and factual. The governing product line remains **receipts become actions**.

The source references are [DESIGN.md](../../../DESIGN.md), the Phase 2 UI contract, `docs/design/APP-FLOW.md`, and the existing WTF OS components. ReactBits remains a source of isolated visual primitives only; its Dock interaction is adapted to the semantic WTF shell with visible labels and keyboard navigation. `motion` is the sole added motion dependency. MotionSites is not a Wave 1 dependency.

## Non-goals and truth boundary

- Do not merge or alter `codex/cloudflare-web-migration`, deploy a Worker, attach a hostname, or modify a Cloudflare binding.
- Do not hand over, read, or serialize `EDGE_SHARED_SECRET` or another credential.
- Do not represent uncut media, provenance alignment, ingestion, Vectorize re-indexing, provider/OAuth health, calendar synchronization, or a release as active.
- Do not move source-timeline alignment into Settings. Episode provenance belongs to the protected Episode workspace; Settings holds release and integration history only.
- Do not install a drag-and-drop, calendar, shadcn, ReactBits Pro, or MotionSites dependency. The local planner uses repository components and native browser drag events; `motion` is limited to the semantic Dock interaction.
- Do not turn public source chat into a remote operator endpoint. Global controls may navigate or change browser-local appearance, but they must not execute infrastructure actions or expose configuration.
- Do not treat an internal-beta note or disposition as a durable operational audit, Cloudflare update, D1 record, or release approval. Those remain separately authenticated and evidence-gated.

## Information architecture

### Shared shell

`AppShell` remains the sole navigation owner. On desktop, a ReactBits-Dock-derived, label-visible command dock replaces the fixed left rail; on mobile, the existing accessible drawer remains the navigation fallback. The shell gains a small, persisted appearance control with three explicit choices: `system`, `light`, and `dark`. The preference is stored only in `localStorage` as a visual preference and is applied to `document.documentElement.dataset.wtfTheme`; it contains no identity, provider, or session state. The server continues to default to `system`, preserving safe first paint and the legacy rollback path.

The mobile drawer exposes appearance and a clear local-product status. The desktop dock opens a global Ask WTF controls surface that performs only local navigation and appearance changes, and reads from a declarative capability register. The UI must never infer an operator name, account email, connected provider, or privileged operation result.

### Connections and global Ask WTF

`/connections` is a public **idea atlas**, not a secondary dashboard. One graph, one searchable semantic index, and one selected-idea receipt expose public episode counts, direct overlaps, and published links without ranking or duplicating the same data across cards.

Global Ask WTF is a controls layer, separate from `/chat`. `/chat` remains source-answering only. The controls layer can open a route, update local appearance, or submit a source question; it lists the current edge retrieval, uncut, and calendar limitations as unavailable capabilities. It never receives a secret, calls a provider, invokes a Worker command, changes infrastructure, or claims integration health.

### Home

`/` becomes an asymmetric public operating surface:

1. Existing `WorkspaceHeader` carries the public scope, verified catalogue counts, and Ask WTF action.
2. A concise activation ledger shows only public rooms plus explicit inactive workspaces.
3. A large **source spotlight** uses an existing public episode record, its actual thumbnail, and no inferred workflow state.
4. A compact source rail retains real recently indexed episodes without a three-equal-card dashboard layout.

### Settings

`/ops/settings` is a protected, read-only administrative scaffold with five sections:

1. Appearance — the shared preference control.
2. Agentic connections — all cards are explicitly `not configured`; none show an endpoint, token, account, or fabricated last-check time.
3. Client setup — copy-only, secret-free instructions for Codex and Cursor. Rendering or copying cannot execute a command.
4. Release and history — `local scaffold`, the repository package version, and no publication claim.
5. Future OTA — explicitly `not supported`.

The route follows existing capability policy. It must render a safe permission-denied/recovery path rather than exposing configuration to unauthorised roles.

### Local production planner

The existing protected `/ops/production` calendar and board remain a **local sketch mode**. A sketch carries an explicit semantic tone, stage label, selected day, and board column. Pointer drag can move a sketch between calendar days and board columns. Keyboard users can select a sketch and use the existing pin well to move it to the selected date/column. Every surface labels the data `local only · not synced`; refreshing or switching devices loses the sketch. No external calendar claim is made.

The same protected workspace carries an **internal beta review** lane for known local discrepancies. Each item shows its source, scope, field under review, observed condition, and recommended next action. An operator may choose a disposition and add a review note; that input persists only in the current browser's local storage and is visibly labelled `not a shared audit record`. The lane makes gaps discussable without changing the Cloudflare suite, route policy, D1, or release state.

## Components and interfaces

| Unit | Responsibility | Key contract |
| --- | --- | --- |
| `lib/public/appearance.ts` | parse, resolve, and persist safe appearance values | accepts only `system`, `light`, `dark` |
| `AppearanceProvider` | document synchronization and React context | no server secret or account data |
| `AppearanceControl` | accessible three-choice UI | visible selected state and labels |
| `AppRail` / `AppShell` | place shared utility surfaces | desktop rail plus mobile drawer parity |
| `AppDock` | desktop global route navigation | ReactBits-Dock-derived interaction with visible labels |
| `GlobalCommandSurface` | safe global navigation, appearance, and capability register | no remote action or configuration exposure |
| `MigratedConnectionsPage` | public idea atlas and selected source receipt | one public projection, no inferred rank or relationship claim |
| `SettingsWorkspace` | static, truthful settings content | no mutation/network effect |
| `MigratedHomePage` | editorial home composition | existing catalogue records only |
| `lib/ops/production.ts` | immutable sketch movement rules | local `ProductionPin` data only |
| `ProductionCalendar` / `ProductionBoard` | pointer drag targets | moving changes only local component state |
| `ProductionWorkspace` | selection, pin well, and explicit local badge | keyboard move remains available |
| `InternalBetaReview` | actionable, field-level internal beta discrepancy cards | browser-local disposition/note only; never shared audit authority |

## Acceptance criteria

- Appearance controls expose `system`, `light`, and `dark`, persist only that preference, and update the root theme attribute.
- The desktop rail and mobile drawer expose the same public appearance control.
- The home composition uses current episode data and contains no invented counts, owners, status, or timestamps.
- Settings reports each unavailable provider/OTA/release state truthfully and contains no credential material.
- Production sketches preserve their selected semantic tone when moved; pointer and keyboard movement remain local-only.
- The internal beta review lane exposes the known Cloudflare dependency and policy discrepancies with source, scope, field, observation, and recommended action.
- A beta disposition and note survive a browser reload while the UI states that they are not a shared audit or release record.
- The desktop Dock and mobile header retain visible, keyboard-accessible global navigation without a fixed desktop rail.
- Dark mode uses semantic colors on rendered dock, atlas index, and selected source receipt; browser contrast checks cover the active surfaces.
- Connections exposes one searchable public idea atlas and a source receipt rather than repeated rankings or category cards.
- Global Ask WTF controls can operate only safe in-app commands; its capability register reports unavailable infrastructure truthfully.
- `/`, `/episodes`, `/connections`, `/chat`, `/api/chat`, existing operator routes, and legacy rollback stay compatible.
- Tests cover pure appearance/planner rules and browser flows cover appearance, Settings access, home, calendar movement, focus, narrow viewport, and reduced-motion-safe controls.

## Deferred gates

| Deliverable | Gate | Required evidence before activation |
| --- | --- | --- |
| Cloudflare Ask WTF service binding | secure secret handoff | safe 200 stream and safe unauthenticated failure |
| Uncut playback | Phase 3 source mapping and privacy review | signed media projection plus verified timeline alignment |
| Retrieval/ranking/rubric updates | editorial evaluation set | labelled 20-query results and agreed scoring threshold |
| Calendar sync | canonical schedule and OAuth decision | provider, timezone, conflict, retention, audit, revocation evidence |
| Agent/provider/MCP settings | server-side verification records | audited DTO, safe error state, no credential exposure |
| Privileged global commands | authenticated action contract and audit trail | explicit authorization, server enforcement, and no-secret browser DTO |
