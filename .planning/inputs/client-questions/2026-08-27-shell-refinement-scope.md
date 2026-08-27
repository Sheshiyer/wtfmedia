# Owner decision · WTF OS shell refinement scope

**Drafted:** 2026-08-27
**For:** Repository owner
**Blocks:** the next code-level PR against the shell
**Context:** the whole-app WTF OS shell exists in the **local working tree**
(`web/components/shells/`, untracked on `origin/main` until
`wtf-os-shell-materialize` lands). Committed `web/app/page.tsx` is still the
pre-migration home. The next pass is **density, hierarchy, and operator
affordance** inside the empty-Control-Room contract in Phase 2 decision D-19
and `02-UI-SPEC.md` (no fake counts, no invented health).
**Status:** draft-held. Owner pick recorded as A + B + D; no shell code ships
in this planning folder.

---

## Evidence surveyed

These paths describe the local uncommitted shell, not `origin/main`:

- `web/components/shells/AppShell.tsx` — fixed 60-wide rail on `lg`, mobile
  Drawer, SkipLink to `#wtf-main`.
- `web/components/patterns/StatusLedger.tsx` — four-column row, seven
  `WorkspaceState` variants, `not-activated` non-interactive.
- Local `web/app/page.tsx` is a dual-variant seam to `MigratedHomePage`.
  Tracked `web/app/page.tsx` on `origin/main` is still the pre-migration home.
- Operator Control Room contract: `.planning/phases/02-platform-foundation-authenticated-policy-boundary/02-UI-SPEC.md`
  and D-19 in `.planning/STATE.md`.

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
| A only | |
| A + B | |
| A + B + D | recorded 2026-08-27 |
| A + B + C + D | |
| None; wait for reference-design parity input | |
| Different — describe below | |

Local `AppRail` already implements B (`aria-current="page"` plus attention
fill). Remaining code PRs after shell-materialize: A, then D. C is not in
the pick.

## What we will not do beyond the pick

- No shell code in this planning folder. A, then D, wait for
  `wtf-os-shell-materialize` so they are not PRs against untracked files.
- No introduction of a count, health signal, or state variant beyond the
  existing seven `WorkspaceState` values.
- No addition of a data-fetching path from the shell surface.

---
*Draft-held. A + B + D is the recorded pick; B is already present locally.*
