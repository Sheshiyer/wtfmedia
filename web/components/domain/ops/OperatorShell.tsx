"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { OperatorNav } from "./OperatorNav";
import type { OpsDestination } from "@/lib/ops/policy";

export function OperatorShell({ children, nav }: { children: React.ReactNode; nav: Array<{ label: string; href: OpsDestination }> }) {
  const [open, setOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => {
    setOpen(false);
    requestAnimationFrame(() => menuTrigger.current?.focus());
  };
  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);
  const trapDrawerFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return closeDrawer();
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const links = <><p className="font-display text-3xl lowercase">wtf media</p><p className="mt-2 text-label">operations</p><OperatorNav items={nav} onNavigate={() => setOpen(false)} /><div className="mt-auto space-y-2"><Link href="/" className="block min-h-11 px-3 py-2 text-canvas underline">catalogue exit</Link><Link href="/ops/recover?mode=signing-out" className="block min-h-11 px-3 py-2 text-canvas underline">sign out</Link></div></>;
  return <div className="min-h-screen bg-canvas text-foreground" data-ops-shell="true">
    <a href="#ops-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:bg-attention focus:px-4 focus:py-3">skip to workspace</a>
    <aside className="fixed inset-y-0 hidden w-60 flex-col bg-foreground p-5 text-canvas lg:flex">{links}</aside>
    <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between bg-foreground px-4 text-canvas lg:hidden"><span className="font-display text-2xl lowercase">wtf media</span><button ref={menuTrigger} type="button" aria-expanded={open} aria-controls="ops-drawer" onClick={() => setOpen(true)} className="min-h-11 min-w-11 border-2 border-canvas px-3">menu</button></header>
    {open && <div id="ops-drawer" role="dialog" aria-modal="true" aria-label="Operations navigation" onKeyDown={trapDrawerFocus} className="fixed inset-0 z-50 flex w-full max-w-xs flex-col bg-foreground p-5 text-canvas"><button ref={closeButton} type="button" onClick={closeDrawer} className="mb-5 min-h-11 self-end border-2 border-canvas px-3">close menu</button>{links}</div>}
    <div className="lg:pl-60">{children}</div>
  </div>;
}
