# WTF OS motion map

First slice: splash. Whole-app motion is mapped here so React Bits / MotionSites
inspire later pages without overwriting the locked brand.

**Logo:** raster lockup `web/public/brand/wtfos-wordmark.png`. Do not recolor.
**Phases in play:** 1 public (`/`, `/episodes`, `/connections`, `/chat`) and 2
ops (`/sign-in`, `/request-access`, `/ops`, `/ops/operators`, `/ops/audit`,
`/ops/recover`). Later routes stay inactive.

## Decision ledger

| Choice | Why | Source |
|---|---|---|
| Two splash plates, not one baked hero | Background can loop or swap; logo stays a keyed asset | Owner: “two separate pieces… clean alpha” |
| Official PNG as the only mark | Letter reconstruction made T vanish on ink | Owner logo file; PRODUCT/DESIGN wordmark-as-asset |
| Magenta chroma → VP8/VP9 alpha | Imagine video is RGB; alpha is a post step | Imagine skill: video from image, no alpha out |
| 6s shots, sparkle twinkle once, paper grain drift | One motion per plate; no progress bar | GrokFilm Eye Light + 02-UI-SPEC motion budget |
| `/ops` has no looping bg | Spec forbids perpetual motion in ops | `02-UI-SPEC.md` |
| Splash is public-only | Boot overlay never on `/ops`, `/sign-in`, `/request-access`, recover | Designer map D9; `02-UI-SPEC` |
| Chroma MP4 is a keying source | Imagine is RGB; magenta plate is not the product layer | Designer map D4 |
| Crop or replace Grok watermarks before ship | Bg plate still carries a generator mark | Designer map D6 |
| Public rooms may be more expressive | Phase 1 contract | `01-UI-SPEC.md` |
| Reduced motion skips loops | WCAG + token motion policy | `web/styles/motion.css` |
| React Bits / MotionSites are catalogs, not paste | Harmonize to tokens; no shadcn visual layer | design-core; react-bits-pro spoke; motionskin |
| Do not install Pro blocks until the owner picks one | Host license is already wired (`~/.temperance_engine/secrets/reactbits-license.env`). Registries are not in `web/components.json` yet. No shadcn init. | `react-bits-pro` SKILL; 2026-08-28 handoff |
| Splash plate A is React Bits **Grainient**, not the Grok bg video | Catalog review: Aurora/Plasma/Silk/Galaxy rejected as neon. Grainient is grain + warp that can be creamed. MIT copy from react-bits + `ogl`. Pro backups verified 200: `grain-wave-tw`, `halftone-wave-tw`. | Owner: replace subpar Grok bg; DavidHDev/react-bits Backgrounds |

## Splash shot list

| Piece | File | Duration | First frame | Motion |
|---|---|---|---|---|
| A background | React Bits Grainient (`web/components/patterns/brand/Grainient.tsx`), cream/ink tokens | 6s | Cream print grain, no logo, no watermark | Slow warp + animated grain |
| B logo on alpha | `web/public/brand/splash/wtfos-logo-alpha.webm` from chroma `wtfos-logo-chroma.mp4` | 6s | Official WTF OS on keyed field | Sparkles twinkle once; letters hold |

Composite at runtime: full-bleed A, centered B. Reduced-motion: A-still + static PNG. Playwright (`navigator.webdriver`): skip overlay.

## App motion layers (after splash)

| Layer | Surfaces | Animates | Stays still |
|---|---|---|---|
| Boot | Public rooms only, once per load | Two-plate splash | Ops and access routes |
| Access | `/sign-in`, `/request-access`, `/ops/recover` | Entrance fade of the cream panel | No looping bg |
| Public rooms | `/`, `/episodes`, `/connections`, `/chat` | 120ms hover/focus; optional marquee (pausable) | Layout, type, data |
| Ops shell | `/ops/*` | 120ms hover, 200ms disclosure, ≤320ms drawer | Status, counts, no pulse |

## Catalog to search later (do not install yet)

**React Bits Pro** (license missing in this checkout — map only):

- Later: loader / logo-loop / particles only if they can be restyled to print-shop, not neon.
- App UI: dashboard density after ops chrome is locked.
- Do not install generic `hero-*` SaaS blocks onto `/`.

**MotionSites / motionskin:**

- Later public home only, if a template’s *structure + motion* matches cream/ink editorial (not glass/gradient).
- Splash is not a template reskin.

## Splash acceptance

- [x] Two files composite; no CSS progress bar as the hero
- [x] Logo colors match the official PNG
- [x] Alpha (or chroma-keyed overlay) — magenta never visible in the product
- [x] `prefers-reduced-motion: reduce` shows stills
- [x] Automated tests do not wait 6s on boot
- [x] No fake “loading 0–100%” copy
- [x] Overlay is skippable and session-once (`?boot=1` replays)
