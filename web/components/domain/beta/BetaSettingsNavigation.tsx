"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBetaPrincipal } from "./BetaPrincipalGate";

const MEMBER_ITEMS = [
  ["/beta/settings", "account", "account overview"],
  ["/beta/settings/memory", "memory", "saved preferences"],
  ["/beta/settings/sessions", "sessions", "history and privacy"],
  ["/beta/settings/appearance", "appearance", "display preference"],
] as const;
const WORKSPACE_ITEMS = [
  ["/beta/settings/workspace/readiness", "readiness", "release evidence"],
  ["/beta/settings/workspace/release", "release", "server-governed controls"],
  ["/beta/settings/workspace/ai", "AI route", "non-persisted preview"],
  ["/beta/settings/workspace/analytics", "YouTube analytics", "non-persisted preview"],
  ["/beta/settings/workspace/sessions", "sessions & history", "owner scope"],
  ["/beta/settings/workspace/memory", "memory governance", "explicit saves only"],
  ["/beta/settings/workspace/sources", "RAG & sources", "corpus receipt"],
] as const;

export function BetaSettingsNavigation() {
  const pathname = usePathname() ?? "/beta/settings";
  const principal = useBetaPrincipal();
  const admin = principal.capabilities.includes("members:read") || principal.capabilities.includes("audit:read");
  const items = principal.kind === "member" ? MEMBER_ITEMS : WORKSPACE_ITEMS;
  return <aside className="self-start lg:sticky lg:top-24" aria-label="Settings navigation" data-beta-settings-navigation><div className="border-2 border-foreground bg-surface-raised p-3"><p className="px-3 pb-2 font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">settings</p><nav className="grid gap-1" aria-label="Settings sections">{items.map(([href, label, description]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`block min-h-11 border-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information ${pathname === href ? "border-information bg-information/20" : "border-transparent hover:border-foreground/50"}`}><span className="block font-body text-sm font-semibold lowercase">{label}</span><span className="block text-[10px] text-muted">{description}</span></Link>)}{principal.kind === "operator" && admin ? <><p className="mt-3 px-3 pb-1 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted">administration</p><Link href="/beta/admin/users" className="block min-h-11 border-2 border-transparent px-3 py-2 text-sm font-semibold hover:border-foreground/50">users & access</Link><Link href="/beta/admin/audit" className="block min-h-11 border-2 border-transparent px-3 py-2 text-sm font-semibold hover:border-foreground/50">audit</Link>{principal.capabilities.includes("release:manage") ? <Link href="/beta/admin/release" className="block min-h-11 border-2 border-transparent px-3 py-2 text-sm font-semibold hover:border-foreground/50">release mutation</Link> : null}</> : null}</nav></div></aside>;
}
