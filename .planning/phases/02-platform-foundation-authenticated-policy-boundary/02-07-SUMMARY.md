---
phase: 02-platform-foundation-authenticated-policy-boundary
plan: "07"
subsystem: nextjs-operator-lifecycle
tags: [nextjs, authorization, recovery, cloudflare-access, no-store]
requires:
  - phase: 02-platform-foundation-authenticated-policy-boundary
    provides: signed Cloudflare protected-origin context
provides:
  - Server-only verification and per-request operator authorization context
  - Closed activated navigation and protected cache namespace helpers
  - Non-leaking recovery, validated return target, and Access-only logout path
affects: [02-08, 02-09, 02-10, 02-11, 02-12]
tech-stack:
  added: [server-only]
  patterns: [hmac-verified-origin-context, request-scoped-react-cache, public-safe-recovery]
key-files:
  created: [web/lib/ops/context.ts, web/lib/ops/policy.ts, web/lib/ops/dto.ts, web/lib/ops/cache.ts, web/lib/ops/return-to.ts, web/app/ops/recover/page.tsx]
  modified: [web/lib/auth.ts, web/lib/auth/session.ts, web/middleware.ts]
key-decisions:
  - "Next.js accepts only a time-limited HMAC-verified edge context; it never decodes an Access JWT."
  - "Recovery discards protected browser keys and retains only canonical `/ops` destinations."
patterns-established:
  - "The test-unit adapter maps plan-standard --grep to Vitest's named-test filter."
requirements-completed: [AUTH-01, AUTH-02, AUTH-04, AUTH-06, AUTH-07, QUAL-07, QUAL-12]
duration: 24min
completed: 2026-08-26
---

# Phase 02 Plan 07: Next.js Operator Lifecycle Summary

**The unsigned application session and header/JWT shortcuts are gone; protected Next.js work now needs a fresh signed edge context.**

## Verification

- `cd web && npm run test:unit -- operator-lifecycle --grep redirect` passed.
- `cd web && npm run typecheck` passed.
- `cd web && npm run test:browser -- tests/phase2/operator-lifecycle.spec.ts` passed: recovery and logout surface tests.
- T-02-19 through T-02-21 passed through the Phase 2 threat runner.

## Next Phase Readiness

Ready for the dependent Control Room shell and the parallel Operators/Audit administration screens.
