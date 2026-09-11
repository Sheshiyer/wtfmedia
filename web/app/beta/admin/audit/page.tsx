import { AuditWorkspace } from "@/components/domain/ops/AuditWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function BetaAuditPage() {
  return <div id="beta-admin-audit"><WorkspaceHeader size="page" eyebrow="admin / audit" title="audit" summary="allowlisted events only; an empty ledger remains empty." accent="information" /><div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><AuditWorkspace /></div></div>;
}
