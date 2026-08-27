import { Suspense } from "react";
import { data, groupByPlaylist } from "@/lib/episodes";
import { LinkButton } from "@/components/ui/LinkButton";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { EpisodesContent } from "./EpisodesContent";

/**
 * Server/Suspense boundary for the migrated Episodes route.
 *
 * The variant selector (`publicUiVariant()`) remains server-only.
 * The client query consumer (`EpisodesContent`) reads `?episode=` from
 * the URL and manages selection via push/replace history.
 */
export default function MigratedEpisodesPage() {
  const groups = groupByPlaylist(data.entries);

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas">
      <WorkspaceHeader
        eyebrow="source inventory"
        title="episodes"
        summary="open a conversation, inspect the transcript, and keep the exact source beside every grounded moment."
        accent="information"
        context={
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/65">
            <span>{data.entry_count} indexed episodes</span>
            <span>{groups.length} catalogue shows</span>
            <span>public projection</span>
          </div>
        }
        primaryAction={
          <LinkButton href={data.source_url} external variant="secondary">
            source channel ↗
          </LinkButton>
        }
      />
      <div className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12 xl:py-12">
        <Suspense fallback={<EpisodesSkeleton />}>
          <EpisodesContent groups={groups} />
        </Suspense>
      </div>
    </div>
  );
}

function EpisodesSkeleton() {
  return (
    <div className="space-y-12" role="status" aria-label="Loading episodes">
      {[0, 1].map((i) => (
        <div key={i}>
          <div className="h-6 w-32 bg-ink/10 rounded mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="shrink-0 w-[300px] h-[240px] bg-ink/5 rounded-lg"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
