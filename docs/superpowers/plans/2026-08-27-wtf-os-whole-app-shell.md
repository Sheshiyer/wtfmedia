# WTF OS Whole-App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the WTF OS shell the default presentation across all current application routes while preserving public/protected authority boundaries and an explicit legacy rollback.

**Architecture:** A shared client-side `AppShell` owns route-aware rail/drawer presentation and receives only a pre-projected navigation model. `PublicShell` and `OperatorShell` become thin adapters so public and protected data authority stays server-owned. The root migrated page becomes a source-backed Control Room; the existing Episodes, Connections, Ask WTF, Operators, and Audit behaviors remain intact inside the converged shell.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Tailwind CSS 3.4, Radix Dialog, Vitest/Storybook browser tests, Playwright

**Spec:** `docs/superpowers/specs/2026-08-27-wtf-os-whole-app-shell-design.md`

## Global Constraints

- Default application version is `wtfos`; `legacy` remains server-only rollback.
- Preserve `/`, `/episodes`, `/connections`, `/chat`, `/api/chat`, and all protected route/API contracts.
- Presentation may converge; protected data, navigation, prefetch, and actions may not cross the existing authority boundary.
- Recovery remains outside application chrome and contains no protected state.
- Use Bricolage Grotesque, Fraunces, and Poppins with the committed cream/ink WTF palette.
- Do not add a generic shadcn visual layer, glass UI, equal feature-card grid, fake metric, fake health state, public model control, or new dependency.
- A future module is a labelled `not activated` ledger row, never a disabled route.
- Every interactive state includes semantic, keyboard, focus-visible, reduced-motion, 320px, 768px, and 1440px behavior.
- Preserve unrelated dirty work; use path-scoped staging and commits.

---

### Task 1: Canonical application version seam

**Files:**
- Create: `web/tests/contracts/app-ui-variant.contract.test.ts`
- Modify: `web/lib/public/public-ui-variant.ts`
- Modify: `web/app/layout.tsx`

**Interfaces:**
- Produces: `AppUiVariant = "legacy" | "wtfos"`
- Produces: `appUiVariant(): AppUiVariant`
- Preserves: `publicUiVariant()` as a temporary compatibility export returning `"legacy" | "migrated"`

- [ ] **Step 1: Write the failing variant contract test**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { appUiVariant, publicUiVariant } from "@/lib/public/public-ui-variant";

afterEach(() => delete process.env.WTF_PUBLIC_UI_VARIANT);

