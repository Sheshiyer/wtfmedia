import { ProductionWorkspace } from "@/components/domain/ops/ProductionWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default async function ProductionPage() {
  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="calendar and board"
        title="production"
        summary="shoots, releases, dubbing and dependencies in one shared calendar."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <ProductionWorkspace />
      </div>
    </div>
  );
}
