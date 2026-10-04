"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBetaPrincipal } from "./BetaPrincipalGate";

type SettingsItem = readonly [href: string, label: string, description: string, capability: string];

const MEMBER_ITEMS: readonly SettingsItem[] = [
  ["/beta/settings", "account", "account overview", "beta:read"],
  ["/beta/settings/sessions", "sessions", "history and privacy", "chat:read"],
  ["/beta/settings/appearance", "appearance", "display preference", "beta:read"],
];

const OPERATOR_SETTINGS_ITEMS: readonly SettingsItem[] = [
  ["/beta/settings/workspace/release", "release", "server-governed controls", "control_room:read"],
];

export function BetaSettingsNavigation() {
  const pathname = usePathname() ?? "/beta/settings";
  const principal = useBetaPrincipal();
  const candidateItems = principal.kind === "member"
    ? MEMBER_ITEMS
    : [...MEMBER_ITEMS, ...OPERATOR_SETTINGS_ITEMS];
  const items = candidateItems.filter(([, , , capability]) => principal.capabilities.includes(capability));
  const showUsers = principal.kind === "operator" && principal.capabilities.includes("members:read");

  return (
    <aside className="self-start lg:sticky lg:top-24" aria-label="Settings navigation" data-beta-settings-navigation>
      <div className="border-2 border-foreground bg-surface-raised p-3">
        <p className="px-3 pb-2 font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">settings</p>
        <nav className="grid gap-1" aria-label="Settings sections">
          {items.map(([href, label, description]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`block min-h-11 border-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${pathname === href ? "border-information bg-information/20" : "border-transparent hover:border-foreground/50"}`}
            >
              <span className="block font-body text-sm font-semibold lowercase">{label}</span>
              <span className="block text-[10px] text-muted">{description}</span>
            </Link>
          ))}
          {showUsers ? (
            <>
              <p className="mt-3 px-3 pb-1 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted">administration</p>
              <Link href="/beta/settings/users" aria-current={pathname === "/beta/settings/users" ? "page" : undefined} className={`block min-h-11 border-2 px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${pathname === "/beta/settings/users" ? "border-information bg-information/20" : "border-transparent hover:border-foreground/50"}`}>users & access</Link>
              <Link href="/beta/settings/user-sessions" aria-current={pathname === "/beta/settings/user-sessions" ? "page" : undefined} className={`block min-h-11 border-2 px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${pathname === "/beta/settings/user-sessions" ? "border-information bg-information/20" : "border-transparent hover:border-foreground/50"}`}>user sessions</Link>
            </>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
