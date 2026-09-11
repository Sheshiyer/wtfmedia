"use client";

import { OperatorsWorkspace } from "@/components/domain/ops/OperatorsWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";

export default function BetaUsersPage() {
  const principal = useBetaPrincipal();
  return <div id="beta-admin-users"><WorkspaceHeader size="page" eyebrow="admin / users" title="company users" summary="membership lifecycle and invitations remain server-authorized." accent="information" /><div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><OperatorsWorkspace role={principal.role === "super_admin" || principal.role === "admin" ? principal.role : "editor"} /></div></div>;
}
