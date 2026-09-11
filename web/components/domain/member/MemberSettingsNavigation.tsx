"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const MEMBER_SETTINGS_NAVIGATION = [
  { href: "/beta/settings", label: "account", description: "Account overview" },
  { href: "/beta/settings/memory", label: "memory", description: "Saved preferences" },
  { href: "/beta/settings/sessions", label: "sessions", description: "History and privacy" },
  { href: "/beta/settings/appearance", label: "appearance", description: "Display preference" },
] as const;

export function MemberSettingsNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" data-member-settings-navigation>
      <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">settings</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {MEMBER_SETTINGS_NAVIGATION.map((item) => {
          const active = item.href === "/beta/settings" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block border-2 px-3 py-3 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-information ${active ? "border-foreground bg-information text-on-information" : "border-foreground/25 bg-surface-subtle text-foreground hover:border-foreground hover:bg-information/10"}`}
              >
                <span className="block font-label text-sm font-bold lowercase">{item.label}</span>
                <span className={`mt-1 block text-xs ${active ? "text-on-information/80" : "text-secondary"}`}>{item.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
