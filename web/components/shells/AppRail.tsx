"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";

export type AppNavItem = {
  href: string;
  label: string;
  section?: "workspace" | "administration";
};

export type AppRailProps = {
  mode: "public" | "operator";
  navigation: readonly AppNavItem[];
  onNavigate?: () => void;
  utility?: React.ReactNode;
};

export function routeIsActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppRail({
  mode,
  navigation,
  onNavigate,
  utility,
}: AppRailProps) {
  const pathname = usePathname() ?? "/";
  const workspaceItems = navigation.filter(
    (item) => item.section !== "administration",
  );
  const administrationItems = navigation.filter(
    (item) => item.section === "administration",
  );

  const renderItems = (items: readonly AppNavItem[]) =>
    items.map((item) => {
      const active = routeIsActive(pathname, item.href);

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={[
            "group relative flex min-h-11 items-center border-2 px-3 py-2",
            "font-label text-sm font-bold lowercase tracking-wide",
            "transition-[background-color,color,border-color,transform] duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-foreground",
            active
              ? "border-attention bg-attention text-foreground"
              : "border-transparent text-canvas hover:border-canvas/40 hover:bg-canvas/10",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "mr-3 h-2.5 w-2.5 shrink-0 border border-current",
              active ? "bg-foreground" : "bg-transparent group-hover:bg-canvas",
            ].join(" ")}
          />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col bg-foreground text-canvas">
      <div className="border-b-2 border-canvas/20 px-5 py-6">
        <Link
          href={mode === "operator" ? "/ops" : "/"}
          onClick={onNavigate}
          aria-label="WTF Media control room"
          className="inline-flex min-h-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
        >
          <MigratedWordmarkMini />
        </Link>
        <p className="mt-4 font-label text-[11px] font-bold uppercase tracking-[0.18em] text-canvas/55">
          {mode === "operator" ? "verified operations" : "one brain · public"}
        </p>
      </div>

      <nav
        aria-label={mode === "operator" ? "operations" : "Application"}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
      >
        <p className="px-3 pb-2 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-canvas/45">
          workspaces
        </p>
        <div className="space-y-1">{renderItems(workspaceItems)}</div>

        {administrationItems.length > 0 && (
          <>
            <div className="my-5 border-t border-canvas/20" />
            <p className="px-3 pb-2 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-canvas/45">
              administration
            </p>
            <div className="space-y-1">{renderItems(administrationItems)}</div>
          </>
        )}
      </nav>

      {utility && (
        <div className="border-t-2 border-canvas/20 px-4 py-4">{utility}</div>
      )}
    </div>
  );
}
