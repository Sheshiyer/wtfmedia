import { RagSourceHealthPanel } from "@/components/domain/ops/RagSourceHealthPanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsSourcesPage() {
  return <div data-settings-route="sources"><WorkspaceHeader size="page" eyebrow="settings / governance" title="RAG & sources" summary="Inspect the approved corpus receipt while keeping freshness, alignment, and provider health separate." accent="information" /><div className="mt-6"><RagSourceHealthPanel /></div></div>;
}
