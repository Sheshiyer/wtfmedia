# WTF Media UI Wave 1 Handoff

## Scope

This handoff covers the approved UI-only Wave 1 in branch `codex/wtfmedia-ui-wave1`. It is deliberately independent of the dirty primary checkout and the separate Cloudflare web migration worktree.

## Product result

| Surface | Wave 1 result | Truth boundary |
| --- | --- | --- |
| Shared shell | system/light/dark preference, mobile drawer, and ReactBits-Dock-derived desktop navigation | preference is local visual state only; Dock has no remote action |
| Public home | editorial source spotlight and activation ledger | catalogue data only; no production claims |
| Settings | read-only appearance, connection, client setup, release, and OTA information | no token, endpoint, OAuth, or mutation control |
| Production | local coloured sticky sketches, pointer drag, keyboard move, and two source-labelled beta discrepancy cards | sketches and review notes are browser-local; never represented as synchronized, audited, or release-authoritative |
| Connections | searchable public idea atlas and selected source receipt | only public topic/episode/overlap projection; no inferred ranking or relationships |
| Ask WTF | source chat plus global safe-controls surface | source chat remains public; controls expose no secret, provider, or remote action |

## Runtime and release status

- Cloudflare preview: separately deployed OpenNext Worker, observed HTTP 200 during design audit.
- Cloudflare web migration branch: `codex/cloudflare-web-migration` at `4154a2a`; not merged by this wave.
- Main checkout: retains user-owned Phase 3/architecture drafts; untouched.
- This branch: local code/docs only. No deployment, provider, OAuth, D1, R2, Vectorize, queue, access policy, secret, hostname, or registry mutation is included.

## Verification commands

Run from `web/` after dependencies are installed:

```bash
npm run typecheck
npx vitest run tests/unit/appearance-preference.test.ts tests/unit/production-calendar.test.ts
npx playwright test tests/journeys/home.spec.ts tests/journeys/connections.spec.ts tests/journeys/appearance.spec.ts tests/journeys/shell-controls.spec.ts tests/journeys/settings.spec.ts tests/phase2/production.spec.ts --project=phase1-chromium-320 --project=phase1-chromium-1440
npm run test:privacy -- --check
npm run build
```

## Recorded local evidence

- `npm run typecheck` passed.
- Focused Vitest for appearance and production rules passed: 6 tests.
- Combined Playwright for appearance, home, Connections, shell controls, Settings, and production passed: 48 tests at 320px and 1440px; 2 desktop-Dock tests are intentionally skipped on the 320px project because that breakpoint uses the header/drawer.
- The browser contrast journey checks the rendered explicit-dark desktop Dock, atlas index, and selected source receipt at WCAG AA or higher.
- `npm run test:privacy -- --check` passed with 0 violations across 265 bounded files.
- `npm run build` passed. It is a local build only; no preview or production deployment was changed.
- Production review verification passed 8/8 at 320px and 1440px: the `jose` dependency and `/ops/episodes` policy-boundary discrepancies retain their review state, a local disposition/note survives reload, and the screen never calls that input a D1, Cloudflare, or shared-audit record.

## Temperance receipt

- The local Temperance manifest bridge was healthy during this work.
- The `noesis-plan` advisory combo exhausted four bounded attempts with provider `429` capacity failures. No plan output was accepted as evidence and no provider/credential setting was changed.
- Implementation and verification therefore rely on the repository design/product audits plus the deterministic local test evidence above. This is not Cloudflare, provider, or live-inference verification.

## Resume order

1. Review the dock, mobile header, Connections source receipt, and dark contrast evidence at 320px, 768px, and 1440px against `DESIGN.md` and the Phase 2 UI contract.
2. Decide whether Wave 1 should be merged after its focused acceptance suite is green.
3. Do not merge the Cloudflare web worktree as an incidental follow-up; review it as its own change.
4. Resolve the Wave 2 owner questions before any live Chat, uncut, retrieval, calendar sync, integration, or privileged global-command claim.
