"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";
import { routeIsActive } from "@/lib/public/route-is-active";

export { routeIsActive };

export type AppNavItem = {
  href: string;
  label: string;
  section?: "workspace" | "administration";
};

export type AppRailProps = {
  mode: "public" | "operator";
  navigation: readonly AppNavItem[];
  utility?: React.ReactNode;
};

export function AppRail({
  mode,
  navigation,
  utility,
}: AppRailProps) {
  const pathname = usePathname() ?? "/";
  const utilityHrefs = new Set(["/ops", "/ops/production", "/ops/episodes", "/ops/settings"]);
  const utilityOrder = ["/ops", "/ops/production", "/ops/episodes", "/ops/settings"];
  const utilityNavigation = navigation
    .filter((item) => item.section === "administration" || utilityHrefs.has(item.href))
    .sort((a, b) => {
      const aIndex = utilityOrder.indexOf(a.href);
      const bIndex = utilityOrder.indexOf(b.href);
      return (aIndex === -1 ? utilityOrder.length : aIndex) - (bIndex === -1 ? utilityOrder.length : bIndex);
    });
  const primaryOrder = ["/", "/episodes", "/connections", "/chat"];
  const primaryNavigation = navigation
    .filter((item) => item.section !== "administration" && !utilityHrefs.has(item.href))
    .sort((a, b) => {
      const aIndex = primaryOrder.indexOf(a.href);
      const bIndex = primaryOrder.indexOf(b.href);
      return (aIndex === -1 ? primaryOrder.length : aIndex) - (bIndex === -1 ? primaryOrder.length : bIndex);
    });
  const applicationNavigation = [...primaryNavigation, ...utilityNavigation];
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationToggleRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setNavigationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navigationOpen) return;

    navigationRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setNavigationOpen(false);
      navigationToggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !navigationRef.current?.contains(target) && !navigationToggleRef.current?.contains(target)) {
        setNavigationOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [navigationOpen]);

  const renderNavLinks = (items: readonly AppNavItem[]) =>
    items.map((item) => {
      const active = routeIsActive(pathname, item.href);

      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          data-nav-section={item.section ?? "workspace"}
          className={[
            "group relative inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-3 py-2",
            "font-label text-xs font-bold lowercase tracking-wide sm:text-sm",
            "transition-[background-color,color,border-color] duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
            active
              ? "border-foreground bg-attention text-on-attention"
              : item.section === "administration"
                ? "border-foreground/30 bg-surface-subtle text-foreground hover:border-foreground hover:bg-information/30"
                : "border-transparent bg-canvas text-foreground hover:border-foreground hover:bg-surface-subtle",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "mr-2 h-2 w-2 shrink-0 rounded-full border border-current",
              active
                ? "bg-surface-structure"
                : "bg-transparent group-hover:bg-current",
            ].join(" ")}
          />
          {item.label}
        </Link>
      );
    });

  return (
    <>
      <header
        data-top-app-rail
        className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-canvas px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-5"
      >
        <div className="mx-auto flex max-w-[92rem] items-start justify-between gap-3">
          <Link
            href={mode === "operator" ? "/ops" : "/"}
            aria-label="WTF OS"
            className="shrink-0 rounded-xl border-2 border-foreground bg-surface-raised px-2 py-1 shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
          >
            <MigratedWordmarkMini plate />
          </Link>
          <div className="relative flex min-w-0 items-start justify-end gap-2">
            <button
              ref={navigationToggleRef}
              type="button"
              aria-label={navigationOpen ? "Close application navigation" : "Open application navigation"}
              aria-expanded={navigationOpen}
              aria-controls="wtf-application-navigation"
              aria-haspopup="true"
              data-navigation-toggle
              onClick={() => setNavigationOpen((open) => !open)}
              className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-foreground bg-surface-raised text-foreground shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <span aria-hidden="true" className="grid gap-1">
                <span className="h-0.5 w-4 bg-current" />
                <span className="h-0.5 w-4 bg-current" />
                <span className="h-0.5 w-4 bg-current" />
              </span>
            </button>
            <nav
              ref={navigationRef}
              id="wtf-application-navigation"
              aria-label="Application"
              data-navigation-disclosure
              data-state={navigationOpen ? "open" : "closed"}
              className={`${navigationOpen ? "flex" : "hidden"} absolute right-0 top-[calc(5rem+env(safe-area-inset-top))] max-h-[calc(100dvh-6rem-env(safe-area-inset-top))] w-[min(17rem,calc(100vw-2rem))] flex-col gap-1.5 overflow-y-auto rounded-[1.75rem] border-2 border-foreground bg-surface-raised/95 p-2 shadow-[5px_5px_0_rgb(var(--wtf-foreground-rgb)/0.16)] backdrop-blur-md`}
            >
              {renderNavLinks(applicationNavigation)}
              {utility ? (
                <div className="mt-1 flex items-center border-t-2 border-foreground/20 px-2 pt-2">
                  {utility}
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      </header>
      {/* The former floating bottom navigation pill is intentionally disabled.
          The top disclosure is now the single application navigation surface. */}
    </>
  );
}
