import { OperatorAdministrationPanel } from "@/components/domain/ops/OperatorAdministrationPanel";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsAccessPage() {
  return <div data-settings-route="access"><WorkspaceHeader size="page" eyebrow="settings / access" title="operator access" summary="Review roster authority, seat lifecycle, and the single-super-admin invariant." accent="editorial" /><div className="mt-6"><OperatorAdministrationPanel /></div></div>;
}
