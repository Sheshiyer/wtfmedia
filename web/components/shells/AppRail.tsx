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
  const disclosureNavigation = mode === "operator" ? utilityNavigation : primaryNavigation;
  const disclosureId = mode === "operator"
    ? "wtf-operations-navigation"
    : "wtf-application-navigation-menu";
  const [utilityOpen, setUtilityOpen] = useState(false);
  const utilityToggleRef = useRef<HTMLButtonElement>(null);
  const utilityNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setUtilityOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!utilityOpen) return;

    utilityNavRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setUtilityOpen(false);
      utilityToggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !utilityNavRef.current?.contains(target) && !utilityToggleRef.current?.contains(target)) {
        setUtilityOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [utilityOpen]);

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
            "group relative inline-flex min-h-9 shrink-0 items-center rounded-full border-2 px-1.5 py-1",
            "font-label text-[10px] font-bold lowercase tracking-wide sm:min-h-11 sm:px-3 sm:py-2 sm:text-sm",
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
              "hidden h-1.5 w-1.5 shrink-0 rounded-full border border-current sm:mr-2 sm:block sm:h-2 sm:w-2",
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
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
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
              ref={utilityToggleRef}
              type="button"
              aria-label={utilityOpen
                ? `Close ${mode === "operator" ? "operations" : "application"} navigation`
                : `Open ${mode === "operator" ? "operations" : "application"} navigation`}
              aria-expanded={utilityOpen}
              aria-controls={disclosureId}
              aria-haspopup="true"
              data-navigation-toggle
              onClick={() => setUtilityOpen((open) => !open)}
              className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-foreground bg-surface-raised text-foreground shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <span aria-hidden="true" className="grid gap-1">
                <span className="h-0.5 w-4 bg-current" />
                <span className="h-0.5 w-4 bg-current" />
                <span className="h-0.5 w-4 bg-current" />
              </span>
            </button>
            <nav
              ref={utilityNavRef}
              id={disclosureId}
              aria-label={mode === "operator" ? "Operations" : "Application"}
              data-navigation-disclosure
              data-state={utilityOpen ? "open" : "closed"}
              className={`${utilityOpen ? "flex" : "hidden"} absolute right-0 top-14 w-[min(15rem,calc(100vw-2rem))] flex-col gap-1.5 rounded-[1.75rem] border-2 border-foreground bg-surface-raised/95 p-2 shadow-[5px_5px_0_rgb(var(--wtf-foreground-rgb)/0.16)] backdrop-blur-md`}
            >
              {renderNavLinks(disclosureNavigation)}
            </nav>
          </div>
        </div>
      </header>
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="wtf-bottom-pill mx-auto flex w-fit max-w-[min(74rem,calc(100vw-1.5rem))] items-center gap-1 overflow-x-auto rounded-full border-2 border-foreground bg-surface-raised/95 px-1.5 py-1 shadow-[0_10px_0_rgb(var(--wtf-foreground-rgb)/0.16)] backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2">
          <nav
            id="wtf-application-navigation"
            aria-label={mode === "operator" ? "Workspace" : "Application"}
            className="flex min-w-max items-center gap-0.5 sm:gap-1"
          >
            {renderNavLinks(primaryNavigation)}
          </nav>
          {utility ? (
            <div className="ml-1 flex shrink-0 items-center border-l-2 border-foreground/20 pl-2">
              {utility}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
