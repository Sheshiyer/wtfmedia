import Link from "next/link";
import { validatedReturnTo } from "@/lib/ops/return-to";

type RecoveryMode = "reauthenticate" | "unavailable" | "verification-unavailable" | "signing-out";
const content: Record<RecoveryMode, { heading: string; body: string; primary?: string }> = {
  reauthenticate: { heading: "let’s verify your access", body: "protected workspace data has been cleared. sign in again to continue.", primary: "sign in again" },
  unavailable: { heading: "operator access unavailable", body: "we could not open the operator workspace. contact the owner if you believe you should have access." },
  "verification-unavailable": { heading: "verification unavailable", body: "we could not safely verify operator access. no protected workspace data was loaded.", primary: "try again" },
  "signing-out": { heading: "signing out", body: "protected workspace data has been cleared." },
};

function clearProtectedStateScript() {
  return { __html: "for(const store of [localStorage,sessionStorage]){for(let i=store.length-1;i>=0;i--){const key=store.key(i);if(key&&key.startsWith('wtf-ops:'))store.removeItem(key)}}" };
}

export default async function OpsRecoveryPage({ searchParams }: { searchParams: Promise<{ mode?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const mode: RecoveryMode = params.mode === "unavailable" || params.mode === "verification-unavailable" || params.mode === "signing-out" ? params.mode : "reauthenticate";
  const state = content[mode];
  const returnTo = validatedReturnTo(params.returnTo);
  return (
    <main id="ops-recovery" className="min-h-screen bg-canvas px-4 py-16 text-foreground">
      <script dangerouslySetInnerHTML={clearProtectedStateScript()} />
      <section className="mx-auto max-w-xl border-2 border-foreground bg-surface-raised p-6 sm:p-8" aria-labelledby="recovery-title">
        <p className="text-label">operator recovery</p>
        <h1 id="recovery-title" className="mt-3 font-display text-4xl">{state.heading}</h1>
        <p className="mt-4 max-w-prose font-body">{state.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {state.primary && <Link href={returnTo} className="min-h-11 border-2 border-foreground bg-attention px-4 py-3 text-center font-semibold">{state.primary}</Link>}
          <Link href="/" className="min-h-11 border-2 border-foreground px-4 py-3 text-center font-semibold">return to the catalogue</Link>
        </div>
      </section>
    </main>
  );
}
