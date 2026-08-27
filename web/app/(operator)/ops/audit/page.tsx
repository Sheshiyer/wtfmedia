import { redirect } from "next/navigation";
import { AuditWorkspace } from "@/components/domain/ops/AuditWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function AuditPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/audit")) {
    redirect("/ops/recover?mode=reauthenticate");
  }

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="recorded evidence"
        title="audit"
        summary="review only allowlisted administrative evidence."
        accent="information"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <AuditWorkspace />
      </div>
    </div>
  );
}
