# WTF Media UI Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a truthful first UI-delivery wave: personal appearance controls, an editorial public home, an operator Settings scaffold, a local-only drag-capable production planner, a contrast-safe responsive navigation dock, a meaningful public idea atlas, and a safe global Ask WTF controls layer.

**Architecture:** A small client appearance context owns only a three-state visual preference and synchronizes it to the existing semantic-token root marker. Operator Settings is a server-rendered, read-only projection over hard-coded truthful states. The production planner keeps local React state but centralizes immutable movement rules in `lib/ops/production.ts` so pointer drag and keyboard movement use the same contract.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Tailwind 3 semantic tokens, Radix Dialog, Motion, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-wtfmedia-ui-wave1-design.md`

## Global Constraints

- Preserve the WTF cream/ink/offset-print design system and use semantic token classes only.
- `motion` may be installed only for the ReactBits-Dock-derived interaction; do not install any other visual catalog, calendar, or drag-and-drop dependency.
- Do not deploy, modify Cloudflare, access secrets, or imply provider/calendar synchronization.
- Keep `WTF_PUBLIC_UI_VARIANT=legacy` rollback and public route/API URLs unchanged.
- Settings is read-only and capability-scoped; no setting mutates an external system.
- Local production sketches must visibly say `local only · not synced`.

---

### Task 1: Appearance preference contract

**Files:**
- Create: `web/lib/public/appearance.ts`
- Create: `web/components/shells/AppearanceProvider.tsx`
- Create: `web/components/shells/AppearanceControl.tsx`
- Create: `web/tests/unit/appearance-preference.test.ts`
- Modify: `web/app/layout.tsx`

**Interfaces:**
- Produces `AppearancePreference = "system" | "light" | "dark"` and `normalizeAppearancePreference(value)`.
- Produces `AppearanceProvider` and `useAppearancePreference()` for shell consumers.
- Consumes the root `data-wtf-theme` attribute already mapped by `web/styles/themes.css`.

- [ ] Write a failing unit test that rejects `"violet"`, accepts all three valid values, and maps malformed storage to `system`.
- [ ] Run `npx vitest run tests/unit/appearance-preference.test.ts`; verify the test fails because the module is absent.
- [ ] Add the pure appearance module, then rerun the unit test to green.
- [ ] Write a failing browser test that chooses `dark`, reloads, and finds `html[data-wtf-theme="dark"]` plus an accessible selected control.
- [ ] Add the provider/control to the active WTF OS root without altering legacy rendering; run the focused browser test to green.

### Task 2: Shared utility shell and truthful operator Settings

**Files:**
- Modify: `web/components/shells/AppRail.tsx`
- Modify: `web/components/patterns/PublicShell.tsx`
- Modify: `web/components/domain/ops/OperatorShell.tsx`
- Create: `web/components/domain/ops/SettingsWorkspace.tsx`
- Create: `web/app/(operator)/ops/settings/page.tsx`
- Create: `web/tests/journeys/settings.spec.ts`

**Interfaces:**
- Consumes `AppearanceControl` from Task 1.
- Consumes existing operator context/policy guard patterns.
- Produces `/ops/settings`, restricted by the existing Settings capability policy.

- [ ] Write a failing browser test for the public rail/drawer appearance control and an authorized Settings route containing `local scaffold` and `not configured` cards.
- [ ] Run the focused Playwright spec; verify it fails because Settings does not exist.
- [ ] Implement public/operator rail utilities and the read-only Settings workspace using only truthfully unavailable states.
- [ ] Verify the Settings page exposes no provider endpoint, token, OAuth action, or mutation control.
- [ ] Run the focused spec across 320px and 1440px until green.

### Task 3: Editorial home recomposition

**Files:**
- Modify: `web/components/domain/public/MigratedHomePage.tsx`
- Modify: `web/tests/journeys/home.spec.ts`
- Modify: `web/tests/contracts/public-projection.contract.test.ts` only if the new DOM needs a public-contract assertion

**Interfaces:**
- Consumes the current `data.entries`, `WorkspaceHeader`, `StatusLedger`, and thumbnail helper.
- Produces a spotlight and source rail that use existing public DTO data only.

- [ ] Write a failing home journey assertion for a labelled source spotlight and an episode title drawn from existing catalogue data.
- [ ] Run the focused home spec and verify it fails against the equal-card composition.
- [ ] Recompose the home without changing data loading, route URLs, or source count semantics.
- [ ] Run the home spec and public-projection contracts to green.

### Task 4: Local colour-aware calendar and board movement

**Files:**
- Modify: `web/lib/ops/production.ts`
- Modify: `web/components/patterns/PostIt.tsx`
- Modify: `web/components/patterns/ProductionCalendar.tsx`
- Modify: `web/components/patterns/ProductionBoard.tsx`
- Modify: `web/components/domain/ops/ProductionWorkspace.tsx`
- Modify: `web/tests/unit/production-calendar.test.ts`
- Modify: `web/tests/phase2/production.spec.ts`

**Interfaces:**
- Extend `ProductionPin` with `tone` and immutable helpers `moveProductionPin(pins, id, patch)`.
- Calendar and board receive the same `onMove(id, patch)` callback.
- Keyboard movement uses the selected sketch plus pin-well date/column fields; pointer movement uses native drag events.

- [ ] Write a failing unit test proving movement changes only the named sketch and preserves its tone.
- [ ] Run the unit test; verify failure because the helper does not exist.
- [ ] Implement the minimal typed helper and run green.
- [ ] Write a failing browser test that creates a local sketch, selects it, moves it via the pin well, and sees `local only · not synced`.
- [ ] Add semantic tone selection, native pointer drag targets, and keyboard/pin-well movement.
- [ ] Run focused production browser and unit tests to green at 320px and 1440px.

### Task 5: Handoff, client clarification, and verification packet

**Files:**
- Create: `docs/design/ui-wave1-handoff.html`
- Create: `docs/handoffs/2026-08-29-ui-wave1-handoff.md`
- Create: `.planning/inputs/client-questions/2026-08-29-ui-wave2-integration-clarifications.md`
- Modify: `ISA.md`
- Modify: `.project/HANDOFF.md`

**Interfaces:**
- Documents cite only repository-relative paths and evidence states.
- The client-questions packet names an owner, required decision, blocked phase, and safe default for each integration gate.

- [ ] Create the human-readable handoff and static HTML flow packet after code evidence exists.
- [ ] Add the owner-facing Wave 2 decision table without private links, credentials, or inferred external state.
- [ ] Append Wave 1 acceptance evidence and a precise resume point to the project ISA and handoff.
- [ ] Run `npm --prefix web run typecheck`, focused Vitest, focused Playwright, privacy scan, and build before recording final evidence.

### Task 6: Additive responsive shell, idea atlas, and safe global controls

**Files:**
- Create: `web/components/shells/AppDock.tsx`
- Create: `web/components/shells/GlobalCommandSurface.tsx`
- Modify: `web/components/shells/AppShell.tsx`
- Modify: `web/components/domain/public/MigratedConnectionsPage.tsx`
- Modify: `web/components/ConnectionGraph.tsx`
- Modify: `web/components/domain/public/MigratedChatPage.tsx`
- Create: `web/tests/journeys/shell-controls.spec.ts`

**Interfaces:**
- The desktop dock offers visible, semantic route labels and opens the global controls surface.
- Global controls may only navigate, set local appearance, or route a source question to `/chat`; the capability register is declarative and non-mutating.
- Connections renders one graph plus semantic index, selected source receipt, and factual overlap list from the existing public projection.

- [x] Replace the fixed desktop rail without changing public or protected route URLs.
- [x] Add the global command surface with keyboard invocation and a non-secret capability register.
- [x] Replace duplicated Connections cards with the searchable public atlas and source receipt.
- [x] Add browser coverage for desktop dock command flow, dark rendered contrast, and mobile viewport containment.

## Plan self-review

- Coverage: Tasks 1–4 map to every Wave 1 deliverable; Task 5 maps to the requested handoff and clarification artifacts.
- Exclusions: Cloudflare, secrets, uncut source data, ranking, OAuth, provider state, canonical calendar storage, and sync are explicitly deferred.
- No placeholders: all tasks name files, interfaces, red/green proof, and delivery constraints.
