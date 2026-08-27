# Plan 01-12 Summary

**Status**: COMPLETE
**Completed**: 2026-08-22
**Commit**: 5aaebd4

## What Was Done

### Task 1: Retain accepted shell + add server-selected migrated shell boundary
- Created `LegacyPublicShell.tsx` — byte-preserving rollback shell with original CustomCursor, WordmarkMini imports, legacy nav labels ("Control Room", "Episodes", "Connections", "Ask WTF"), internal/engine footer copy
- Created `PublicShell.tsx` — migrated shell with skip link, responsive nav, semantic tokens, `data-wtf-shell="migrated"` scope marker, inert brand slot, public-only footer ("55 episodes indexed", "allthingswtf.com")
- Layout.tsx already selects between shells via `publicUiVariant()` (from Plan 01-22)

### Task 2: Implement responsive public navigation and shell semantics
- Created `PublicNav.tsx` — bounded client island for pathname-based `aria-current="page"`, route-focus behavior, responsive 2x2/one-row layout
- Destinations: `/` (home), `/episodes` (episodes), `/connections` (connections), `/chat` (ask wtf)
- Home uses exact match; others use `startsWith` for active detection

### Task 3: Prove shell states across routes/viewports/keyboard
- Created `PublicShell.stories.tsx` — 10 stories covering structure, skip link, active routes, scope marker, inert brand slot, public-only footer, no-legacy-imports proof
- Created `public-shell.spec.ts` — 26 journey tests across 4 routes × 3 viewports (320/768/1440)
- Tests: shell structure, skip link, keyboard tab order, aria-current, focus-visible, overflow, axe (serious/critical), privacy (forbidden DOM patterns), legacy rollback smoke
- All threats passed: T-01-36, T-01-37, T-01-38

## Key Decisions

1. **Brand-asset exception**: Footer "f" uses `#0C8167` (WCAG AA 4.51:1) instead of `var(--wtf-live)` which is `#0c9367`
2. **Public-only footer**: Migrated shell footer shows user-facing copy only; forbidden terms (NVIDIA, llama, nv-embedqa, chunks indexed, Internal build) are excluded
3. **Inert brand slot**: `<div data-wtf-brand-slot="inert" aria-hidden="true" className="hidden" />` retained for structural compatibility
4. **Client island boundary**: PublicNav is the only `"use client"` component — everything else is server component

## Files Created

- `web/components/legacy/public/LegacyPublicShell.tsx` (96 lines)
- `web/components/patterns/PublicShell.tsx` (111 lines)
- `web/components/patterns/PublicNav.tsx` (49 lines)
- `web/stories/PublicShell.stories.tsx` (244 lines)
- `web/tests/journeys/public-shell.spec.ts` (216 lines)

## Threat Results

| Threat | Status | Evidence |
|--------|--------|----------|
| T-01-36 | passed | Build + contracts pass |
| T-01-37 | passed | Component tests + typecheck + lint + legacy presentation check |
| T-01-38 | passed | All 36 browser tests + privacy scan + rollback verification |
