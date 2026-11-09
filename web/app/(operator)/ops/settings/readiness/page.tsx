import { BetaReadinessLedger } from "@/components/domain/ops/BetaReadinessLedger";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsReadinessPage() {
  return <div data-settings-route="readiness"><WorkspaceHeader size="page" eyebrow="settings / release" title="beta readiness" summary="Read the activation ledger without confusing local contracts, live receipts, or deployment state." accent="attention" /><div className="mt-6"><BetaReadinessLedger /></div></div>;
}
