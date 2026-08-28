"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OpsDestination } from "@/lib/ops/policy";

export function OperatorNav({ items, onNavigate }: { items: Array<{ label: string; href: OpsDestination }>; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Operations" className="flex flex-col gap-1">
    {items.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={pathname === item.href ? "page" : undefined} className={`min-h-11 border-2 px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-attention ${pathname === item.href ? "border-attention bg-attention text-on-attention" : "border-transparent text-on-structure hover:border-foreground/50"}`}>{item.label}</Link>)}
  </nav>;
}
