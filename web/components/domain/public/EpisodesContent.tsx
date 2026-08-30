"use client";

import Image from "next/image";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { thumbnailUrl, fmtDuration, fmtViews } from "@/lib/episodes";
import { ScrollRail } from "@/components/patterns/ScrollRail";
import { resolvePublicEpisodeUncutState } from "@/lib/catalogue/public-episode-uncut";

const swatch = [
  "bg-attention text-on-attention",
  "bg-information text-white",
  "bg-editorial text-white",
  "border-live bg-canvas text-foreground",
  "bg-knowledge text-on-knowledge",
];

interface EpisodesContentProps {
  groups: [string, Episode[]][];
}

export function EpisodesContent({ groups }: EpisodesContentProps) {
  return (
    <div className="space-y-10">
      {groups.map(([show, eps], gi) => (
        <section key={show}>
          <div className="mb-4 flex items-center gap-3">
            <h2 className={`chip ${swatch[gi % swatch.length]}`}>{show}</h2>
            <span className="text-xs font-medium text-secondary">{eps.length} episodes</span>
          </div>

          <div className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-3">
            {eps.map((e) => (
              <EpisodeSelectCard key={e.video_id} episode={e} />
            ))}
          </div>

          <div className="md:hidden">
            <ScrollRail
              prevLabel={`Scroll ${show} episodes backward`}
              nextLabel={`Scroll ${show} episodes forward`}
              regionLabel={`${show} episodes`}
            >
              {eps.map((e) => (
                <EpisodeSelectCard key={e.video_id} episode={e} compact />
              ))}
            </ScrollRail>
          </div>
        </section>
      ))}
    </div>
  );
}

function EpisodeSelectCard({
  episode,
  compact = false,
}: {
  episode: Episode;
  compact?: boolean;
}) {
  const uncutState = resolvePublicEpisodeUncutState(episode.title);

  return (
    <Link
      href={`/episodes/${encodeURIComponent(episode.video_id)}`}
      data-cursor="open"
      className={[
        "card flex shrink-0 overflow-hidden text-left",
        compact ? "w-[300px] flex-col" : "min-h-[13rem] w-full flex-col",
      ].join(" ")}
    >
      <div className="relative aspect-video bg-foreground/10">
        <Image
          src={thumbnailUrl(episode.video_id)}
          alt={episode.title}
          fill
          sizes={compact ? "300px" : "(min-width: 1280px) 28vw, (min-width: 768px) 44vw, 300px"}
          className="object-cover"
        />
        <span className="absolute bottom-2 right-2 chip bg-surface-structure text-on-structure">
          {fmtDuration(episode.duration)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-3 text-sm font-medium leading-snug">
          {episode.title}
        </h3>
        <div className="mt-3 text-[11px] leading-snug text-secondary line-clamp-2">
          {uncutState.kind === "candidate"
            ? "clean-cut pointer tracked. activation held."
            : uncutState.detail}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-secondary">
          <span>{fmtViews(episode.view_count)} views</span>
          <span className="eyebrow text-knowledge">open episode</span>
        </div>
      </div>
    </Link>
  );
}
