import Link from "next/link";
import { MigratedWordmarkMini } from "./brand/MigratedWordmark";
import { PausableMarquee } from "./brand/PausableMarquee";
import { OptionalPointerAccent } from "./brand/OptionalPointerAccent";
import { PublicNav } from "./PublicNav";

/**
 * Migrated public shell — repository-owned shell contract.
 *
 * Provides: skip link, responsive nav, main-focus target, public-only footer,
 * scoped presentation marker, and migrated brand effects (Plan 01-22).
 *
 * Brand wiring (01-22):
 * - MigratedWordmarkMini: semantic-token wordmark in header
 * - PausableMarquee: token-driven decorative marquee with pause-on-hover/focus
 * - OptionalPointerAccent: custom cursor on fine-pointer devices, disabled under
 *   reduced motion / touch / forced colors
 *
 * No imports from legacy Wordmark/Sparkle/Marquee/CustomCursor.
 */

const MARQUEE_ITEMS = ["design", "culture", "tech", "media"];

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Skip link — first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:text-cream focus:rounded-full focus:outline-none focus:ring-2 focus:ring-wtf-yellow focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Optional pointer accent — renders nothing on touch/reduced-motion */}
      <OptionalPointerAccent />

      {/* Scoped migrated presentation marker */}
      <div data-wtf-shell="migrated" className="contents">
        <header className="sticky top-0 z-50 border-b-2 border-ink bg-cream/85 backdrop-blur-md">
          <div className="max-w-[1400px] mx-auto px-5 h-16 flex items-center justify-between gap-4">
            <Link href="/" data-cursor="home" className="shrink-0">
              <MigratedWordmarkMini />
            </Link>
            <PublicNav />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>

        {/* Decorative marquee band — aria-hidden, pause-on-hover/focus */}
        <div className="border-y-2 border-ink bg-wtf-yellow py-3">
          <PausableMarquee items={MARQUEE_ITEMS} />
        </div>

        {/* Inert optional brand slot — retained for structural compatibility */}
        <div data-wtf-brand-slot="inert" aria-hidden="true" className="hidden" />

        <footer className="border-t-2 border-ink bg-ink text-cream">
          <div className="max-w-[1400px] mx-auto px-5 py-8 grid gap-6 sm:grid-cols-3">
            <div>
              <span className="extrude extrude-sm text-2xl">
                <span style={{ color: "#C53B3A" }}>w</span>
                <span style={{ color: "#FFF6EA" }}>t</span>
                <span style={{ color: "#0C8167" }}>f</span>
                <span style={{ color: "#FFF6EA" }}>media</span>
              </span>
              <p className="text-cream/60 text-sm mt-3 max-w-xs">
                The WTF catalogue, made askable. Every conversation, cited to
                the second.
              </p>
              <a
                href="https://spaceblanket.ai"
                target="_blank"
                rel="noreferrer"
                data-cursor="↗"
                className="inline-flex items-center gap-1.5 mt-4 text-sm text-cream/70 hover:text-wtf-yellow transition-colors"
              >
                built by <span className="font-semibold text-cream">spaceblanket.ai</span> ↗
              </a>
            </div>
            <div className="text-sm">
              <p className="eyebrow text-cream/50 mb-2">Catalogue</p>
              <ul className="space-y-1 text-cream/80">
                <li>55 episodes indexed</li>
                <li>Conversations cited to the second</li>
              </ul>
            </div>
            <div className="text-sm">
              <p className="eyebrow text-cream/50 mb-2">About</p>
              <p className="text-cream/70">
                The WTF media catalogue, made askable.{" "}
                <a
                  href="https://allthingswtf.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-wtf-yellow"
                  data-cursor="↗"
                >
                  allthingswtf.com
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
