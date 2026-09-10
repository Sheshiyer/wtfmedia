"use client";

import { useUser } from "@clerk/nextjs";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function MemberAccountSettingsPage() {
  const { isLoaded, user } = useUser();
  const firstName = user?.firstName?.trim() || user?.fullName?.trim()?.split(/\s+/u)[0] || "there";

  return (
    <div data-member-settings-route="account">
      <WorkspaceHeader size="page" eyebrow="settings / account" title={`Welcome back, ${firstName}`} summary="Review the account details you use for this private workspace." accent="information" />
      <section className="mt-6 border-2 border-foreground bg-surface-raised p-5 sm:p-7" aria-labelledby="account-overview-title">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-information">read only</p>
        <h2 id="account-overview-title" className="mt-1 font-display text-3xl font-extrabold lowercase">account overview</h2>
        {!isLoaded ? <p role="status" className="mt-4 text-sm text-secondary">loading your account…</p> : (
          <dl className="mt-5 divide-y-2 divide-foreground/15 border-y-2 border-foreground">
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="font-label text-xs font-bold uppercase tracking-[0.1em] text-muted">name</dt><dd className="text-sm text-foreground">{user?.fullName || user?.firstName || "Not provided"}</dd></div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="font-label text-xs font-bold uppercase tracking-[0.1em] text-muted">account status</dt><dd className="text-sm text-foreground">{user ? "active" : "not available"}</dd></div>
          </dl>
        )}
        <p className="mt-5 text-sm leading-relaxed text-secondary">These details are shown for orientation only. Account changes are not available from this page.</p>
      </section>
    </div>
  );
}
