# Plan 01-14 — Connections Dual-Variant Seam + GraphWithList Pattern

## Outcome

All three tasks completed successfully. The `/connections` route now has:
- A `GraphWithList` pattern component with canvas (aria-hidden) + semantic list for keyboard/screen-reader parity
- Dual-variant seam (legacy/migrated) with server-only selector, no browser leakage
- Full journey test coverage (12 tests), rollback proof (4 tests), and privacy scan (0 violations)

## Threat Results

| Threat | Task | Status | Evidence |
|--------|------|--------|----------|
| T-01-42 | 1 | passed | Storybook stories render without error, all data-testid attributes present |
| T-01-43 | 2 | passed | Public projection contract tests pass, privacy scan 0 violations |
| T-01-44 | 3 | passed | Component tests (4), journey tests (12), privacy scan (0 violations), rollback proof (4) |

## Files Created/Modified

### Task 1 — GraphWithList Pattern
- `web/components/patterns/GraphWithList.tsx` — Canvas + semantic list pattern with shared selection state
- `web/components/patterns/GraphWithList.stories.tsx` — 4 stories (Default, ReducedMotion, PreSelected, KeyboardOnly)

### Task 2 — Dual-Variant Seam
- `web/components/domain/public/MigratedConnectionsPage.tsx` — Migrated variant using GraphWithList
- `web/components/domain/public/ConnectionsContent.tsx` — Content component with public projection

### Task 3 — Journey + Rollback Tests
- `web/tests/journeys/connections.spec.ts` — 12 Playwright journey tests
- `web/tests/rollback/connections-variant.spec.ts` — 4 rollback proof tests
- `web/tests/rollback/verify.mjs` — Added `/connections` route mapping

## Verification

```bash
# Full threat command (all pass):
cd web && npm run test:components -- GraphWithList && npm run test:browser -- tests/journeys/connections.spec.ts && npm run test:privacy -- --check && npm run test:rollback -- --route=/connections
```

## Accessibility

- Canvas is `aria-hidden="true"` and `tabindex="-1"` — not keyboard-reachable
- Semantic list buttons have `aria-pressed` for selection state
- All text uses `/61` opacity for 4.5:1 contrast ratio
- Keyboard navigation: Enter/Space select, Tab navigates
