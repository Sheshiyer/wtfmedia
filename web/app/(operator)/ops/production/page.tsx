import { redirect } from "next/navigation";
import { ProductionWorkspace } from "@/components/domain/ops/ProductionWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function ProductionPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/production")) {
    redirect("/ops/recover?mode=reauthenticate");
  }

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="calendar and board"
        title="production"
        summary="same records, two views. delete is unavailable. owners stay empty until assigned."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <ProductionWorkspace />
      </div>
    </div>
  );
}
