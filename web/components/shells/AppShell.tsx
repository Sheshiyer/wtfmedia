"use client";

import { useRef, useState } from "react";
import type { AppNavItem } from "./AppRail";
import { AppDock } from "./AppDock";
import { GlobalCommandSurface } from "./GlobalCommandSurface";
import { SkipLink } from "@/components/ui/SkipLink";
import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";

export type AppShellProps = {
  children: React.ReactNode;
  navigation: readonly AppNavItem[];
  mode: "public" | "operator";
};

export function AppShell({
  children,
  navigation,
  mode,
}: AppShellProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const mobileCommandTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopCommandTriggerRef = useRef<HTMLButtonElement>(null);

  const handleCommandOpenChange = (open: boolean) => {
    setCommandOpen(open);

    if (!open) {
      requestAnimationFrame(() => {
        const desktopControls = window.matchMedia("(min-width: 1024px)").matches;
        const trigger = desktopControls
          ? desktopCommandTriggerRef.current
          : mobileCommandTriggerRef.current;
        trigger?.focus();
      });
    }
  };

  return (
    <div
      data-wtf-shell="wtfos"
      data-shell-mode={mode}
      className="min-h-[100dvh] bg-canvas text-foreground"
    >
      <SkipLink targetId="wtf-main">skip to workspace</SkipLink>

      <div data-wtf-shell="migrated" className="min-h-[100dvh]">
        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b-2 border-foreground bg-surface-structure px-4 text-on-structure lg:hidden">
          <MigratedWordmarkMini plate />
          <button
            ref={mobileCommandTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={commandOpen}
            onClick={() => setCommandOpen(true)}
            className="min-h-11 border-2 border-knowledge bg-knowledge px-3 font-label text-[0.6875rem] font-bold lowercase tracking-[0.08em] text-on-knowledge hover:border-attention hover:bg-attention hover:text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-surface-structure"
          >
            controls
          </button>
        </header>

        <div className="relative min-h-[100dvh] pb-24 lg:pb-28">
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
            className="relative z-10 min-h-[100dvh] focus:outline-none"
          >
            {children}
          </main>
        </div>
        <AppDock
          mode={mode}
          navigation={navigation}
          onOpenCommand={() => setCommandOpen(true)}
          commandTriggerRef={desktopCommandTriggerRef}
        />
        <GlobalCommandSurface
          open={commandOpen}
          onOpenChange={handleCommandOpenChange}
          navigation={navigation}
          mode={mode}
        />
      </div>
    </div>
  );
}
