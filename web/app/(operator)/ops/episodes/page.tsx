import { redirect } from "next/navigation";
import { EpisodesCatalogWorkspace } from "@/components/domain/ops/episodes";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function EpisodesPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/episodes")) {
    redirect("/ops/recover?mode=reauthenticate");
  }

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="episode records"
        title="episodes"
        summary="episode records from the live source only. no fixture catalogue. uncut stays uncut."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <EpisodesCatalogWorkspace />
      </div>
    </div>
  );
}
