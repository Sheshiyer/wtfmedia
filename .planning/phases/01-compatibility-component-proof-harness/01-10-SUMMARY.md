# Plan 01-10 Summary — Episodes Rollback Seam

**Status**: COMPLETE
**Threats**: 3/3 passed (T-01-29, T-01-30, T-01-31)

## What was built

### Task 1: Legacy copy files
- `web/components/legacy/public/LegacyDragRow.tsx` — exact copy of DragRow.tsx with renamed export
- `web/components/legacy/public/LegacyEpisodesBrowser.tsx` — copy of EpisodesBrowser.tsx with adjusted imports
- `web/components/legacy/public/LegacyEpisodesPage.tsx` — copy of episodes/page.tsx with adjusted imports

### Task 2: Variant seam
- `web/lib/public/public-ui-variant.ts` — server-only variant selector reading `WTF_PUBLIC_UI_VARIANT` env var
- `web/components/domain/public/MigratedEpisodesPage.tsx` — behavior-equivalent candidate using current components
- `web/app/episodes/page.tsx` — wrapper that selects legacy (default) or migrated variant

### Task 3: Rollback proof
- `web/tests/rollback/episodes-variant.spec.ts` — 5 Playwright tests proving:
  1. Legacy variant serves /episodes with accepted content
  2. Selector not exposed in browser JS/DOM/URLs
  3. Navigation destinations preserved
  4. No path-segment episode route exists
  5. Query parameters preserved without selecting variant

### Port fix
- `web/playwright.config.ts` — webServer command now uses `PORT=4173` to match the port constraint (3000 held by foreign project)

### Correction ledger
- `web/tests/security/phase1-threat-corrections/01-10-baseline.json` — correction for T-01-29's one-shot snapshot hazard
- `web/scripts/run-phase1-threat.mjs` — added `CORRECTION_LEDGERS` array supporting multiple correction files

## Threat results

| Threat | Status | Notes |
|--------|--------|-------|
| T-01-29 | passed | Legacy copy verification (corrected from snapshot hazard) |
| T-01-30 | passed | Build + typecheck with variant seam |
| T-01-31 | passed | Rollback proof browser tests |

## Key decisions

- Default variant is `"legacy"` — zero behavior change unless `WTF_PUBLIC_UI_VARIANT=migrated` is set
- `[data-public-ui-variant="migrated"]` scopes all new policies — no legacy declarations touched
- Legacy copies are frozen snapshots — they do not import from domain components
- Correction ledger mechanism allows replacing broken threat commands while preserving audit trail
