# Owner decision · WTF OS shell refinement scope

**Drafted:** 2026-08-27
**For:** Repository owner
**Blocks:** the next code-level PR against the shell
**Context:** the whole-app WTF OS shell landed as the default (handoff
`.project/HANDOFF.md:477`), but the summary is explicit that "final
reference-design parity" has not been claimed. The next pass is **density,
hierarchy, and operator affordance** — inside the empty-Control-Room contract
already committed to in decision D-19 (no fake counts, no invented health).
**Status:** draft-held, awaiting owner pick

---

## Evidence surveyed

- Shell: [web/components/shells/AppShell.tsx](web/components/shells/AppShell.tsx) — 100 lines, fixed 60-wide rail (`w-60`) on `lg`, mobile Drawer, SkipLink to `#wtf-main`, radial dot texture layer.
- Status pattern: [web/components/patterns/StatusLedger.tsx](web/components/patterns/StatusLedger.tsx) — 128 lines, four-column row (label · state chip · detail · observed), seven `WorkspaceState` variants, `not-activated` intentionally non-interactive.
- Home: [web/app/page.tsx](web/app/page.tsx) — 19 lines, delegates to migrated Control Room.
- Ops workspaces: 10 files totalling 232 lines under [web/components/domain/ops/](web/components/domain/ops/), most of them thin (10–41 lines) — each still expects the empty-state envelope.

## The contract we are refining inside

From `.planning/STATE.md` decision `[Phase 02]`:

> "The first authenticated /ops release is a truthful empty Control Room
> showing environment, workspace, effective role, authorized navigation,
> live-derived service status, and one dominant setup action; missing systems
> use explicit unknown/offline/unavailable/permission-denied states, never
> fabricated health or misleading zeroes."

Every candidate below is designed to hold that contract. None introduces a
number, health signal, or count that does not exist.

## Candidates, ranked by operator value ÷ code size

### A · One dominant setup action, promoted (small, high value)

**Observation.** The StatusLedger renders every row with equal visual weight.
When most items are `unknown` or `not-activated` — which is the whole point
of the first release — a first-time operator cannot see which system to open
first. AUTH-05 already commits to "one dominant setup action" but the current
pattern does not express it.

**Change.** Add an optional `promoted` flag to `StatusLedgerItem`. The
promoted item renders in a full-width row above the divided list, with the
`observed` slot replaced by an explicit "do this next" affordance. Exactly
one item may be promoted per ledger; a runtime assertion in dev refuses two.
No change to any data source, no change to route structure.

**Files touched.** `StatusLedger.tsx`, one story fixture, one Control Room
consumer. Estimated diff: under 60 lines including story.

**Contract check.** Uses existing states only. Does not add a count. Uses
`observed` string that already comes from the caller.

### B · Rail active-route treatment (small, medium value)

**Observation.** Rail nav items rely on hover only (`hover:bg-attention`).
Need to confirm — but if the active route does not have a strictly stronger
treatment than hover, a keyboard-only user cannot tell where they are
without moving.

**Change.** Route-aware active state on rail links: solid `bg-attention`
with `border-l-4` accent and `aria-current="page"`. Hover becomes a lighter
tint so the two states are unambiguously distinct.

**Files touched.** `AppRail.tsx` (not yet read), one story per nav mode.
Estimated diff: under 40 lines.

**Contract check.** Interaction only. No data.

### C · Rail earns its width with a workspace summary strip (medium, medium value)

**Observation.** The 60-wide rail on `lg` is heavy for a five-item nav. A
compact identity strip at the bottom — environment, effective role, one
short authorization line — would let the width earn its keep and matches
AUTH-05's "environment, workspace, effective role, authorized navigation"
already committed to for the Control Room. Same content, just also mirrored
in the rail so it is present on every route.

**Change.** Add a `<RailIdentity>` slot at the bottom of `AppRail`, sourced
from the same server-side context provider that already feeds the Control
Room `<OperatorContextStrip>`. Read-only; no fetches; falls back to
`unknown` if the provider is absent (e.g. public shell).

**Files touched.** `AppRail.tsx`, new `RailIdentity.tsx`, story wiring,
`OperatorContextProvider.tsx` verification. Estimated diff: 100–150 lines.

**Contract check.** Renders only fields the provider already exposes; when
public, renders nothing. No fabricated status.

### D · Focus-return + drawer-close audit (small, high value)

**Observation.** DSYS-06 requires "focus returns predictably after overlays
close or routes change." The mobile Drawer opens on the hamburger button and
should return focus to that trigger on close. Need to verify — several
components use the same pattern, easy for one to have regressed.

**Change.** Add a Playwright interaction test that opens the Drawer via
keyboard, closes it via keyboard, and asserts focus is on the trigger. If
the assertion fails, patch the Drawer wiring; if it passes, we have
regression protection.

**Files touched.** One new test file; possibly Drawer wiring. Estimated
diff: under 80 lines.

**Contract check.** No visual change unless a bug is found. Test-only in
the happy path.

### E · Not now — density pass on the ledger row

Reducing the 4-column row to a more compact 3-column layout is tempting but
premature. Until we know how many rows a full Control Room shows in Phase 3
(likely 8–14), the density decision has no anchor. Defer.

## The ask

Pick one to start. If you pick a set, we ship them in the order listed above
(A → B → C → D), each as its own reviewable PR against the current shell.

| Option | Pick |
|---|---|
| A only | ⧗ |
| A + B | ⧗ |
| A + B + D | ⧗ |
| A + B + C + D | ⧗ |
| None; wait for reference-design parity input | ⧗ |
| Different — describe below | ⧗ |

## What we will not do without a pick

- No changes to `AppShell.tsx`, `AppRail.tsx`, `StatusLedger.tsx`, or any
  Control Room consumer beyond what a picked option scopes.
- No introduction of a count, health signal, or state variant beyond the
  existing seven `WorkspaceState` values.
- No addition of a data-fetching path from the shell surface.

---
*Draft-held. Repository will not be modified until you pick.*
