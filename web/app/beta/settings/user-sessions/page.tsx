"use client";

import { AdminSessionsWorkspace } from "@/components/domain/beta/AdminSessionsWorkspace";
import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";

export default function BetaSettingsUserSessionsPage() {
  const principal = useBetaPrincipal();
  if (principal.kind !== "operator" || (principal.role !== "admin" && principal.role !== "super_admin")) return <p data-beta-admin-denied className="border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">Access is not granted.</p>;
  return <div className="grid gap-4" data-settings-user-sessions>
    <div>
      <h1 className="font-display text-2xl font-extrabold lowercase">user sessions</h1>
      <p className="mt-1 text-sm text-secondary">read-only history across every member workspace.</p>
    </div>
    <AdminSessionsWorkspace />
  </div>;
}
