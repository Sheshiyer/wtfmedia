import Link from "next/link";
import { MigratedWordmark } from "@/components/patterns/brand/MigratedWordmark";

export type RecoveryMode =
  | "reauthenticate"
  | "unavailable"
  | "verification-unavailable"
  | "signing-out"
  | "request-access";

const content: Record<
  RecoveryMode,
  { eyebrow: string; heading: string; body: string; primary?: string; primaryHref?: "returnTo" | "/" }
> = {
  reauthenticate: {
    eyebrow: "sign in",
    heading: "sign-in is not in this release",
    body: "this url is open for viewing and production records. seats, access gates, and sign-in arrive next. no account was created.",
    primary: "open wtf os",
    primaryHref: "/",
  },
  unavailable: {
    eyebrow: "access",
    heading: "operations unavailable",
    body: "the operator room could not be opened. the public rooms still work.",
    primary: "open wtf os",
    primaryHref: "/",
  },
  "verification-unavailable": {
    eyebrow: "access",
    heading: "could not verify this session",
    body: "no operator data was loaded. this release is not access-gated.",
    primary: "try again",
    primaryHref: "returnTo",
  },
  "signing-out": {
    eyebrow: "sign out",
    heading: "signing out",
    body: "local operator state was cleared.",
    primary: "open wtf os",
    primaryHref: "/",
  },
  "request-access": {
    eyebrow: "seats",
    heading: "seats are not open yet",
    body: "owner-approved seats and access gates are next release. this screen does not take a request or a password.",
    primary: "open wtf os",
    primaryHref: "/",
  },
};

const control =
  "inline-flex min-h-11 items-center justify-center border-2 border-foreground px-4 py-3 text-center font-label text-sm font-bold";

export function AccessRecovery({
  mode,
  returnTo,
}: {
  mode: RecoveryMode;
  returnTo: string;
}) {
  const state = content[mode];
  const primaryHref = state.primaryHref === "returnTo" ? returnTo : "/";

  return (
    <main
      id="ops-recovery"
      className="min-h-screen bg-surface-structure px-4 py-12 text-on-structure sm:py-16"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <MigratedWordmark size="lg" plate />
        <p className="mt-4 font-label text-[11px] font-semibold uppercase tracking-[0.22em] text-on-structure/60">
          wtf os
        </p>
      </div>
      <section
        className="mx-auto mt-10 max-w-xl rounded-panel border-2 border-foreground bg-canvas p-6 text-foreground sm:p-8"
        aria-labelledby="recovery-title"
      >
        <p className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
          {state.eyebrow}
        </p>
        <h1
          id="recovery-title"
          className="mt-3 font-display text-heading font-bold lowercase tracking-[-0.03em] text-balance"
        >
          {state.heading}
        </h1>
        <p className="mt-4 max-w-[65ch] font-body text-body text-pretty">{state.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {state.primary && (
            <Link
              href={primaryHref}
              className={`${control} bg-attention text-on-attention shadow-[6px_6px_0_var(--wtf-foreground)]`}
            >
              {state.primary}
            </Link>
          )}
          {primaryHref !== "/" && (
            <Link href="/" className={`${control} bg-canvas`}>
              open wtf os
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
