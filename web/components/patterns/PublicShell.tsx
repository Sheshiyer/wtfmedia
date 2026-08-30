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
    <AppShell mode="public" navigation={currentReleaseNavigation}>
      {children}
    </AppShell>
  );
}
