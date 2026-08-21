---
phase: 01-compatibility-component-proof-harness
plan: "04"
status: complete
completed_at: "2026-08-21"
threat_results: "web/tests/security/phase1-threat-results/01-04.json"
---

# Plan 01-04 Summary — Deterministic Proof Harness

## Outcome

The deterministic proof-harness configuration and one passing smoke path now
exist before any application migration. All four owned threat rows are recorded
`passed` in `web/tests/security/phase1-threat-results/01-04.json`:

| Threat | Task | Command surface | Status |
|---|---|---|---|
| T-01-09 | 2 | `test:components HarnessSmoke` + `test:privacy -- --check` | passed |
| T-01-11 | 2 | `test:components HarnessSmoke` | passed |
| T-01-10 | 3 | `playwright test --list` + LHCI shape (5 runs, filesystem) | passed |
| T-01-12 | 3 | `playwright test --list` + LHCI shape (5 runs, 4 URLs, filesystem) | passed |

## Artifacts

- `web/eslint.config.mjs` — flat ESM ESLint 9, generated dirs ignored, zero-warning scripts.
- `web/vitest.config.ts` — separated `unit` / `contracts` / `storybook` projects; Storybook project uses the Playwright browser provider with pinned Chromium; `@/` alias preserved; no jsdom/Jest/watch defaults.
- `web/.storybook/main.ts` — `@storybook/nextjs-vite`, repository-only story globs, a11y + vitest addons.
- `web/.storybook/preview.ts` — global `globals.css` import, `parameters.a11y.test = "error"`, frozen clock/locale/timezone, local-fixtures-only network parameter.
- `web/stories/fixtures/public.ts` — synthetic public-shaped fixtures; no real transcript text, secrets, private links, prompts, or machine-local paths.
- `web/stories/HarnessSmoke.stories.tsx` — smoke story exercising native link/button focus order via keyboard tab; passes in the browser project.
- `web/tests/privacy/scan.mjs` — minimal offline scanner accepting only `--check`; scans Storybook config + synthetic fixture roots; rejects secret, private-link, prompt, operator-field, and machine-local-path leak classes; exits 0 with zero-violation summary.
- `web/playwright.config.ts` — blocking `phase1-chromium` project plus 320/768/1440 viewport projects, production-like `npm run build && npm run start` webServer, deterministic port/baseURL, trace-on-retry.
- `web/lighthouserc.cjs` — four protected public routes, `numberOfRuns: 5`, filesystem upload target, no numeric assertions.
- `web/tests/journeys/public-routes.spec.ts` — placeholder route scaffold so Playwright discovery has a real suite; behavioral journeys land in Plan 01-05+.

## Truths established

- Every planned automated command now has a real non-watch configuration file.
- The smoke story executes in pinned Chromium with a11y in error mode.
- Browser evidence uses deterministic public fixtures and 320/768/1440 coverage.
- Vitest's Storybook project consumes the same `.storybook` configuration reviewers see.

## Notes for next wave (01-05+)

- Playwright journeys are scaffold-only by design; the production-like server
  lifecycle and viewport matrix are proven, route behavior is not yet asserted.
- LHCI collects with no budgets; numeric thresholds must be derived from the
  recorded baseline (QUAL-06), not invented.
- The privacy scanner covers only Storybook/fixture roots; Plan 01-05 extends it
  to the full public-projection and generated-artifact root set.
- Vite `configLoader: 'native'` warning on `vitest.config.ts` is cosmetic
  (ESM-in-CJS load); does not affect results.
