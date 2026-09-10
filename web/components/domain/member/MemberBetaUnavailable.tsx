import Link from "next/link";

export function MemberBetaUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-structure px-4 py-8 text-on-structure">
      <section className="w-full max-w-xl border-2 border-on-structure/40 bg-surface-raised p-6 text-foreground shadow-[6px_6px_0_rgb(var(--wtf-foreground-rgb)/0.18)] sm:p-8">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-knowledge">company beta · unavailable</p>
        <h1 className="mt-3 font-heading text-3xl font-bold leading-tight">Beta access is unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-secondary">This environment is not configured to verify member access. No conversation, history, or saved note has been shown.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center border-2 border-foreground bg-attention px-4 font-label text-sm font-bold text-on-attention shadow-[3px_3px_0_var(--wtf-foreground)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-knowledge">return to wtf os</Link>
      </section>
    </main>
  );
}
