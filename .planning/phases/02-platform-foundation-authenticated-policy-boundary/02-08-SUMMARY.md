---
phase: 02-platform-foundation-authenticated-policy-boundary
plan: "08"
subsystem: nextjs-operator-shell
tags: [nextjs, rbac, accessibility, playwright, storybook]
requires:
  - phase: 02-platform-foundation-authenticated-policy-boundary
    provides: verified per-request operator context
provides:
  - Protected Control Room in a responsive role-projected shell
  - Recovery route that never re-enters the protected operator layout
  - Deterministic browser requests using short-lived HMAC-signed test context
affects: [02-09, 02-10, 02-11, 02-12]
tech-stack:
  added: []
  patterns: [route-group-protected-shell, signed-browser-context, focus-contained-drawer]
key-files:
  created: [web/app/(operator)/ops/layout.tsx, web/app/(operator)/ops/page.tsx, web/components/domain/ops/OperatorShell.tsx, web/components/domain/ops/OperatorNav.tsx, web/components/domain/ops/OperatorContextStrip.tsx, web/components/domain/ops/ControlRoomStatusLedger.tsx, web/stories/OperatorShell.stories.tsx]
  modified: [web/app/layout.tsx, web/middleware.ts, web/playwright.config.ts, web/tests/phase2/control-room.spec.ts]
key-decisions:
  - "Recovery is a sibling route, so a failed protected request cannot redirect through the protected layout again."
  - "Browser fixtures carry a short-lived HMAC-signed context instead of a test-only authorization bypass."
patterns-established:
  - "Below 1024px the Operations navigation is deliberately tested after opening its drawer."
requirements-completed: [AUTH-05, AUTH-08, QUAL-13]
duration: 43min
completed: 2026-08-26
---

# Phase 02 Plan 08: Control Room Summary

**The Control Room is a role-projected, responsive operator shell with truthful inactive status, not a simulated administration dashboard.**

## Verification

- `cd web && npm run typecheck` passed.
- `cd web && npx playwright test --grep-invert @visual tests/phase2/control-room.spec.ts --project=phase1-chromium-320 --project=phase1-chromium-768 --project=phase1-chromium-1440` passed: 9 tests.
- T-02-22 through T-02-24 passed through the Phase 2 threat runner.
- A direct local signed-context probe returned `200` for `/ops`; the unsigned recovery route returned `200` without a redirect loop.

## Next Phase Readiness

Ready for the Operators and Audit surfaces, which can reuse the verified shell and role-projected navigation.
