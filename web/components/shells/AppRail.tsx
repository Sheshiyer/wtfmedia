"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";
import { ThemeToggle } from "@/components/patterns/ThemeToggle";
import { routeIsActive } from "@/lib/public/route-is-active";

export { routeIsActive };

export type AppNavItem = {
  href: string;
  label: string;
  icon?: "chat" | "settings";
  section?: "workspace" | "administration";
  match?: readonly string[];
};

export type AppNavGroup = { label: string; items: readonly AppNavItem[] };

export type AppRailProps = {
  mode: "public" | "member" | "operator";
  navigation: readonly AppNavItem[];
  utility?: React.ReactNode;
  bottomNavigation?: readonly AppNavItem[];
  disclosureGroups?: readonly AppNavGroup[];
};

/**
 * The Alpha chat is deliberately an edge-to-edge workspace, not a dock page.
 * Member Beta inherits that frame and puts its account utility in the
 * hamburger disclosure instead of reintroducing a two-item bottom pill.
 */
export function shouldHideBottomDock(
  mode: AppRailProps["mode"],
  pathname: string,
): boolean {
  const betaChatOrSettings = pathname.startsWith("/beta/chat") || pathname.startsWith("/beta/settings");
  return mode === "member" || betaChatOrSettings || (mode === "public" && (pathname === "/" || pathname === "/chat"));
}

