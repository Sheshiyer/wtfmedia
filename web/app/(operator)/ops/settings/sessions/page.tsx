import { SessionHistoryPolicyPanel } from "@/components/domain/ops/SessionHistoryPolicyPanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsSessionsPage() {
  return <div data-settings-route="sessions"><WorkspaceHeader size="page" eyebrow="settings / governance" title="sessions & history" summary="Keep Clerk session verification, D1 ownership, archive lifecycle, and admin export boundaries visible." accent="information" /><div className="mt-6"><SessionHistoryPolicyPanel /></div></div>;
}
