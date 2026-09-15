"use client";

import { AdminSessionsWorkspace } from "@/components/domain/beta/AdminSessionsWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";

export default function BetaAdminSessionsPage() {
  const principal = useBetaPrincipal();
  if (principal.kind !== "operator" || (principal.role !== "admin" && principal.role !== "super_admin")) return <main data-beta-admin-denied>Access is not granted.</main>;
  return <div id="beta-admin-sessions"><WorkspaceHeader size="page" eyebrow="admin / sessions" title="user sessions" summary="read-only history across every member workspace." accent="information" /><div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><AdminSessionsWorkspace /></div></div>;
}
