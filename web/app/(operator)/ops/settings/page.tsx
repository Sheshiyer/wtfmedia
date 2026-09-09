"use client";

import Link from "next/link";
import { ClerkLogoutButton } from "@/components/domain/ops/ClerkLogoutButton";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { settingsSectionsFor } from "@/lib/ops/settings-navigation";

const groupLabels = { release: "release", providers: "providers", governance: "governance", access: "access" } as const;

export default function SettingsPage() {
  const { role } = useOperatorContext();
  const sections = settingsSectionsFor(role);

  return (
    <div id="ops-settings-overview">
      <WorkspaceHeader size="page" eyebrow="settings / overview" title="settings" summary="Choose one governed workspace at a time. Each route exposes its own evidence, actions, and role boundary." accent="information" />
      <div className="mt-6 grid gap-6">
        {(["release", "providers", "governance", "access"] as const).map((group) => {
          const groupSections = sections.filter((section) => section.group === group);
          if (!groupSections.length) return null;
          return (
            <section key={group} aria-labelledby={`settings-group-${group}`}>
              <div className="mb-3 flex items-end justify-between gap-4 border-b-2 border-foreground pb-2">
                <div>
                  <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">settings directory</p>
                  <h2 id={`settings-group-${group}`} className="font-heading text-xl font-bold lowercase">{groupLabels[group]}</h2>
                </div>
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{groupSections.length} routes</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {groupSections.map((section) => (
                  <Link key={section.id} href={section.href} className="group min-w-0 rounded-panel border-2 border-foreground bg-surface-raised p-5 shadow-[4px_4px_0_rgb(var(--wtf-foreground-rgb)/0.12)] transition-transform duration-fast hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{section.eyebrow}</p>
                        <h3 className="mt-2 font-heading text-xl font-bold lowercase">{section.label}</h3>
                      </div>
                      <span aria-hidden="true" className="font-heading text-xl transition-transform duration-fast group-hover:translate-x-1">→</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-secondary">{section.description}</p>
                    <span className="mt-4 inline-flex border-2 border-foreground/30 bg-surface-subtle px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-secondary">{section.status}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <section
        className="mt-8 flex flex-col gap-4 rounded-panel border-2 border-foreground bg-surface-subtle p-5 shadow-[4px_4px_0_rgb(var(--wtf-foreground-rgb)/0.12)] sm:flex-row sm:items-center sm:justify-between sm:p-6"
        aria-labelledby="settings-session-title"
        data-settings-account
      >
        <div>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-muted">account actions</p>
          <h2 id="settings-session-title" className="mt-1 font-heading text-xl font-bold lowercase">operator session</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">Leave the protected operator workspace and return to the anonymous public Alpha. This control is intentionally kept inside Settings.</p>
        </div>
        <ClerkLogoutButton />
      </section>
    </div>
  );
}
