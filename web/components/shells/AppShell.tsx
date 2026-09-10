"use client";

import { AppRail, type AppNavGroup, type AppNavItem } from "./AppRail";
import { SkipLink } from "@/components/ui/SkipLink";

export type { AppNavGroup, AppNavItem };

export type AppShellProps = {
  children: React.ReactNode;
  navigation: readonly AppNavItem[];
  mode: "public" | "member" | "operator";
  utility?: React.ReactNode;
  bottomNavigation?: readonly AppNavItem[];
  disclosureGroups?: readonly AppNavGroup[];
};

export function AppShell({
  children,
  navigation,
  mode,
  utility,
  bottomNavigation,
  disclosureGroups,
}: AppShellProps) {
  return (
    <div
      data-wtf-shell="wtfos"
      data-shell-mode={mode}
      className="min-h-screen bg-canvas text-foreground"
    >
      <SkipLink targetId="wtf-main">skip to workspace</SkipLink>

      <div data-wtf-shell="migrated" className="min-h-screen">
        <AppRail mode={mode} navigation={navigation} utility={utility} bottomNavigation={bottomNavigation} disclosureGroups={disclosureGroups} />
        <div className="relative min-h-screen overflow-hidden pb-28 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-24">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              opacity: "var(--wtf-texture-dot-opacity)",
              backgroundImage:
                "radial-gradient(rgb(var(--wtf-foreground-rgb) / 1) var(--wtf-texture-dot-size), transparent var(--wtf-texture-dot-size))",
              backgroundSize:
                "var(--wtf-texture-dot-spacing) var(--wtf-texture-dot-spacing)",
            }}
          />
          <main
            id="wtf-main"
            tabIndex={-1}
            className="relative z-10 min-h-screen focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
