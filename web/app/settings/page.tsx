import { SettingsWorkspace } from "@/components/domain/ops/SettingsWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

/** Shared display-only settings UI; service configuration remains unwired. */
export default function SettingsPage() {
  return (
    <div>
      <WorkspaceHeader
        size="page"
        eyebrow="release and connection record"
        title="settings"
        summary="inspect local preferences and held integration states. no provider, client, or release configuration is changed here."
        accent="knowledge"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><SettingsWorkspace /></div>
    </div>
  );
}
