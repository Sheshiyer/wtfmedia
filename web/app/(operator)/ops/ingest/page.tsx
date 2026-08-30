import { redirect } from "next/navigation";
import { IngestWorkspace } from "@/components/domain/ops/ingest";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function IngestPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/ingest")) {
    redirect("/ops/recover?mode=reauthenticate");
  }

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="source intake"
        title="ingest"
        summary="published and uncut intake. this release does not run ingest admin. nothing is inferred from a dead endpoint."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <IngestWorkspace />
      </div>
    </div>
  );
}
