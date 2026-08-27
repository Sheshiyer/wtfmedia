---
phase: 01-compatibility-component-proof-harness
plan: "09"
status: complete
completed_at: "2026-08-22"
threat_results: "web/tests/security/phase1-threat-results/01-09.json"
---

# Plan 01-09 Summary — Accessible Primitives

## Outcome

Seven semantic-token-only primitives now exist as the repository-owned
accessible foundation for Episodes and all later protected public routes.
No shadcn visual layer, no generic kit styling — pure behavior with WTF
tokens. All threat probes passed:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-28 | 1 | actions/links/skip/focus tests + typecheck + lint | passed |
| T-01-27 | 2 | availability/live-region tests + typecheck + lint | passed |
| T-01-26 | 3 | all Phase1Primitives tests + typecheck | passed |

## What was produced

### Task 1 — action primitives

- `web/components/ui/Button.tsx`: primary/secondary/ghost variants,
  loading (disabled + aria-busy), disabled, pressed toggle (aria-pressed).
  44px minimum touch target, two-layer focus ring, forwardRef.
- `web/components/ui/IconButton.tsx`: accessible name via aria-label,
  same focus/touch contracts as Button.
- `web/components/ui/LinkButton.tsx`: external links open in new tab
  with `rel="noreferrer noopener"`. Unsafe protocols (javascript:,
  data:) render as disabled spans, not anchors.
- `web/components/ui/SkipLink.tsx`: first focusable element, targets
  `#public-main`, visible on focus.

### Task 2 — state and live semantics

- `web/components/ui/AvailabilityState.tsx`: closed union of 11 states
  (unknown, unavailable, stale, partial, empty, permission-denied,
  error, offline, unmapped, conflicted, measured-zero). Each state has
  visible label, explanation, remaining behavior, and recovery path.
  permission-denied never confirms a protected record exists. Non-color
  semantic indicators (icon prefixes + data-availability attribute).
- `web/components/ui/LiveRegion.tsx`: polite (role=status) and
  assertive (role=alert) ARIA live regions. sr-only, aria-atomic.
  Never streams per-token updates — content is stable per meaningful
  state change.

### Task 3 — Drawer (Radix Dialog backing)

- `web/components/ui/Drawer.tsx`: built on `@radix-ui/react-dialog`.
  Labelled modal with focus containment, Escape and backdrop dismiss.
  Responsive: full viewport at 320px, right-edge bounded at 768px
  (400px) and 1440px (420px). Left/right side support. Optional
  description via `aria-describedby`. Close button meets 44px minimum
  touch target. Uses semantic tokens only — no shadcn visual layer.

### Storybook interaction tests

- `web/stories/Phase1Primitives.stories.tsx`: 17 interaction tests
  covering keyboard navigation, loading/disabled/pressed states,
  accessible names, unsafe protocol blocking, skip-link focus order,
  all 11 availability states, permission-denied safety, measured-zero
  distinction, live-region politeness, bounded announcements, drawer
  labelling, description, and side variants.
- Drawer stories use `within(document.body)` pattern for Radix Portal
  rendering (outside Storybook canvas scope).

### Consequential deviations (disclosed)

1. **Color contrast fix**: `text-ink/50` (3.28:1) failed axe 4.5:1
   threshold on AvailabilityState remaining-behavior text. Bumped to
   `text-ink/70` to clear WCAG-AA.
2. **Test assertion fix**: LiveRegionNoTokenStreaming regex
   `/\w{1,2}$/` matched any text ending with 1-2 word chars (false
   positive on "ready"). Replaced with word-count check (>= 2 words).

## Notes for next wave

- Primitives are consumed by later plans (01-11 Episodes domain
  components, 01-12+ protected routes) — not yet wired to any route.
- Drawer requires `@radix-ui/react-dialog` (installed this session).
- Portal-based components (Drawer) need `within(document.body)` in
  Storybook tests — document this pattern for future consumers.
- All primitives use named exports + forwardRef where focus
  restoration requires them.

## Commits

- `9507207` feat(01-09): accessible primitives — Button, IconButton,
  LinkButton, SkipLink, AvailabilityState, LiveRegion, Drawer
