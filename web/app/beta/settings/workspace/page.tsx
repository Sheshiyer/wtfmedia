"use client";

import { BetaSettingsNavigation } from "@/components/domain/beta/BetaSettingsNavigation";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function BetaWorkspaceSettingsPage() {
  return <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:px-12"><BetaSettingsNavigation /><section><WorkspaceHeader size="page" eyebrow="settings / workspace" title="operator settings" summary="Each area follows the edge-projected capability ledger; browser visibility never grants access." accent="information" /></section></div>;
}
