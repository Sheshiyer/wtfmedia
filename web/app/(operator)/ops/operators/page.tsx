import { OperatorsWorkspace } from "@/components/domain/ops/OperatorsWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { getVerifiedOpsContext } from "@/lib/ops/context";

export default async function OperatorsPage() {
  const context = await getVerifiedOpsContext();
  const role = context?.role === "super_admin" || context?.role === "admin" ? context.role : "editor";

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
        <OperatorsWorkspace role={role} />
      </div>
    </div>
  );
}
