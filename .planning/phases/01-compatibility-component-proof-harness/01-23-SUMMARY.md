---
phase: 01-compatibility-component-proof-harness
plan: "23"
status: complete
completed_at: "2026-08-23"
threat_results: "web/tests/security/phase1-threat-results/01-23.json"
---

# Plan 01-23 Summary — URL-State, ScrollRail, Suspense Foundation

## Outcome

The Episodes URL-state, native ScrollRail, and server/Suspense foundation
are now proven. Selection is expressed as `?episode=<public-video-id>`
on `/episodes`, preserving unrelated query keys. Back/Forward/refresh/
share reproduce the same selection. ScrollRail provides native overflow
with labelled controls, keyboard/touch/wheel paths, and immediate
reduced-motion handling. The migrated Episodes server boundary wraps
the client query consumer in Suspense without creating a path-segment
episode route. Threat T-01-32 passed:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-32 | 1 | build + url-state journey tests + forbidden-route assertion | passed |

## What was produced

### Task 1 — URL-backed native Episodes navigation foundation

- `web/lib/public/url-state.ts`: Typed URL-state helpers —
  `readEpisodeParam`, `buildEpisodeSearch`, `pushEpisode`,
  `replaceClearEpisode`, `replaceEpisode`. Uses `pushState` for
  in-page open, `pushState` for close/clear. Preserves unrelated
  query parameters. Allowlisted public video IDs only.

- `web/components/patterns/ScrollRail.tsx`: Native overflow-x
  horizontal rail with labelled previous/next controls, keyboard
  (ArrowLeft/Right, Home/End), touch (native scroll), wheel
  (horizontal or Shift+vertical), start/end disabled states,
  visible focus, and immediate reduced-motion handling via
  `prefers-reduced-motion` media query check.

- `web/components/domain/public/MigratedEpisodesPage.tsx`: Server
  component wrapping EpisodesContent in Suspense with
  EpisodesSkeleton fallback. Uses `groupByPlaylist(data.entries)`.
  Variant selector remains server-only.

- `web/components/domain/public/EpisodesContent.tsx`: Client
  component that reads `?episode=<public-video-id>` from the URL
  and manages episode selection via push/replace history. Uses
  ScrollRail and Drawer. Contains EpisodeDetailDrawer with
  transcript loading (JSON then TXT fallback), "Ask about this
  episode" link to `/chat`, and YouTube watch link.

- `web/tests/journeys/url-state.spec.ts`: 10 Playwright journey
  tests across 3 describe blocks — url-state episode selection
  (6 tests: no param, direct load, click updates URL, close
  removes param, Back button, unrelated params preserved),
  ScrollRail accessibility (3 tests: labelled controls, region
  label, keyboard navigable), no dynamic episode route segments
  (1 test: documentation).

### Configuration change

- `web/playwright.config.ts`: Added `WTF_PUBLIC_UI_VARIANT=migrated`
  to the webServer command so Playwright tests run against the
  migrated variant. This was necessary because the threat runner
  rejects environment variable assignments in command strings.

## Notes for next wave

- Plan 01-11 can now integrate the public EpisodeDrawer against
  a complete, typed, browser-proven navigation foundation.
- URL-state helpers and ScrollRail expose stable typed contracts
  that later plans consume directly.
- The server/Suspense boundary compiles and the variant selector
  remains server-only — no path-segment episode route exists.
- All 10 journey tests pass at 320, 768, and 1440 viewports.

## Commits

- Pending: feat(01-23): URL-state, ScrollRail, Suspense foundation
