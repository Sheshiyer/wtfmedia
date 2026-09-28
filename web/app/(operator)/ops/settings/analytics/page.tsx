"use client";

import { YouTubeAnalyticsSettingsPanel } from "@/components/domain/ops/YouTubeAnalyticsSettingsPanel";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsAnalyticsPage() {
  const { role } = useOperatorContext();
  return <div data-settings-route="analytics"><WorkspaceHeader size="page" eyebrow="settings / providers" title="Analytics" summary="Review server-authorized YouTube and GA4 connections, selected resources, stored reports, and freshness." accent="live" /><div className="mt-6"><YouTubeAnalyticsSettingsPanel role={role} /></div></div>;
}
