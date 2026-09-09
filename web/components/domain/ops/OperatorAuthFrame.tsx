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

type AuthAudience = "member" | "operator";

type FrameCopy = {
  eyebrow: string;
  title: string;
  body: string;
  panelLabel: string;
  proof: Array<{ label: string; detail: string; tone: "editorial" | "attention" | "live" }>;
};

const operatorFrameCopy: Record<OperatorAuthFrameMode, FrameCopy> = {
  "sign-in": {
    eyebrow: "operator beta · step 1 of 3",
    title: "operator access",
    body: "Clerk verifies your identity first. The edge then resolves the operator record before any controls appear.",
    panelLabel: "operator sign in",
    proof: [
      { label: "identity", detail: "Clerk verifies the session.", tone: "editorial" },
      { label: "roster", detail: "The edge resolves the operator role.", tone: "attention" },
      { label: "control room", detail: "Permitted controls appear only then.", tone: "live" },
    ],
  },
  "sign-up": {
    eyebrow: "operator beta · seat request",
    title: "join the lane",
    body: "Operator seats are owner-approved. Public Alpha stays open and anonymous while this protected lane is being staged.",
    panelLabel: "operator sign up",
    proof: [
      { label: "identity", detail: "Clerk verifies the session.", tone: "editorial" },
      { label: "roster", detail: "The edge resolves the operator role.", tone: "attention" },
      { label: "control room", detail: "Permitted controls appear only then.", tone: "live" },
    ],
  },
  recovery: {
    eyebrow: "operator beta · access state",
    title: "follow the handoff",
    body: "This path explains the boundary without loading operator data. Public rooms remain available independently.",
    panelLabel: "operator access state",
    proof: [
      { label: "identity", detail: "Clerk verifies the session.", tone: "editorial" },
      { label: "roster", detail: "The edge resolves the operator role.", tone: "attention" },
      { label: "control room", detail: "Permitted controls appear only then.", tone: "live" },
    ],
  },
  unavailable: {
    eyebrow: "operator beta · unavailable",
    title: "the room is not wired here",
    body: "The protected provider is not configured in this environment. Nothing is inferred from the browser, URL, or local storage.",
    panelLabel: "operator availability",
    proof: [
      { label: "identity", detail: "Clerk verifies the session.", tone: "editorial" },
      { label: "roster", detail: "The edge resolves the operator role.", tone: "attention" },
      { label: "control room", detail: "Permitted controls appear only then.", tone: "live" },
    ],
  },
  "request-access": {
    eyebrow: "operator beta · owner gate",
    title: "join by invitation",
    body: "Seats are managed through the authenticated operator boundary. Public rooms remain open without an account.",
    panelLabel: "operator seat access",
    proof: [
      { label: "identity", detail: "Clerk verifies the session.", tone: "editorial" },
      { label: "roster", detail: "The edge resolves the operator role.", tone: "attention" },
      { label: "control room", detail: "Permitted controls appear only then.", tone: "live" },
    ],
  },
};

const memberFrameCopy: Record<Extract<OperatorAuthFrameMode, "sign-in" | "sign-up">, FrameCopy> = {
  "sign-in": {
    eyebrow: "invite-only company beta · Bangalore first",
    title: "enter the beta",
    body: "Your verified invitation opens a private Ask WTF workspace. Your chats and saved notes remain private to your account.",
    panelLabel: "member sign in",
    proof: [
      { label: "verify", detail: "Sign in with your invited email.", tone: "editorial" },
      { label: "join", detail: "We match your session to company access.", tone: "attention" },
      { label: "ask", detail: "Open your private Ask WTF workspace.", tone: "live" },
    ],
  },
  "sign-up": {
    eyebrow: "invite-only company beta · Bangalore first",
    title: "accept your invite",
    body: "Create the account linked to your invitation, then enter your private Ask WTF workspace.",
    panelLabel: "member account setup",
    proof: [
      { label: "verify", detail: "Use the invited email address.", tone: "editorial" },
      { label: "join", detail: "We match your session to company access.", tone: "attention" },
      { label: "ask", detail: "Open your private Ask WTF workspace.", tone: "live" },
    ],
  },
};

export function OperatorAuthFrame({
  mode,
  children,
  audience = "operator",
}: {
  mode: OperatorAuthFrameMode;
  children: ReactNode;
  audience?: AuthAudience;
}) {
  const copy =
    audience === "member" && (mode === "sign-in" || mode === "sign-up")
      ? memberFrameCopy[mode]
      : operatorFrameCopy[mode];

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
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--wtf-text-on-structure-rgb) / 0.9) 0.8px, transparent 0.8px)",
            backgroundSize: "14px 14px",
          }}
        />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1240px] items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-20 lg:px-12">
        <section className="max-w-xl" aria-labelledby="operator-auth-title">
          <Link
            href="/"
            aria-label="return to wtf os"
            className="inline-flex rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <MigratedWordmark size="md" plate />
          </Link>
          <p className="mt-7 flex items-center gap-3 font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-on-structure/70">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-live" />
            {copy.eyebrow}
          </p>
          <h1
            id="operator-auth-title"
            className="mt-5 max-w-[10ch] font-heading text-[clamp(3.25rem,7vw,5.75rem)] font-bold leading-[0.9] tracking-[-0.06em] text-balance"
          >
            <WtfStaggeredText text={copy.title} />
          </h1>
          <p className="mt-6 max-w-[54ch] font-body text-base leading-7 text-on-structure/80">
            {copy.body}
          </p>
          <WtfMotionList items={copy.proof} />
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-on-structure/30 pt-5">
            <span className="border border-on-structure/50 px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.12em]">
              public alpha
            </span>
            <p className="font-body text-sm text-on-structure/70">
              <Link href="/" className="underline decoration-editorial underline-offset-4 hover:text-on-structure">
                stay anonymous in the public room
              </Link>
            </p>
          </div>
        </section>

        <section aria-label={copy.panelLabel}>
          <div className="overflow-hidden rounded-panel border border-on-structure/40 bg-canvas text-foreground shadow-[8px_8px_0_rgb(var(--wtf-editorial-rgb)/0.45)]">
            <div className="flex items-center justify-between border-b border-foreground/25 bg-surface-raised px-4 py-3 sm:px-5">
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
            <div className="p-4 sm:p-6">{children}</div>
          </div>
          <p className="mt-4 text-center font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-on-structure/60">
            protected lane · server-resolved role or member access
          </p>
        </section>
      </div>
    </main>
  );
}
