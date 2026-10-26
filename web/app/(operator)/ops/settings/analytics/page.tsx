"use client";

import { YouTubeAnalyticsWorkspace } from "@/components/domain/ops/YouTubeAnalyticsWorkspace";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsAnalyticsPage() {
  const { role } = useOperatorContext();
  return <div data-settings-route="analytics"><WorkspaceHeader size="page" eyebrow="settings / providers" title="YouTube analytics" summary="Use the production decision workspace backed by read-only Google OAuth, synchronized YouTube observations, explicit coverage, and versioned formulas." accent="live" /><div className="mt-6"><YouTubeAnalyticsWorkspace role={role} /></div></div>;
}
