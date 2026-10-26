import { BetaSessionsSettingsPanel } from "@/components/domain/beta/BetaSessionsSettingsPanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function MemberSessionsSettingsPage() {
  return (
    <div data-member-settings-route="sessions">
      <WorkspaceHeader size="page" eyebrow="settings / sessions" title="sessions & privacy" summary="Understand what stays in your private history and how to archive it." accent="knowledge" />
      <BetaSessionsSettingsPanel />
    </div>
  );
}
