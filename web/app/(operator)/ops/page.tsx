"use client";

import Link from "next/link";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { ControlRoomStatusLedger } from "@/components/domain/ops/ControlRoomStatusLedger";

export default function ControlRoomPage() {
  const context = useOperatorContext();
  const primary = context.role === "editor" ? { href: "/chat", label: "open Ask WTF" } : { href: "/ops/operators", label: "review operator access" };
  return <main id="ops-main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><p className="text-label">run the show from the source</p><h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.5rem)] lowercase">control room</h1><section className="mt-8 max-w-2xl"><h2 className="font-heading text-2xl">the room is open</h2><p className="mt-3 text-lg">your access is verified. workflow systems will appear here when they are activated.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href={primary.href} className="min-h-11 border-2 border-foreground bg-attention px-4 py-3 text-center font-semibold">{primary.label}</Link><button type="button" className="min-h-11 border-2 border-foreground px-4 py-3">refresh status</button></div></section><ControlRoomStatusLedger /></main>;
}
