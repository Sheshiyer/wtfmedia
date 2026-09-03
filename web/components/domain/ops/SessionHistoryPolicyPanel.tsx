"use client";

import Link from "next/link";

const policyRows = [
  ["authentication authority", "Cloudflare Access JWT"],
  ["identity and role", "server / D1 operator record"],
  ["session target", "720 hours · verification pending"],
  ["MFA precedence", "Access policy · verification pending"],
  ["history scope", "verified account owner · archive-only"],
  ["admin export", "protected endpoint · audit required"],
] as const;

export function SessionHistoryPolicyPanel() {
  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="session-history-policy-title"
      data-session-history-policy-panel
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            beta access contract
          </p>
          <h2 id="session-history-policy-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            sessions and history
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            Access verifies the session; the server resolves the operator. Browser storage, URL slugs, and environment flags never grant access.
          </p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-information bg-information px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-on-information">
          server governed
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="session and history policy">
        {policyRows.map(([label, value]) => (
          <div key={label} className="border-2 border-foreground bg-canvas p-4">
            <dt className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
            <dd className="mt-2 font-body text-sm font-semibold leading-relaxed text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-l-4 border-information bg-canvas px-4 py-3">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">verification boundary</p>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          The 720-hour target and global/MFA precedence are policy targets here, not a completed live Access receipt. Interactive staging verification is still required before rollout approval.
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-3" aria-label="protected operator workspaces">
        <Link href="/ops/chat" className="inline-flex min-h-11 items-center border-2 border-foreground bg-canvas px-4 py-3 font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">
          open account history
        </Link>
        <Link href="/ops/operators" className="inline-flex min-h-11 items-center border-2 border-foreground bg-canvas px-4 py-3 font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">
          open operator administration
        </Link>
        <Link href="/ops/audit" className="inline-flex min-h-11 items-center border-2 border-foreground bg-canvas px-4 py-3 font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">
          open audit ledger
        </Link>
      </nav>
    </section>
  );
}
