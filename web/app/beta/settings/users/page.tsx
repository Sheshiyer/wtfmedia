"use client";

import { OperatorsWorkspace } from "@/components/domain/ops/OperatorsWorkspace";
import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";

export default function BetaSettingsUsersPage() {
  const principal = useBetaPrincipal();
  if (principal.kind !== "operator" || (principal.role !== "admin" && principal.role !== "super_admin")) return <p data-beta-admin-denied className="border-2 border-foreground/20 bg-surface-subtle p-5 text-sm text-secondary">Access is not granted.</p>;
  return <div className="grid gap-4" data-settings-users>
    <div>
      <h1 className="font-display text-2xl font-extrabold lowercase">users & access</h1>
      <p className="mt-1 text-sm text-secondary">membership lifecycle and invitations remain server-authorized.</p>
    </div>
    <OperatorsWorkspace role={principal.role} />
  </div>;
}
