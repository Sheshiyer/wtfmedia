"use client";

import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";
import { YouTubeAnalyticsWorkspace } from "@/components/domain/ops/YouTubeAnalyticsWorkspace";

export default function YouTubeAnalyticsPage() {
  const principal = useBetaPrincipal();
  if (principal.kind !== "operator" || !principal.capabilities.includes("analytics:read") ||
      (principal.role !== "editor" && principal.role !== "admin" && principal.role !== "super_admin")) {
    return <main className="p-6">Access is not granted.</main>;
  }
  return <main className="mx-auto w-full max-w-[var(--wtf-content-max)] px-4 py-6 sm:px-8 xl:px-12">
    <YouTubeAnalyticsWorkspace role={principal.role} />
  </main>;
}
