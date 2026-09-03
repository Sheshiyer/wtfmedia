"use client";

import Link from "next/link";
import { useOperatorContext } from "./OperatorContextProvider";

export function OperatorAdministrationPanel() {
  const context = useOperatorContext();
  const verified = context.role !== "public_link";
  const canMutate = context.role === "super_admin" || context.role === "admin";

  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="operator-administration-title"
      data-operator-administration-panel
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            protected administration
          </p>
          <h2 id="operator-administration-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            operator access
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            Roster reads and seat mutations are server-authorized. This summary never treats a browser role, URL, or cached roster as authority.
          </p>
        </div>
        <span className="shrink-0 rounded-control border-2 border-foreground/40 bg-surface-subtle px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">
          {verified ? context.role.replace("_", " ") : "sign-in required"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">roster read</p>
          <p className="mt-2 font-heading text-xl font-bold lowercase">{verified ? "server allowed" : "held"}</p>
        </div>
        <div className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">seat mutations</p>
          <p className="mt-2 font-heading text-xl font-bold lowercase">{canMutate ? "role allowed" : "super-admin gate"}</p>
        </div>
        <div className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">super-admin transfer</p>
          <p className="mt-2 font-heading text-xl font-bold lowercase">{context.role === "super_admin" ? "available" : "protected"}</p>
        </div>
      </div>

      <p className="mt-5 border-l-4 border-information bg-canvas px-4 py-3 text-sm leading-relaxed text-secondary">
        {verified
          ? "Open the protected operator workspace for the live roster, role, deactivation, and single-super-admin readbacks. Every mutation must return a server readback and audit event."
          : "Sign in through the approved Cloudflare Access path to reveal roster details. Public-link mode intentionally shows no operator records or mutation controls."}
      </p>

      <Link href="/ops/operators" className="mt-5 inline-flex min-h-11 items-center border-2 border-foreground bg-canvas px-4 py-3 font-label text-sm font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">
        open protected operator workspace
      </Link>
    </section>
  );
}
