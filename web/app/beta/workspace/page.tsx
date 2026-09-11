"use client";

import { useBetaPrincipal } from "@/components/domain/beta/BetaPrincipalGate";
import { ControlRoomStatusLedger } from "@/components/domain/ops/ControlRoomStatusLedger";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { LinkButton } from "@/components/ui/LinkButton";

export default function BetaWorkspacePage() {
  const principal = useBetaPrincipal();
  if (principal.kind !== "operator" || !["editor", "admin", "super_admin"].includes(principal.role)) return <main data-beta-workspace-denied>Access is not granted.</main>;
  const role = principal.role as "editor" | "admin" | "super_admin";
  return <div id="beta-workspace-main"><WorkspaceHeader size="control-room" eyebrow="run the show from the source" title="control room" summary="verified operator workspace. source evidence and capability boundaries stay server governed." accent="attention" primaryAction={<LinkButton href="/beta/workspace/production" variant="attention">open production</LinkButton>} /><div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><ControlRoomStatusLedger role={role} /></div></div>;
}
