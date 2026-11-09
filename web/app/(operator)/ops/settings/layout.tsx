"use client";

import { usePathname } from "next/navigation";
import { SettingsNavigation } from "@/components/domain/ops/SettingsNavigation";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { canReadSettingsSection, settingsSectionForPath } from "@/lib/ops/settings-navigation";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/ops/settings";
  const context = useOperatorContext();
  const section = settingsSectionForPath(pathname);
  const denied = section && !canReadSettingsSection(context.role, section.id);

  return (
    <div data-settings-layout>
      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:px-12">
        <SettingsNavigation />
        <div className="min-w-0" data-settings-content>
          {denied ? (
            <section className="rounded-panel border-2 border-foreground bg-surface-raised p-6" aria-labelledby="settings-access-denied">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">protected settings</p>
              <h1 id="settings-access-denied" className="mt-2 font-heading text-2xl font-bold lowercase">access is not granted</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">This settings route is not available for the verified operator role. Return to the settings overview or request the appropriate admin authorization.</p>
            </section>
          ) : children}
        </div>
      </div>
    </div>
  );
}
