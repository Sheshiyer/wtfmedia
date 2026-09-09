"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MigratedWordmark } from "@/components/patterns/brand/MigratedWordmark";
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
  { index: "01", label: "identity", detail: "Clerk verifies the session.", tone: "bg-editorial" },
  { index: "02", label: "roster", detail: "The edge resolves the operator role.", tone: "bg-attention" },
  { index: "03", label: "control room", detail: "Permitted controls appear only then.", tone: "bg-live" },
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
      className="min-h-screen bg-canvas text-foreground"
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
        <Link
          href="/"
          aria-label="return to wtf os"
          className="inline-flex shrink-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
        >
          <MigratedWordmark size="md" plate />
        </Link>
        <Link
          href="/"
          className="font-label text-xs font-bold lowercase tracking-wide text-secondary underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention sm:text-sm"
        >
          continue without an account
        </Link>
      </header>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:gap-14">
        <section className="order-2 max-w-xl lg:order-1" aria-labelledby="operator-auth-title">
          <p className="flex items-center gap-3 font-label text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-live" />
            {copy.eyebrow}
          </p>
          <h1
            id="operator-auth-title"
            className="mt-4 max-w-[12ch] font-heading text-[clamp(2.4rem,5.5vw,4.25rem)] font-bold leading-[0.92] tracking-[-0.04em] text-balance"
          >
            <WtfStaggeredText text={copy.title} />
          </h1>
          <p className="mt-5 max-w-[54ch] font-body text-base leading-7 text-secondary">
            {copy.body}
          </p>
          <ol aria-label="operator access flow" className="mt-7 border-t-2 border-foreground">
            {handoff.map((step) => (
              <li
                key={step.index}
                className="flex items-center gap-3 border-b border-foreground/15 py-3"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-foreground font-label text-xs font-bold text-foreground ${step.tone}`}
                >
                  {step.index}
                </span>
                <div>
                  <strong className="block font-label text-sm font-bold uppercase tracking-[0.08em]">
                    {step.label}
                  </strong>
                  <span className="block font-body text-sm text-secondary">{step.detail}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex flex-wrap items-center gap-3">
            <span className="border-2 border-foreground px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.12em]">
              public alpha
            </span>
            <Link
              href="/"
              className="font-body text-sm text-secondary underline decoration-knowledge underline-offset-4 hover:text-foreground"
            >
              ask the catalogue without an account
            </Link>
          </p>
        </section>

        <section aria-label={copy.panelLabel} className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-panel border-2 border-foreground bg-surface-raised shadow-[8px_8px_0_rgb(var(--wtf-foreground-rgb)/0.16)]">
            <div className="flex items-center justify-between border-b-2 border-foreground bg-surface-subtle px-4 py-3 sm:px-6">
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
            <div className="p-5 sm:p-7">{children}</div>
          </div>
          <p className="mt-4 text-center font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            protected lane · server-resolved role
          </p>
        </section>
      </div>
    </main>
  );
}
