"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOperatorContext } from "./OperatorContextProvider";
import { SETTINGS_GROUPS, settingsSectionsFor } from "@/lib/ops/settings-navigation";

const groupLabels = {
  release: "release",
  providers: "providers",
  governance: "governance",
  access: "access",
} as const;

export function SettingsNavigation() {
  const pathname = usePathname() ?? "/ops/settings";
  const { role } = useOperatorContext();
  const sections = settingsSectionsFor(role);

  return (
    <aside className="self-start lg:sticky lg:top-24" aria-label="Settings navigation" data-settings-navigation>
      <div className="rounded-panel border-2 border-foreground bg-surface-raised p-3 shadow-[4px_4px_0_rgb(var(--wtf-foreground-rgb)/0.12)]">
        <div className="border-b-2 border-foreground px-3 pb-3">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">settings</p>
          <p className="mt-1 font-heading text-xl font-bold lowercase">operator controls</p>
          <p className="mt-2 text-xs leading-relaxed text-secondary">Routes and actions follow the verified operator role.</p>
        </div>
        <nav className="mt-3 grid gap-3" aria-label="Settings sections">
          <Link
            href="/ops/settings"
            aria-current={pathname === "/ops/settings" ? "page" : undefined}
            className={`block min-h-11 rounded-control border-2 px-3 py-2 font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${pathname === "/ops/settings" ? "border-attention bg-attention text-on-attention" : "border-transparent text-foreground hover:border-foreground/50 hover:bg-surface-subtle"}`}
          >
            overview
          </Link>
          {SETTINGS_GROUPS.map(([group]) => {
            const groupSections = sections.filter((section) => section.group === group);
            if (!groupSections.length) return null;
            return (
              <div key={group}>
                <p className="px-3 pb-1 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{groupLabels[group]}</p>
                <div className="grid gap-1">
                  {groupSections.map((section) => {
                    const active = pathname === section.href;
                    return (
                      <Link
                        key={section.id}
                        href={section.href}
                        aria-current={active ? "page" : undefined}
                        className={`block min-h-11 rounded-control border-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${active ? "border-information bg-information/20 text-foreground" : "border-transparent text-foreground hover:border-foreground/50 hover:bg-surface-subtle"}`}
                      >
                        <span className="block font-body text-sm font-semibold lowercase">{section.label}</span>
                        <span className="block text-[10px] font-label uppercase tracking-[0.08em] text-muted">{section.status}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
