"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOperatorContext } from "./OperatorContextProvider";
import { formatOpsRole, formatVerifiedTime } from "@/lib/ops/display";
import { parseOperatorProfile, profileDate, type OperatorProfile } from "@/lib/ops/profile";
import { settingsSectionsFor } from "@/lib/ops/settings-navigation";

type ProfileStatus = "pending" | "ready" | "unavailable" | "denied";

function localPreview(context: ReturnType<typeof useOperatorContext>): OperatorProfile {
  return {
    displayName: "not observed",
    email: "not observed",
    role: context.role as OperatorProfile["role"],
    active: true,
    createdAt: "not-observed",
    updatedAt: "not-observed",
    identityProvider: "clerk",
    mapping: "edge_to_d1_readback_pending",
    mappingStatus: "pending",
    environment: context.environment,
    workspace: context.workspace,
    organizationScope: context.organizationScope,
  };
}

function Field({ label, value, tone = "foreground" }: { label: string; value: string; tone?: "foreground" | "secondary" }) {
  return (
    <div>
      <dt className="font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={`mt-1 break-words font-body text-sm font-semibold ${tone === "secondary" ? "text-secondary" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}

export function OperatorProfilePage() {
  const context = useOperatorContext();
  const [state, setState] = useState<{ status: ProfileStatus; profile: OperatorProfile | null }>(() => ({
    status: context.role === "public_link" ? "denied" : "pending",
    profile: context.role === "public_link" ? null : localPreview(context),
  }));

  useEffect(() => {
    if (context.role === "public_link") return;
    let mounted = true;
    fetch("/ops/api/profile", { cache: "no-store", headers: { accept: "application/json" } })
      .then(async (response) => (response.ok ? parseOperatorProfile(await response.json()) : null))
      .then((profile) => {
        if (mounted) setState(profile ? { status: "ready", profile } : { status: "unavailable", profile: localPreview(context) });
      })
      .catch(() => {
        if (mounted) setState({ status: "unavailable", profile: localPreview(context) });
      });
    return () => { mounted = false; };
  }, [context]);

  const sections = context.role === "public_link" ? [] : settingsSectionsFor(context.role);
  const profile = state.profile;
  const readbackLabel = state.status === "ready" ? "edge readback" : state.status === "pending" ? "requesting edge readback" : "local preview · edge unavailable";

  return (
    <div id="ops-profile" data-profile-page>
      <header className="border-b-2 border-foreground bg-canvas px-4 py-6 sm:px-8 sm:py-8 xl:px-12">
        <div className="mx-auto max-w-[var(--wtf-content-max)]">
          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden="true" className="h-1 w-8 border border-foreground bg-information" />
            <p className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">operator / profile</p>
          </div>
          <h1 className="font-display text-heading font-bold lowercase tracking-[-0.03em] text-foreground text-balance lg:text-[28px] lg:leading-[1.15]">profile</h1>
          <p className="mt-4 max-w-[65ch] font-body text-body text-pretty text-secondary">Your identity, verified operating scope, and the settings routes available to this role.</p>
        </div>
      </header>

      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12 xl:py-12">
        {context.role === "public_link" ? (
          <section className="rounded-panel border-2 border-foreground bg-surface-raised p-6" aria-labelledby="profile-denied-title" data-profile-denied>
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">protected profile</p>
            <h2 id="profile-denied-title" className="mt-2 font-heading text-2xl font-bold lowercase">verification required</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">The anonymous public Alpha does not expose operator identity, account mapping, or settings access. Sign in through the approved Clerk path to continue.</p>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite" data-profile-readback-status>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">profile readback</p>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-surface-raised px-3 py-1.5 font-label text-[10px] font-bold uppercase tracking-[0.1em]">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${state.status === "ready" ? "bg-live" : "bg-attention"}`} />
                {readbackLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
              <section className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6" aria-labelledby="profile-identity-title" data-profile-identity>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-foreground pb-4">
                  <div>
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">identity & role</p>
                    <h2 id="profile-identity-title" className="mt-1 font-heading text-2xl font-bold lowercase">operator record</h2>
                  </div>
                  <span className="border-2 border-foreground bg-live px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-foreground">{profile?.active ? "active" : "inactive"}</span>
                </div>
                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <Field label="display name" value={profile?.displayName ?? "not observed"} />
                  <Field label="email" value={profile?.email ?? "not observed"} />
                  <Field label="effective role" value={profile ? formatOpsRole(profile.role) : formatOpsRole(context.role)} />
                  <Field label="identity provider" value="Clerk" />
                  <Field label="operator mapping" value={profile?.mapping === "normalized_email_to_active_d1_operator" ? "normalized email → active D1 operator" : "pending edge → D1 readback"} tone="secondary" />
                  <Field label="mapping status" value={profile?.mappingStatus === "matched" ? "matched" : "pending"} />
                </dl>
              </section>

              <section className="rounded-panel border-2 border-foreground bg-surface-subtle p-5 sm:p-6" aria-labelledby="profile-scope-title" data-profile-scope>
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">verified scope</p>
                <h2 id="profile-scope-title" className="mt-1 font-heading text-2xl font-bold lowercase">where you operate</h2>
                <dl className="mt-5 grid gap-5">
                  <Field label="environment" value={profile?.environment ?? context.environment} />
                  <Field label="workspace" value={profile?.workspace ?? context.workspace} />
                  <Field label="organization scope" value={profile?.organizationScope ?? context.organizationScope} />
                  <Field label="last verified" value={formatVerifiedTime(context.lastVerifiedAt)} />
                  <Field label="member since" value={profile ? profileDate(profile.createdAt) : "not observed"} tone="secondary" />
                  <Field label="record updated" value={profile ? profileDate(profile.updatedAt) : "not observed"} tone="secondary" />
                </dl>
              </section>
            </div>

            <section className="mt-5 rounded-panel border-2 border-foreground bg-canvas p-5 sm:p-6" aria-labelledby="profile-settings-map-title" data-profile-settings-map>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">role-governed settings</p>
                  <h2 id="profile-settings-map-title" className="mt-1 font-heading text-2xl font-bold lowercase">settings access map</h2>
                </div>
                <Link href="/beta/settings" className="inline-flex min-h-10 items-center border-2 border-foreground bg-surface-raised px-3 py-2 font-label text-xs font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">open settings directory</Link>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">These links mirror the verified role’s read boundary. The edge policy remains authoritative for every route and mutation.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sections.map((section) => (
                  <Link key={section.id} href={section.href} className="group border-2 border-foreground bg-surface-raised p-4 transition-transform duration-fast hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{section.group}</span>
                    <span className="mt-2 flex items-center justify-between gap-2 font-heading text-lg font-bold lowercase">{section.label}<span aria-hidden="true" className="transition-transform duration-fast group-hover:translate-x-1">→</span></span>
                    <span className="mt-2 block text-xs leading-relaxed text-secondary">{section.status}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
