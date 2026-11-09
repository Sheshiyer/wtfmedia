"use client";

import { YouTubeAnalyticsSettingsPanel } from "@/components/domain/ops/YouTubeAnalyticsSettingsPanel";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsAnalyticsPage() {
  const { role } = useOperatorContext();
  return <div data-settings-route="analytics"><WorkspaceHeader size="page" eyebrow="settings / providers" title="YouTube analytics" summary="Review the read-only observation adapter, account scope, and mock dashboard states." accent="live" /><div className="mt-6"><YouTubeAnalyticsSettingsPanel role={role} /></div></div>;
}
