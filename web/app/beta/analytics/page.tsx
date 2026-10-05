"use client";

import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";
import { YouTubeAnalyticsWorkspace } from "@/components/domain/ops/YouTubeAnalyticsWorkspace";
import { betaDestinationVisible } from "@/lib/beta/navigation";

export default function YouTubeAnalyticsPage() {
  const principal = useBetaPrincipal();
  if (!betaDestinationVisible("/beta/analytics", principal.environment)) {
    return <main className="p-6">This page is not available.</main>;
  }
  if (!principal.capabilities.includes("analytics:read")) {
    return <main className="p-6">Access is not granted.</main>;
  }
  return <main className="mx-auto w-full max-w-[var(--wtf-content-max)] px-4 py-6 sm:px-8 xl:px-12">
    <YouTubeAnalyticsWorkspace role={principal.role} />
  </main>;
}
