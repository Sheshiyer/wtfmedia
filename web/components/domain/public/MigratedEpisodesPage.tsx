import { Suspense } from "react";
import { data, groupByPlaylist } from "@/lib/episodes";
import { Sparkle } from "@/components/Sparkle";
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
    <div className="halftone min-h-screen">
      <div className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-10">
          <div>
            <h1 className="display text-5xl sm:text-6xl flex items-center gap-3">
              every episode <Sparkle size={28} className="animate-twinkle" />
            </h1>
            <p className="serif text-xl text-ink/70 mt-3 max-w-[44ch]">
              {data.entry_count} conversations, {groups.length} shows, every word
              read into Ask WTF. Open one to jump straight to a moment.
            </p>
          </div>
          <a
            href={data.source_url}
            target="_blank"
            rel="noreferrer"
            data-cursor="↗"
            className="pill px-5 py-2.5 bg-cream hover:bg-ink hover:text-cream"
          >
            Source channel ↗
          </a>
        </div>

        <Suspense fallback={<EpisodesSkeleton />}>
          <EpisodesContent groups={groups} />
        </Suspense>
      </div>
    </div>
  );
}

function EpisodesSkeleton() {
  return (
    <div className="space-y-12" aria-label="Loading episodes">
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
