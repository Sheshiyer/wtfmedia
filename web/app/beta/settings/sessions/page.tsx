import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function MemberSessionsSettingsPage() {
  return (
    <div data-member-settings-route="sessions">
      <WorkspaceHeader size="page" eyebrow="settings / sessions" title="sessions & privacy" summary="Understand what stays in your private history and how to archive it." accent="knowledge" />
      <section className="mt-6 grid gap-4" aria-label="Session privacy guidance">
        <article className="border-2 border-foreground bg-surface-raised p-5 sm:p-7">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-information">private history</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold lowercase">your sessions are yours</h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary">Questions and answers from the private workspace stay in your account history so you can return to them. Public Alpha conversations remain separate and do not appear here.</p>
        </article>
        <article className="border-2 border-foreground bg-surface-subtle p-5 sm:p-7">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-live">archive control</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold lowercase">archive when you are done</h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary">Use the archive action on a session to remove it from active history. Archived content is retained, but restoring it is not available in this Beta; there is no destructive delete control here.</p>
        </article>
      </section>
    </div>
  );
}
