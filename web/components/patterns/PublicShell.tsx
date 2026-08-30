import { AppShell, type AppShellProps } from "@/components/shells/AppShell";

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

const navigation: AppShellProps["navigation"] = [
  { href: "/", label: "the room", section: "workspace" },
  { href: "/production", label: "production", section: "workspace" },
  { href: "/settings", label: "settings", section: "workspace" },
  { href: "/episodes", label: "episodes", section: "workspace" },
  { href: "/connections", label: "connections", section: "workspace" },
  { href: "/chat", label: "source chat", section: "workspace" },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell mode="public" navigation={navigation}>
      {children}
    </AppShell>
  );
}
