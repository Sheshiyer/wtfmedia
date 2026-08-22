---
phase: 01-compatibility-component-proof-harness
plan: "11"
type: execute
wave: 11
depends_on: ["01-09", "01-23"]
files_modified:
  - web/components/domain/public/EpisodeDrawer.tsx
  - web/components/EpisodesBrowser.tsx
  - web/components/EpisodesBrowser.stories.tsx
  - web/tests/journeys/episodes.spec.ts
  - web/tests/journeys/focus.spec.ts
  - web/tests/journeys/motion.spec.ts
  - web/tests/security/phase1-threat-results/01-11.json
  - web/tests/rollback/verify.mjs
  - web/app/globals.css
autonomous: true
requirements: [COMP-01, COMP-02, COMP-04, DSYS-02, DSYS-04, DSYS-05, DSYS-06, DSYS-07, DSYS-08, DSYS-10, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06]
---

# Plan 01-11 Summary: EpisodesBrowser URL-State + ScrollRail + Drawer Migration

## Objective
Integrate and prove EpisodesBrowser with the URL-backed public-detail drawer over the completed ScrollRail/URL-state foundation.

## What Was Done

### Task 1: Migrate EpisodesBrowser into the accessible public EpisodeDrawer
- **EpisodeDrawer.tsx**: Created URL-controlled accessible public episode detail component
- **EpisodesBrowser.tsx**: Updated to consume URL-state and ScrollRail foundation from Plan 01-23
- **EpisodesBrowser.stories.tsx**: Added focused story interactions for valid/invalid ID, open/close/Escape, focus return/fallback, transcript states, safe source links, and responsive drawer modes
- **Threat T-01-33**: Recorded as failed (exit_status 1) - needs investigation

### Task 2: Prove Episodes stories, keyboard/focus, viewports, motion, privacy, performance, and rollback
- **episodes.spec.ts**: Fixed Ask link test selector (`a[href*="/chat"]` → `a[href*="/chat?q"]`)
- **focus.spec.ts**: Keyboard and focus journey tests (8 tests)
- **motion.spec.ts**: Motion and reduced-motion journey tests (8 tests)
- **verify.mjs**: Created rollback verification script for `npm run test:rollback`
- **globals.css**: Added `overflow-x: hidden` to `html` element to fix 320px viewport overflow
- **Threat T-01-34**: Recorded as passed (exit_status 0)
- **Threat T-01-35**: Recorded as passed (exit_status 0)

## Test Results

### Component Tests (EpisodesBrowser)
- 7 passed

### Browser Journey Tests
- **episodes.spec.ts**: 10 tests passed
- **focus.spec.ts**: 8 tests passed
- **motion.spec.ts**: 8 tests passed
- **Total**: 26 passed

### Privacy Tests
- 0 violations across 106 files

### Rollback Tests
- 5 passed (episodes-variant.spec.ts)

## Key Fixes

### 320px Viewport Overflow
- **Root cause**: `html` element had `overflowX: visible` while `body` had `overflowX: hidden`
- **Fix**: Added `overflow-x: hidden` to `html` in `web/app/globals.css`
- **Result**: `html.scrollWidth=320` at 320px viewport

### Rollback Test Script
- **Issue**: `npm run test:rollback` failed with `MODULE_NOT_FOUND` for `tests/rollback/verify.mjs`
- **Fix**: Created `tests/rollback/verify.mjs` that runs Playwright rollback tests based on `--route` parameter
- **Result**: Rollback tests now run successfully

## Threat Model Status

| Threat ID | Status | Notes |
|---|---|---|
| T-01-33 | failed | Needs investigation - exit_status 1 |
| T-01-34 | passed | All tests passed (component, browser, privacy, rollback) |
| T-01-35 | passed | All tests passed (component, browser, privacy, rollback) |

## Success Criteria Met
- EpisodesBrowser, ScrollRail, and URL-backed public drawer form the first accepted-quality migrated slice
- No path-segment route created
- Legacy variant rollback remains intact
- All automated contracts pass (except T-01-33 which needs investigation)
- Visual approval remains pending

## Files Modified
1. `web/components/domain/public/EpisodeDrawer.tsx` - URL-controlled accessible public episode detail
2. `web/components/EpisodesBrowser.tsx` - Updated to consume URL-state and ScrollRail
3. `web/components/EpisodesBrowser.stories.tsx` - Focused story interactions
4. `web/tests/journeys/episodes.spec.ts` - Fixed Ask link selector
5. `web/tests/journeys/focus.spec.ts` - Keyboard and focus journey tests
6. `web/tests/journeys/motion.spec.ts` - Motion and reduced-motion journey tests
7. `web/tests/security/phase1-threat-results/01-11.json` - Threat results
8. `web/tests/rollback/verify.mjs` - Rollback verification script
9. `web/app/globals.css` - Fixed 320px viewport overflow

## Next Steps
1. Investigate T-01-33 failure (exit_status 1)
2. Continue Phase 1: Execute remaining plans 01-12 through 01-20
3. Git commit Plan 01-11 changes (explicit paths only)
