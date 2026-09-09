import { MemoryGovernancePanel } from "@/components/domain/ops/MemoryGovernancePanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsMemoryPage() {
  return <div data-settings-route="memory"><WorkspaceHeader size="page" eyebrow="settings / governance" title="memory governance" summary="Separate durable account history from explicit saved memory and keep the owner-controlled lifecycle visible." accent="knowledge" /><div className="mt-6"><MemoryGovernancePanel /></div></div>;
}
