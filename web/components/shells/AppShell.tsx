"use client";

import { useRef, useState } from "react";
import { AppRail, type AppNavItem } from "./AppRail";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { SkipLink } from "@/components/ui/SkipLink";
import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";

export type AppShellProps = {
  children: React.ReactNode;
  navigation: readonly AppNavItem[];
  mode: "public" | "operator";
  utility?: React.ReactNode;
};

export function AppShell({
  children,
  navigation,
  mode,
  utility,
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const isOperator = mode === "operator";

  const handleNavigationOpenChange = (open: boolean) => {
    setNavigationOpen(open);
    if (!open) {
      requestAnimationFrame(() => menuTrigger.current?.focus());
    }
  };

  return (
    <div
      data-wtf-shell="wtfos"
      data-shell-mode={mode}
      className="min-h-screen bg-canvas text-foreground"
    >
      <SkipLink targetId="wtf-main">skip to workspace</SkipLink>

      <div data-wtf-shell="migrated" className="min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r-2 border-foreground bg-surface-structure lg:block">
          <AppRail
            mode={mode}
            navigation={navigation}
            utility={utility}
          />
        </aside>

        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b-2 border-foreground bg-surface-structure px-4 text-on-structure lg:hidden">
          <MigratedWordmarkMini plate />
          <IconButton
            ref={menuTrigger}
            aria-label={
              isOperator
                ? "open operations navigation"
                : "Open application navigation"
            }
            aria-expanded={navigationOpen}
            aria-controls={
              isOperator
                ? "wtf-operations-navigation"
                : "wtf-application-navigation"
            }
            onClick={() => setNavigationOpen(true)}
            className="border-foreground/50 text-on-structure hover:border-attention hover:bg-attention hover:text-on-attention"
          >
            <span aria-hidden="true" className="grid gap-1">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </IconButton>
        </header>

        <Drawer
          open={navigationOpen}
          onOpenChange={handleNavigationOpenChange}
          title={isOperator ? "operations navigation" : "application navigation"}
          description={
            isOperator
              ? "authorized operations destinations"
              : "open a WTF OS workspace"
          }
          side="left"
        >
          <div
            id={
              isOperator
                ? "wtf-operations-navigation"
                : "wtf-application-navigation"
            }
            className="-mx-6 -mb-6 -mt-4 h-[calc(100vh-5rem)]"
          >
            <AppRail
              mode={mode}
              navigation={navigation}
              utility={utility}
              onNavigate={() => handleNavigationOpenChange(false)}
            />
          </div>
        </Drawer>

        <div className="relative min-h-screen overflow-hidden lg:pl-60">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 lg:left-60"
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
