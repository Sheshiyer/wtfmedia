import { redirect } from "next/navigation";
import { OperatorsWorkspace } from "@/components/domain/ops/OperatorsWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function OperatorsPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/operators")) {
    redirect("/ops/recover?mode=reauthenticate");
  }

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="seats"
        title="operators"
        summary="seats and access gates are not in this release. this roster is not a live gate."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <OperatorsWorkspace role={context.role} />
      </div>
    </div>
  );
}
