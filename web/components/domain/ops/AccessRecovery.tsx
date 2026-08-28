import Link from "next/link";

export type RecoveryMode =
  | "reauthenticate"
  | "unavailable"
  | "verification-unavailable"
  | "signing-out";

const content: Record<
  RecoveryMode,
  { heading: string; body: string; primary?: string }
> = {
  reauthenticate: {
    heading: "let’s verify your access",
    body: "protected workspace data has been cleared. sign in again to continue.",
    primary: "sign in again",
  },
  unavailable: {
    heading: "operator access unavailable",
    body: "we could not open the operator workspace. contact the owner if you believe you should have access.",
  },
  "verification-unavailable": {
    heading: "verification unavailable",
    body: "we could not safely verify operator access. no protected workspace data was loaded.",
    primary: "try again",
  },
  "signing-out": {
    heading: "signing out",
    body: "protected workspace data has been cleared.",
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

  return (
    <main
      id="ops-recovery"
      className="min-h-screen bg-canvas px-4 py-12 text-foreground sm:py-16"
    >
      <section
        className="mx-auto max-w-xl rounded-panel border-2 border-foreground bg-surface-raised p-6 sm:p-8"
        aria-labelledby="recovery-title"
      >
        <p className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/65">
          operator recovery
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
              href={returnTo}
              className={`${control} bg-attention text-foreground shadow-[6px_6px_0_var(--wtf-foreground)]`}
            >
              {state.primary}
            </Link>
          )}
          <Link href="/" className={`${control} bg-canvas`}>
            return to the catalogue
          </Link>
        </div>
      </section>
    </main>
  );
}
