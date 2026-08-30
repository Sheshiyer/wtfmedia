import { redirect } from "next/navigation";
import { EpisodesCatalogWorkspace, TitleMapWorkspace } from "@/components/domain/ops/episodes";
import { loadTitleMap } from "@/lib/catalogue/load-title-map";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { requireVerifiedOpsContext } from "@/lib/ops/context";
import { canAccessOpsPath } from "@/lib/ops/policy";

export default async function EpisodesPage() {
  const context = await requireVerifiedOpsContext().catch(() => null);
  if (!context || !canAccessOpsPath(context.role, "/ops/episodes")) {
    redirect("/ops/recover?mode=reauthenticate");
  }
  const table = loadTitleMap();

  return (
    <div id="ops-main">
      <WorkspaceHeader
        size="page"
        eyebrow="episode records"
        title="episodes"
        summary="title map from the 2026-08-27 catalogue snapshot. not a live source. uncut is not activated."
        accent="attention"
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] space-y-8 px-4 py-8 sm:px-8 xl:px-12">
        <TitleMapWorkspace table={table} />
        <EpisodesCatalogWorkspace />
      </div>
    </div>
  );
}
