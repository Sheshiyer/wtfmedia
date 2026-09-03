import Link from "next/link";
import { AppShell } from "@/components/shells/AppShell";
import { currentReleaseNavigation } from "@/lib/public/current-release-nav";

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

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      mode="public"
      navigation={currentReleaseNavigation}
      utility={
        <Link
          href="/sign-in"
          data-public-sign-in
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-foreground bg-surface-subtle px-3 py-2 font-label text-xs font-bold lowercase tracking-wide text-foreground transition-colors hover:bg-attention hover:text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-sm"
        >
          sign in
        </Link>
      }
    >
      {children}
    </AppShell>
  );
}
