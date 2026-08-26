---
phase: 02-platform-foundation-authenticated-policy-boundary
plan: "02"
subsystem: database
tags: [cloudflare-d1, wrangler, sqlite, migrations, audit]
requires:
  - phase: 02-platform-foundation-authenticated-policy-boundary
    provides: command-bound Phase 2 evidence harness
provides:
  - Forward-only operator and typed audit schema migrations
  - Idempotent approved roster bootstrap with one active super_admin invariant
  - Secret-free symbolic environment binding contract
affects: [02-03, 02-04, 02-05, 02-06, 02-12]
tech-stack:
  added: [Wrangler 4.95.0 local migration runtime]
  patterns: [migration-owned schema, partial unique super-admin index, symbolic environment contract]
key-files:
  created:
    - cloudflare/migrations/0001_ops_foundation.sql
    - cloudflare/migrations/0002_bootstrap_roster.sql
    - cloudflare/config/ops-environments.schema.json
    - cloudflare/tests/d1-migrations.test.mjs
  modified:
    - cloudflare/src/db.ts
    - cloudflare/src/schema.sql
    - cloudflare/package.json
key-decisions:
  - "Operator and audit persistence are migration-owned; runtime DDL is retired."
  - "Wrangler is pinned to 4.95.0 because 4.126 fails before local D1 SQL execution on this host."
patterns-established:
  - "D1 migrations: apply and list only with explicit --local or named remote environment flags."
  - "Protected environments: commit symbolic binding references only; provider IDs and values stay external."
requirements-completed: [AUTH-09, AUTH-10, QUAL-10, QUAL-12]
duration: 28min
completed: 2026-08-26
---

# Phase 02 Plan 02: D1 Foundation Summary

**Portable migrations now enforce active-role, audit-envelope, and single-super-admin invariants before protected routing is built.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-26T14:40:00+05:30
- **Completed:** 2026-08-26T15:08:00+05:30
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added forward-only operators and typed append-only audit migrations.
- Bootstrapped the seven approved identities with one `super_admin`, one `admin`, and five `editor` roles.
- Established static environment separation requirements without storing IDs, hostnames, or secret values.
- Retired runtime schema authority and made the DB layer require migrated tables.

## Task Commits

1. **Task 1: Create operator, audit, and environment migration contracts** - `f49efed` (feat)
2. **Task 2: Bootstrap the approved roster and remove runtime schema authority** - `ae4d5b6` (refactor)

**Compatibility fix:** `196eec5` (fix: pin the local Wrangler migration runtime)

## Files Created/Modified

- `cloudflare/migrations/0001_ops_foundation.sql` - Operators/audit tables, checks, indexes, and append-only update guard.
- `cloudflare/migrations/0002_bootstrap_roster.sql` - Idempotent approved roster plus active-super-admin deletion/demotion guards.
- `cloudflare/config/ops-environments.schema.json` - Distinct local/staging/production symbolic resources and unbound preview contract.
- `cloudflare/scripts/verify-ops-environments.mjs` - Rejects non-symbolic, shared, or value-bearing environment contracts.
- `cloudflare/src/db.ts` - Migration-dependent types and fail-closed legacy authority stubs.
- `web/tests/security/phase2-threat-results/02-02.json` - Persistent passed evidence for T-02-04 through T-02-06.

## Decisions Made

- Normalized lowercase email, recognized roles, active flags, and audit envelopes are database constraints instead of application conventions.
- A partial unique index prevents multiple active super administrators; bootstrap triggers prevent removal of the sole seat.
- All concrete environment identifiers and runtime values remain outside the repository.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pinned a compatible local Wrangler runtime**
- **Found during:** Task 1 local migration verification.
- **Issue:** Wrangler 4.126 failed at host process spawn before reading or applying migrations.
- **Fix:** Verified and pinned Wrangler 4.95.0, which applied and then listed both migrations locally without `--remote`.
- **Files modified:** `cloudflare/package.json`
- **Verification:** `npx --yes wrangler@4.95.0 d1 migrations apply/list DB --local --persist-to .wrangler/phase2-02-02 --config wrangler.jsonc`.
- **Committed in:** `196eec5`

---

**Total deviations:** 1 blocking tool-runtime compatibility fix.
**Impact on plan:** Restored the specified local-only migration proof with no provider mutation.

## Issues Encountered

- The legacy untracked public Worker configuration calls its current binding `DB`; the committed Phase 2 environment contract reserves distinct future `OPS_DB_*` symbols and does not alter that provider draft.

## User Setup Required

None - staging and production resource identifiers remain intentionally unconfigured.

## Next Phase Readiness

- Ready for the Wave 3 Access verifier, closed policy, and typed audit modules.
- No staging, production, identity-provider, or D1 remote mutation occurred.

---
*Phase: 02-platform-foundation-authenticated-policy-boundary*
*Completed: 2026-08-26*