describe("WTF OS application version", () => {
  it("defaults the application to wtfos", () => {
    expect(appUiVariant()).toBe("wtfos");
  });

  it("keeps legacy as the explicit rollback", () => {
    process.env.WTF_PUBLIC_UI_VARIANT = "legacy";
    expect(appUiVariant()).toBe("legacy");
  });

  it("accepts migrated as a temporary compatibility alias", () => {
    process.env.WTF_PUBLIC_UI_VARIANT = "migrated";
    expect(appUiVariant()).toBe("wtfos");
    expect(publicUiVariant()).toBe("migrated");
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `cd web && npm run test:contracts -- tests/contracts/app-ui-variant.contract.test.ts`

Expected: FAIL because `appUiVariant` and `AppUiVariant` do not exist.

- [ ] **Step 3: Implement the canonical selector and update RootLayout**

```ts
export type AppUiVariant = "legacy" | "wtfos";
export type PublicUiVariant = "legacy" | "migrated";

export function appUiVariant(): AppUiVariant {
  return process.env.WTF_PUBLIC_UI_VARIANT === "legacy" ? "legacy" : "wtfos";
}

export function publicUiVariant(): PublicUiVariant {
  return appUiVariant() === "legacy" ? "legacy" : "migrated";
}
```

In `RootLayout`, use `appUiVariant()` for the shell decision, keep the server-selected value out of DOM attributes, and preserve the existing operator/recovery bypass.

- [ ] **Step 4: Verify GREEN**

Run: `cd web && npm run test:contracts -- tests/contracts/app-ui-variant.contract.test.ts && npm run typecheck`

Expected: variant tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add web/tests/contracts/app-ui-variant.contract.test.ts web/lib/public/public-ui-variant.ts web/app/layout.tsx
git commit -m "refactor: make WTF OS the default app version"
```

### Task 2: Semantic shell substrate

**Files:**
- Create: `web/tests/contracts/wtf-os-token-contract.test.ts`
- Modify: `web/tailwind.config.ts`
- Modify: `web/styles/tokens.css`
- Modify: `web/components/ui/Button.tsx`
- Modify: `web/components/ui/LinkButton.tsx`
- Modify: `web/components/ui/Drawer.tsx`

**Interfaces:**
- Produces Tailwind aliases: `canvas`, `foreground`, `surface-subtle`, `surface-raised`, `editorial`, `live`, `attention`, `knowledge`, `information`
- Produces font aliases: `display`, `heading`, `body`, `label`, `serif`
- Preserves the existing `wtf.*` aliases for older migrated consumers during convergence

- [ ] **Step 1: Write the failing token contract**

Read `web/tailwind.config.ts` as text and assert every semantic alias resolves through `var(--wtf-...)`, every component radius uses `--wtf-radius-control`, and shell files do not consume raw brand hex values.

```ts
expect(tailwind).toContain('canvas: "var(--wtf-canvas)"');
expect(tailwind).toContain('attention: "var(--wtf-attention)"');
expect(button).toContain("--wtf-radius-control");
expect(linkButton).toContain("--wtf-radius-control");
expect(drawer).toContain("--wtf-radius-control");
```

- [ ] **Step 2: Verify RED**

Run: `cd web && npm run test:contracts -- tests/contracts/wtf-os-token-contract.test.ts`

Expected: FAIL because top-level semantic aliases are missing and primitives use `--radius-control`.

- [ ] **Step 3: Add semantic aliases and repair primitives**

Map every top-level alias to the canonical CSS property; do not duplicate palette hex values. Normalize primitive radii to `var(--wtf-radius-control)` and use existing duration variables/classes.

- [ ] **Step 4: Verify GREEN**

Run: `cd web && npm run test:contracts -- tests/contracts/wtf-os-token-contract.test.ts && npm run typecheck`

Expected: token contract and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add web/tests/contracts/wtf-os-token-contract.test.ts web/tailwind.config.ts web/styles/tokens.css web/components/ui/Button.tsx web/components/ui/LinkButton.tsx web/components/ui/Drawer.tsx
git commit -m "fix: align WTF OS semantic shell tokens"
```

### Task 3: Shared route-aware AppShell

**Files:**
- Create: `web/components/shells/AppShell.tsx`
- Create: `web/components/shells/AppRail.tsx`
- Create: `web/stories/AppShell.stories.tsx`
- Modify: `web/components/patterns/PublicShell.tsx`
- Modify: `web/components/domain/ops/OperatorShell.tsx`
- Modify: `web/components/domain/ops/OperatorNav.tsx`

**Interfaces:**
- Produces:

```ts
export type AppNavItem = {
  href: string;
  label: string;
  section?: "workspace" | "administration";
};

export type AppShellProps = {
  children: React.ReactNode;
  navigation: readonly AppNavItem[];
  mode: "public" | "operator";
  utility?: React.ReactNode;
};
```

- Active matching: `/` is exact; all other destinations match exact or `href + "/"` descendants.

- [ ] **Step 1: Write failing AppShell stories**

Stories must assert:

```ts
expect(canvas.querySelector('[data-wtf-shell="wtfos"]')).not.toBeNull();
expect(canvas.querySelector('a[aria-current="page"]')?.textContent).toContain("episodes");
expect(canvas.querySelector('[data-shell-mode="public"]')).not.toBeNull();
```

Add a mobile story that opens the Radix drawer and asserts the same projected destinations are present, plus an operator story that contains only the supplied role-authorized links.

- [ ] **Step 2: Verify RED**

Run: `cd web && npm run test:components -- AppShell`

Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 3: Implement AppRail and AppShell**

Use the existing `Drawer`, `IconButton`, `SkipLink`, and migrated wordmark. The shell owns a 240px desktop ink rail, mobile ink header, warm paper content field, one restrained texture layer, active route semantics, and optional utility area. It must not import operator policy or DTO modules.

- [ ] **Step 4: Convert shell adapters**

`PublicShell` supplies exactly `/`, `/episodes`, `/connections`, and `/chat`. `OperatorShell` maps its already-projected `nav` prop into `AppNavItem[]` and supplies catalogue/sign-out utilities. Remove its bespoke focus trap and drawer controls because Radix now owns that behavior. Preserve `data-wtf-shell="migrated"` as a temporary compatibility marker nested inside the canonical `data-wtf-shell="wtfos"` root until the approved Phase 1 baseline suite is updated.

- [ ] **Step 5: Verify GREEN**

Run: `cd web && npm run test:components -- AppShell PublicShell OperatorShell && npm run typecheck`

Expected: component tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add web/components/shells web/components/patterns/PublicShell.tsx web/components/domain/ops/OperatorShell.tsx web/components/domain/ops/OperatorNav.tsx web/stories/AppShell.stories.tsx
git commit -m "feat: converge routes on the WTF OS shell"
```

### Task 4: Root Control Room and workspace header

**Files:**
- Create: `web/components/patterns/WorkspaceHeader.tsx`
- Create: `web/components/patterns/StatusLedger.tsx`
- Create: `web/stories/WorkspaceHeader.stories.tsx`
- Create: `web/stories/StatusLedger.stories.tsx`
- Modify: `web/components/domain/public/MigratedHomePage.tsx`
- Modify: `web/components/domain/ops/ControlRoomStatusLedger.tsx`
- Modify: `web/app/(operator)/ops/page.tsx`

**Interfaces:**
- Produces:

```ts
export type WorkspaceState =
  | "active"
  | "verified"
  | "unknown"
  | "unavailable"
  | "access-restricted"
  | "not-activated"
  | "stale";

export type StatusLedgerItem = {
  label: string;
  state: WorkspaceState;
  detail: string;
  href?: string;
  observed?: string;
};
```

- [ ] **Step 1: Write failing state-complete stories**

Assert that every state displays text in addition to color, active rows with `href` are links, not-activated rows are not interactive, and WorkspaceHeader renders exactly one primary action slot.

- [ ] **Step 2: Verify RED**

Run: `cd web && npm run test:components -- WorkspaceHeader StatusLedger`

Expected: FAIL because both patterns are missing.

- [ ] **Step 3: Implement patterns**

Use ink rules, cream/raised paper, status text, semantic links, and no card grid. `StatusLedger` must reject interaction for `not-activated`; availability is textual and structural.

- [ ] **Step 4: Replace the migrated home with the public-safe Control Room**

Compute only `episodeCount` and `showCount` from the current imported public dataset. Render:

- `run the show from the source` / `control room`;
- primary action `ask the catalogue` → `/chat`;
- active ledger rows for Episodes, Connections, and Ask WTF;
- individual `not activated` rows for Production, Analytics, People, and Integrations;
- a three-item recent episode evidence strip using current thumbnails/titles;
- a provenance panel explaining source-backed answers and verified timestamps.

Do not render fake task counts, health, owners, charts, or last-sync times.

- [ ] **Step 5: Converge the protected Control Room**

Use the same WorkspaceHeader and StatusLedger patterns. Derive Audit visibility from the role context; list future modules individually; remove the no-op refresh button until a real refresh endpoint exists. Keep the approved role-specific dominant action.

- [ ] **Step 6: Verify GREEN**

Run: `cd web && npm run test:components -- WorkspaceHeader StatusLedger MigratedHomePage OperatorShell && npm run typecheck`

Expected: component tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add web/components/patterns/WorkspaceHeader.tsx web/components/patterns/StatusLedger.tsx web/stories/WorkspaceHeader.stories.tsx web/stories/StatusLedger.stories.tsx web/components/domain/public/MigratedHomePage.tsx web/components/domain/ops/ControlRoomStatusLedger.tsx 'web/app/(operator)/ops/page.tsx'
git commit -m "feat: make the root route the WTF OS control room"
```

### Task 5: Workspace composition across existing routes

**Files:**
- Modify: `web/components/domain/public/MigratedEpisodesPage.tsx`
- Modify: `web/components/domain/public/MigratedConnectionsPage.tsx`
- Modify: `web/components/domain/public/MigratedChatPage.tsx`
- Modify: `web/tests/journeys/public-shell.spec.ts`
- Modify: `web/tests/journeys/home.spec.ts`

**Interfaces:**
- Consumes: `AppShell`, `WorkspaceHeader`, current public domain components and URL-state contracts
- Preserves: existing episode, connection, Ask WTF, source panel, chat streaming, citation, and query semantics

- [ ] **Step 1: Change browser assertions first**

For `/`, `/episodes`, `/connections`, and `/chat`, assert:

```ts
await expect(page.locator('[data-wtf-shell="wtfos"]')).toBeVisible();
await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(1);
await expect(page.locator('[data-workspace-header]')).toBeVisible();
```

Retain all existing route-specific behavior assertions.

- [ ] **Step 2: Verify RED**

Run: `cd web && npm run test:browser -- tests/journeys/public-shell.spec.ts tests/journeys/home.spec.ts`

Expected: FAIL because the canonical shell marker/workspace headers do not exist on every route.

- [ ] **Step 3: Add WorkspaceHeader to each migrated route**

Episodes uses the information accent and existing filters/results; Connections uses the evidence framing and accessible graph/list; Ask WTF uses knowledge purple only for scope/evidence. Do not duplicate page headings already emitted by domain components—move them into the shared header.

- [ ] **Step 4: Verify GREEN**

Run: `cd web && npm run test:browser -- tests/journeys/public-shell.spec.ts tests/journeys/home.spec.ts tests/journeys/episodes.spec.ts tests/journeys/connections.spec.ts tests/journeys/chat.spec.ts`

Expected: all selected browser journeys pass at their configured viewports.

- [ ] **Step 5: Commit**

```bash
git add web/components/domain/public/MigratedEpisodesPage.tsx web/components/domain/public/MigratedConnectionsPage.tsx web/components/domain/public/MigratedChatPage.tsx web/tests/journeys/public-shell.spec.ts web/tests/journeys/home.spec.ts
git commit -m "feat: align public workspaces with WTF OS"
```

### Task 6: Whole-app quality and rollback gate

**Files:**
- Modify: `web/tests/rollback/verify.mjs`
- Modify: `web/tests/rollback/home-variant.spec.ts`
- Modify: `web/tests/rollback/episodes-variant.spec.ts`
- Modify: `web/tests/rollback/connections-variant.spec.ts`
- Modify: `web/tests/rollback/chat-variant.spec.ts`
- Modify: `.project/HANDOFF.md`

**Interfaces:**
- Produces: tested `wtfos` default plus explicit `legacy` rollback receipt
- Preserves: protected data hashes and Phase 1/2 fail-closed verification

- [ ] **Step 1: Update rollback tests before the verifier**

Make the modern-side assertions require the canonical WTF OS marker and Control Room route copy, while the legacy side continues to require the preserved legacy shell. Assert the variant value is absent from DOM, URLs, cookies, and client storage.

- [ ] **Step 2: Verify RED**

Run: `cd web && npm run test:rollback`

Expected: FAIL until the verifier recognizes `wtfos` as the canonical modern version.

- [ ] **Step 3: Update the verifier**

Run the same route matrix with the default environment for `wtfos` and `WTF_PUBLIC_UI_VARIANT=legacy` for rollback. Retain before/after SHA-256 checks for protected data and reject any changed hash.

- [ ] **Step 4: Run the complete local gate**

```bash
cd web
npm run test:contracts
npm run test:components
npm run typecheck
npm run lint
npm run test:browser
npm run test:a11y
npm run test:rollback
npm run test:privacy
npm run build
```

Expected: every command exits 0 with no failures. Any existing unrelated failure is recorded exactly and does not become a false completion claim.

- [ ] **Step 5: Perform live browser verification**

At 320px, 768px, and 1440px, inspect `/`, `/episodes`, `/connections`, `/chat`, verified `/ops`, and `/ops/recover`. Capture the visible active states, drawer/focus behavior, shell continuity, and absence of horizontal overflow. Compare the result to the moodboard, app-flow, contact sheet, and Control Room references.

- [ ] **Step 6: Record the bounded handoff and commit**

Append exact local verification evidence, rollback result, remaining release gates, and the statement that no deployment/cutover occurred to `.project/HANDOFF.md`.

```bash
git add web/tests/rollback .project/HANDOFF.md
git commit -m "test: verify WTF OS whole-app convergence"
```
