"use client";

import { YouTubeAnalyticsWorkspace } from "@/components/domain/ops/YouTubeAnalyticsWorkspace";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsAnalyticsPage() {
  const { role } = useOperatorContext();
  return <div data-settings-route="analytics"><WorkspaceHeader size="page" eyebrow="settings / providers" title="Analytics" summary="Review OAuth-backed YouTube decision analytics, GA4 reporting, source coverage, and versioned formulas." accent="live" /><div className="mt-6"><YouTubeAnalyticsWorkspace role={role} /></div></div>;
}
