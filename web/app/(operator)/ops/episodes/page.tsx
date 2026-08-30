import { EpisodesCatalogWorkspace } from "@/components/domain/ops/episodes";
import { loadTitleMap } from "@/lib/catalogue/load-title-map";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default async function EpisodesPage() {
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
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
        <EpisodesCatalogWorkspace table={table} />
      </div>
    </div>
  );
}
