import { data, groupByPlaylist } from "@/lib/episodes";
import { EpisodesBrowser } from "@/components/EpisodesBrowser";
import { Sparkle } from "@/components/Sparkle";

export const metadata = { title: "Episodes · wtfmedia" };

export default function EpisodesPage() {
  const groups = groupByPlaylist(data.entries);
  return (
    <div className="halftone min-h-screen">
      <div className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-10">
          <div>
            <div className="eyebrow text-ink/55 mb-1">production library</div>
            <h1 className="display text-5xl sm:text-6xl flex items-center gap-3">
              episodes <Sparkle size={28} className="animate-twinkle" />
            </h1>
            <p className="text-ink/65 mt-2">
              {data.entry_count} episodes · {groups.length} shows · every word
              indexed for Ask WTF.
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

        <EpisodesBrowser groups={groups} />
      </div>
    </div>
  );
}
