"use client";

import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { MemoryPreferencesPanel } from "@/components/domain/member/MemoryPreferencesPanel";
import { MemoryGovernancePanel } from "@/components/domain/ops/MemoryGovernancePanel";

export default function MemberMemorySettingsPage() {
  const principal = useBetaPrincipal();
  const operator = principal.kind === "operator";
  return (
    <div data-member-settings-route="memory">
      <WorkspaceHeader size="page" eyebrow="settings / preferences" title="your preferences" summary={operator ? "Set the personal preferences and custom instructions that guide your own workspace." : "Keep only the context you choose to save, separate from your conversation history."} accent="live" />
      <div className="mt-6">{operator ? <MemoryGovernancePanel /> : <MemoryPreferencesPanel />}</div>
    </div>
  );
}