export function AppRail({
  mode,
  navigation,
  utility,
  bottomNavigation,
  disclosureGroups,
}: AppRailProps) {
  const pathname = usePathname() ?? "/";
  const utilityHrefs = new Set(["/beta/workspace", "/beta/workspace/production", "/beta/workspace/episodes", "/beta/settings"]);
  const utilityOrder = ["/beta/workspace", "/beta/workspace/production", "/beta/workspace/episodes", "/beta/settings"];
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
  const disclosureNavigation = mode === "operator" ? [...primaryNavigation, ...utilityNavigation] : primaryNavigation;
  const resolvedBottomNavigation = bottomNavigation ?? primaryNavigation;
  const hideBottomDock = shouldHideBottomDock(mode, pathname);
  const disclosureId = mode === "operator"
    ? "wtf-operations-navigation"
    : mode === "member"
      ? "wtf-member-navigation-menu"
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

  const isActive = (item: AppNavItem) => item.match
    ? item.match.some((pattern) => pattern.endsWith("*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern)
    : routeIsActive(pathname, item.href);

  const renderNavLinks = (items: readonly AppNavItem[]) =>
    items.map((item) => {
      const active = isActive(item);

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
          {item.icon ? (
            <span aria-hidden="true" className="mr-1.5 grid shrink-0 place-items-center">
              {item.icon === "settings" ? <SettingsIcon /> : <ChatIcon />}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={[
                "hidden h-1.5 w-1.5 shrink-0 rounded-full border border-current sm:mr-2 sm:block sm:h-2 sm:w-2",
                active ? "bg-surface-structure" : "bg-transparent group-hover:bg-current",
              ].join(" ")}
            />
          )}
          {item.label}
        </Link>
      );
    });

  const iconLinkClass = (active = false) => [
    "grid h-11 w-11 shrink-0 place-items-center rounded-full border-2",
    "transition-[background-color,color,border-color,transform] duration-fast",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    active
      ? "border-foreground bg-attention text-on-attention"
      : "border-transparent bg-surface-subtle text-foreground hover:-translate-y-0.5 hover:border-foreground hover:bg-information/20",
  ].join(" ");

  function ProfileIcon() {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" />
        <path strokeLinecap="round" d="M5.5 20c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5" />
      </svg>
    );
  }

  function SettingsIcon() {
    return (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.2 13.3 1.1.85-1.7 2.95-1.3-.5a7.7 7.7 0 0 1-1.9 1.1l-.2 1.4h-3.4l-.2-1.4a7.7 7.7 0 0 1-1.9-1.1l-1.3.5-1.7-2.95 1.1-.85a7.6 7.6 0 0 1 0-2.1l-1.1-.85 1.7-2.95 1.3.5a7.7 7.7 0 0 1 1.9-1.1l.2-1.4h3.4l.2 1.4a7.7 7.7 0 0 1 1.9 1.1l1.3-.5 1.7 2.95-1.1.85a7.6 7.6 0 0 1 0 2.1Z" />
      </svg>
    );
  }

  function ChatIcon() {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 6.5h13v9h-7l-4.5 3v-3H5.5z" />
      </svg>
    );
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className="mx-auto flex max-w-[92rem] items-start justify-between gap-3">
          <Link
            href={mode === "operator" ? "/beta/workspace" : mode === "member" ? "/beta" : "/"}
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
                ? `Close ${mode === "operator" ? "operations" : mode === "member" ? "member workspace" : "application"} navigation`
                : `Open ${mode === "operator" ? "operations" : mode === "member" ? "member workspace" : "application"} navigation`}
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
              aria-label={mode === "operator" ? "Operations" : mode === "member" ? "Member workspace" : "Application"}
              data-navigation-disclosure
              data-state={utilityOpen ? "open" : "closed"}
              className={`${utilityOpen ? "flex" : "hidden"} absolute right-0 top-14 max-h-[calc(100dvh-5.5rem)] w-[min(15rem,calc(100vw-2rem))] flex-col gap-1.5 overflow-y-auto rounded-[1.75rem] border-2 border-foreground bg-surface-raised/95 p-2 shadow-[5px_5px_0_rgb(var(--wtf-foreground-rgb)/0.16)] backdrop-blur-md`}
            >
              <div
                role="group"
                aria-label="Account and display"
                data-navigation-utilities
                className="flex items-center justify-center gap-1 border-b-2 border-foreground/20 pb-2"
              >
                {mode === "operator" ? (
                  <Link
                    href="/beta/settings/account"
                    aria-label="operator profile"
                    title="operator profile"
                    data-shell-profile
                    aria-current={routeIsActive(pathname, "/beta/settings/account") ? "page" : undefined}
                    className={iconLinkClass(routeIsActive(pathname, "/beta/settings/account"))}
                  >
                    <ProfileIcon />
                  </Link>
                ) : utility ? (
                  utility
                ) : null}
                <ThemeToggle />
                {mode === "operator" || mode === "member" ? (
                  <Link
                    href="/beta/settings"
                    aria-label="settings"
                    title="settings"
                    data-shell-settings
                    aria-current={routeIsActive(pathname, "/beta/settings") ? "page" : undefined}
                    className={iconLinkClass(routeIsActive(pathname, "/beta/settings"))}
                  >
                    <SettingsIcon />
                  </Link>
                ) : null}
              </div>
              <div data-navigation-links className="flex flex-col gap-1.5">
                {disclosureGroups ? disclosureGroups.map((group) => (
                  <section key={group.label} aria-label={group.label} className="grid gap-1.5 border-b border-foreground/15 pb-2 last:border-0 last:pb-0">
                    <p className="px-2 pt-1 font-label text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{group.label}</p>
                    {renderNavLinks(group.items)}
                  </section>
                )) : renderNavLinks(disclosureNavigation)}
              </div>
            </nav>
          </div>
        </div>
      </header>
      {hideBottomDock ? null : <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <div className="wtf-bottom-pill mx-auto flex w-fit max-w-[min(74rem,calc(100vw-1.5rem))] items-center overflow-x-auto rounded-full border-2 border-foreground bg-surface-raised/95 px-1.5 py-1 shadow-[0_10px_0_rgb(var(--wtf-foreground-rgb)/0.16)] backdrop-blur-md sm:px-3 sm:py-2">
          <nav
            id="wtf-application-navigation"
            aria-label={mode === "operator" ? "Workspace" : mode === "member" ? "Member workspace" : "Application"}
            data-bottom-navigation
            className="flex min-w-max items-center gap-0.5 sm:gap-1"
          >
            {renderNavLinks(resolvedBottomNavigation)}
          </nav>
        </div>
      </div>}
    </>
  );
}
