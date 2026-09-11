import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { ThemeToggle } from "@/components/patterns/ThemeToggle";

export default function MemberAppearanceSettingsPage() {
  return (
    <div data-member-settings-route="appearance">
      <WorkspaceHeader size="page" eyebrow="settings / appearance" title="make it yours" summary="Choose the color theme used on this device." accent="editorial" />
      <section className="mt-6 border-2 border-foreground bg-surface-raised p-5 sm:p-7" aria-labelledby="appearance-title">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">display preference</p>
        <h2 id="appearance-title" className="mt-1 font-display text-3xl font-extrabold lowercase">color theme</h2>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t-2 border-foreground pt-5">
          <p className="max-w-xl text-sm leading-relaxed text-secondary">This preference is saved on your device and applies to the workspace when you return.</p>
          <ThemeToggle />
        </div>
      </section>
    </div>
  );
}
