import { EpisodesCatalogWorkspace } from "@/components/domain/ops/episodes";
import { loadTitleMap } from "@/lib/catalogue/load-title-map";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function BetaEpisodesPage() {
  return <div id="beta-workspace-episodes"><WorkspaceHeader size="page" eyebrow="episode records" title="episodes" summary="approved source mappings and known alignment limits." accent="attention" /><div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12"><EpisodesCatalogWorkspace table={loadTitleMap()} /></div></div>;
}
