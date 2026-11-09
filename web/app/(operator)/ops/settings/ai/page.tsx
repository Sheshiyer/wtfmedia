"use client";

import { AIProviderSettingsPanel } from "@/components/domain/ops/AIProviderSettingsPanel";
import { useOperatorContext } from "@/components/domain/ops/OperatorContextProvider";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsAiPage() {
  const { role } = useOperatorContext();
  return <div data-settings-route="ai"><WorkspaceHeader size="page" eyebrow="settings / providers" title="AI route" summary="Manage one global answer route and its explicit fallback order. Runtime authority stays server-side." accent="knowledge" /><div className="mt-6"><AIProviderSettingsPanel role={role} /></div></div>;
}
