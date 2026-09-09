"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MigratedWordmark } from "@/components/patterns/brand/MigratedWordmark";
import { WtfMotionList } from "@/components/patterns/brand/WtfMotionList";
import { WtfStaggeredText } from "@/components/patterns/brand/WtfStaggeredText";

export type OperatorAuthFrameMode =
  | "sign-in"
  | "sign-up"
  | "recovery"
  | "unavailable"
  | "request-access";

const frameCopy: Record<
  OperatorAuthFrameMode,
  { eyebrow: string; title: string; body: string; panelLabel: string }
> = {
  "sign-in": {
    eyebrow: "operator beta · step 1 of 3",
    title: "enter the room",
    body: "Clerk verifies your identity first. The edge then resolves the operator record before any controls appear.",
    panelLabel: "operator sign in",
  },
  "sign-up": {
    eyebrow: "operator beta · seat request",
    title: "join the lane",
    body: "Operator seats are owner-approved. Public Alpha stays open and anonymous while this protected lane is being staged.",
    panelLabel: "operator sign up",
  },
  recovery: {
    eyebrow: "operator beta · access state",
    title: "follow the handoff",
    body: "This path explains the boundary without loading operator data. Public rooms remain available independently.",
    panelLabel: "operator access state",
  },
  unavailable: {
    eyebrow: "operator beta · unavailable",
    title: "the room is not wired here",
    body: "The protected provider is not configured in this environment. Nothing is inferred from the browser, URL, or local storage.",
    panelLabel: "operator availability",
  },
  "request-access": {
    eyebrow: "operator beta · owner gate",
    title: "join by invitation",
    body: "Seats are managed through the authenticated operator boundary. Public rooms remain open without an account.",
    panelLabel: "operator seat access",
  },
};

const handoff = [
  { label: "identity", detail: "Clerk verifies the session.", tone: "editorial" as const },
  { label: "roster", detail: "The edge resolves the operator role.", tone: "attention" as const },
  { label: "control room", detail: "Permitted controls appear only then.", tone: "live" as const },
];

export function OperatorAuthFrame({
  mode,
  children,
}: {
  mode: OperatorAuthFrameMode;
  children: ReactNode;
}) {
  const copy = frameCopy[mode];

  return (
    <main
      id="operator-auth"
      data-operator-auth
      data-operator-auth-mode={mode}
      className="relative isolate min-h-screen overflow-hidden bg-surface-structure text-on-structure"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1 bg-editorial" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-editorial/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-attention/10 blur-3xl" />
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(rgb(var(--wtf-text-on-structure-rgb)/0.9)_0.8px,transparent_0.8px)] [background-size:14px_14px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1400px] items-center gap-10 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:gap-16 lg:px-12">
        <section className="order-2 max-w-2xl lg:order-1" aria-labelledby="operator-auth-title">
          <Link
            href="/"
            aria-label="return to wtf os"
            className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <MigratedWordmark size="md" plate />
          </Link>
          <p className="mt-6 flex items-center gap-3 font-label text-[11px] font-semibold uppercase tracking-[0.18em] text-on-structure/70">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-live" />
            {copy.eyebrow}
          </p>
          <h1
            id="operator-auth-title"
            className="mt-5 max-w-[10ch] font-heading text-[clamp(3.2rem,8vw,7rem)] font-bold leading-[0.88] tracking-[-0.06em] text-balance"
          >
            <WtfStaggeredText text={copy.title} />
          </h1>
          <p className="mt-6 max-w-[54ch] font-body text-base leading-7 text-on-structure/80">
            {copy.body}
          </p>
          <WtfMotionList items={handoff} />
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-on-structure/30 pt-5">
            <span className="border border-on-structure/50 px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.12em]">
              public alpha
            </span>
            <p className="font-body text-sm text-on-structure/70">
              <Link href="/" className="underline decoration-editorial underline-offset-4 hover:text-on-structure">
                continue without an account
              </Link>
            </p>
          </div>
        </section>

        <section aria-label={copy.panelLabel} className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-panel border-2 border-foreground bg-canvas text-foreground shadow-[8px_8px_0_var(--wtf-surface-structure)]">
            <div className="flex items-center justify-between border-b-2 border-foreground bg-surface-raised px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-editorial" />
                <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em]">
                  {copy.panelLabel}
                </span>
              </div>
              <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-secondary">
                Clerk
              </span>
            </div>
            <div className="p-5 sm:p-8">{children}</div>
          </div>
          <p className="mt-4 text-center font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-on-structure/60">
            protected lane · server-resolved role
          </p>
        </section>
      </div>
    </main>
  );
}
