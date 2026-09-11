"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MigratedWordmark, MigratedWordmarkMini } from "@/components/patterns/brand/MigratedWordmark";
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

const memberFrameCopy: Record<OperatorAuthFrameMode, FrameCopy> = {
  "sign-in": {
    eyebrow: "company beta",
    title: "enter the beta",
    body: "Sign in with Google or email to open your private Ask WTF workspace. Your chats and saved notes remain private to your account.",
    panelLabel: "member sign in",
    proof: [
      { label: "verify", detail: "Clerk verifies your identity.", tone: "editorial" },
      { label: "join", detail: "We create your private member account.", tone: "attention" },
      { label: "ask", detail: "Open your private Ask WTF workspace.", tone: "live" },
    ],
  },
  "sign-up": {
    eyebrow: "company beta",
    title: "create your account",
    body: "Create your verified account, then enter your private Ask WTF workspace.",
    panelLabel: "member account setup",
    proof: [
      { label: "verify", detail: "Clerk verifies your identity.", tone: "editorial" },
      { label: "join", detail: "We create your private member account.", tone: "attention" },
      { label: "ask", detail: "Open your private Ask WTF workspace.", tone: "live" },
    ],
  },
  recovery: {
    eyebrow: "company beta",
    title: "opening your account",
    body: "We are opening your private Ask WTF workspace only after the verified session and member record agree.",
    panelLabel: "member access check",
    proof: [
      { label: "verify", detail: "Confirm the signed-in session.", tone: "editorial" },
      { label: "match", detail: "Resolve your private member account.", tone: "attention" },
      { label: "enter", detail: "Open private history and saved notes.", tone: "live" },
    ],
  },
  unavailable: {
    eyebrow: "company beta",
    title: "beta access is unavailable",
    body: "Your private workspace could not be opened. No conversation, history, or saved note has been shown.",
    panelLabel: "member access state",
    proof: [
      { label: "verify", detail: "Your session remains protected.", tone: "editorial" },
      { label: "retry", detail: "We can safely check access again.", tone: "attention" },
      { label: "private", detail: "Workspace data stays withheld until ready.", tone: "live" },
    ],
  },
  "request-access": {
    eyebrow: "company beta",
    title: "finish account setup",
    body: "Your verified sign-in did not resolve to a private member account yet. Sign out, sign in again, then retry the access check.",
    panelLabel: "member account required",
    proof: [
      { label: "verify", detail: "Use your verified email address.", tone: "editorial" },
      { label: "match", detail: "We bind one verified identity to membership.", tone: "attention" },
      { label: "enter", detail: "Private data appears only after that match.", tone: "live" },
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
  const copy = audience === "member" ? memberFrameCopy[mode] : operatorFrameCopy[mode];

  if (audience === "member") {
    return (
      <main
        id="operator-auth"
        data-operator-auth
        data-operator-auth-mode={mode}
        data-member-auth-frame
        className="relative min-h-screen overflow-hidden bg-canvas text-foreground"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0"
          style={{
            opacity: "var(--wtf-texture-dot-opacity)",
            backgroundImage: "radial-gradient(rgb(var(--wtf-foreground-rgb) / 1) var(--wtf-texture-dot-size), transparent var(--wtf-texture-dot-size))",
            backgroundSize: "var(--wtf-texture-dot-spacing) var(--wtf-texture-dot-spacing)",
          }}
        />
        <header className="relative z-10 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <Link
            href="https://wtfhq.in"
            aria-label="return to public wtf os"
            className="inline-flex rounded-xl border-2 border-foreground bg-surface-raised px-2 py-1 shadow-[3px_3px_0_rgb(var(--wtf-foreground-rgb)/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention"
          >
            <MigratedWordmarkMini plate />
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-[var(--wtf-content-max)] items-center px-4 py-8 sm:px-8 lg:py-12 xl:px-12">
          <div className="grid w-full overflow-hidden border-2 border-foreground bg-surface-raised shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.14)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)]">
            <section className="relative min-w-0 overflow-hidden p-6 sm:p-9 lg:p-12" aria-labelledby="operator-auth-title">
              <div aria-hidden="true" className="wtf-question-lattice absolute inset-x-0 top-0 h-2" />
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-knowledge">
                {copy.eyebrow}
              </p>
              <h1 id="operator-auth-title" className="mt-4 max-w-[10ch] font-display text-4xl font-extrabold lowercase leading-[0.92] sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-[52ch] font-body text-sm leading-relaxed text-secondary sm:text-base">
                {copy.body}
              </p>
              <WtfMotionList items={copy.proof} surface="light" />
              <Link
                href="https://wtfhq.in"
                className="mt-8 inline-flex min-h-11 items-center border-b-2 border-knowledge font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-knowledge"
              >
                return to public alpha ↗
              </Link>
            </section>

            <section aria-label={copy.panelLabel} className="border-t-2 border-foreground bg-canvas p-4 sm:p-7 lg:border-l-2 lg:border-t-0 lg:p-8">
              <p className="mb-4 font-label text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                {copy.panelLabel}
              </p>
              <div className="mx-auto w-full max-w-[28rem]">{children}</div>
            </section>
          </div>
        </div>
      </main>
    );
  }

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

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1240px] items-center gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-20 lg:px-12">
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
          <div className="mt-8 border-t border-on-structure/30 pt-5">
            <a
              href="https://wtfhq.in"
              className="inline-flex border border-on-structure/50 px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:border-on-structure hover:bg-canvas hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              public alpha
            </a>
          </div>
        </section>

        <section aria-label={copy.panelLabel} className="mx-auto w-full max-w-[30rem] lg:max-w-none">
          <div className="overflow-hidden rounded-panel border border-on-structure/40 bg-canvas text-foreground shadow-[8px_8px_0_rgb(var(--wtf-editorial-rgb)/0.45)]">
            <div className="flex items-center border-b border-foreground/25 bg-surface-raised px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-editorial" />
                <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em]">
                  {copy.panelLabel}
                </span>
              </div>
            </div>
            <div className="p-5 sm:p-6">{children}</div>
          </div>
          <p className="mt-3 text-center font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-on-structure/60">
            protected lane · server-resolved role or member access
          </p>
        </section>
      </div>
    </main>
  );
}
