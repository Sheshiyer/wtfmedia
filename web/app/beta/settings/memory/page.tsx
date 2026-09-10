import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { MemoryPreferencesPanel } from "@/components/domain/member/MemoryPreferencesPanel";

export default function MemberMemorySettingsPage() {
  return (
    <div data-member-settings-route="memory">
      <WorkspaceHeader size="page" eyebrow="settings / memory" title="your preferences" summary="Keep only the context you choose to save, separate from your conversation history." accent="live" />
      <div className="mt-6"><MemoryPreferencesPanel /></div>
    </div>
  );
}
