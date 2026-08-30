import { AuditWorkspace } from "@/components/domain/ops/AuditWorkspace";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default async function AuditPage() {

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="recorded evidence"
        title="audit"
        summary="allowlisted admin events only. empty means empty. this is not an access log for a gate that is off."
        accent="information"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <AuditWorkspace />
      </div>
    </div>
  );
}
