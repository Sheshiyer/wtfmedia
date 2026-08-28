"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import type { Episode } from "@/lib/episodes";
import { thumbnailUrl, fmtDuration, fmtViews, groupByPlaylist } from "@/lib/episodes";
import { ScrollRail } from "@/components/patterns/ScrollRail";
import { EpisodeDrawer } from "@/components/domain/public/EpisodeDrawer";
import {
  readEpisodeParam,
  pushEpisode,
  replaceClearEpisode,
} from "@/lib/public/url-state";

const swatch = [
  "bg-wtf-yellow",
  "bg-wtf-orange",
  "bg-wtf-red text-cream",
  "bg-wtf-green text-cream",
  "bg-wtf-purple text-cream",
];

interface Props {
  data: { entries: Episode[] };
}

/**
 * Public episodes browser with URL-backed selection.
 *
 * Migrated from DragRow + local state + custom overlay to:
 * - URL-state (readEpisodeParam/pushEpisode/replaceClearEpisode)
 * - ScrollRail (native overflow, labelled controls, keyboard/touch/wheel)
 * - EpisodeDrawer (WTF Drawer primitive with Radix Dialog backing)
 *
 * Selection is `?episode=<public-video-id>` on `/episodes`.
 * Back/Forward/refresh/share reproduce the same selection.
 */
export default function EpisodesBrowser({ data }: Props) {
  const searchParams = useSearchParams();
  const selectedId = readEpisodeParam(searchParams);

  const groups = useMemo(() => groupByPlaylist(data.entries), [data.entries]);
  const allEpisodes = useMemo(() => data.entries, [data.entries]);

  const selectedEpisode = useMemo(
    () => (selectedId ? allEpisodes.find((e) => e.video_id === selectedId) ?? null : null),
    [selectedId, allEpisodes],
  );

  const handleOpen = useCallback((ep: Episode) => {
    pushEpisode(ep.video_id);
  }, []);

  const handleClose = useCallback(() => {
    replaceClearEpisode();
  }, []);

  return (
    <>
      {groups.map(([show, eps], gi) => (
        <section key={show} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className={`chip ${swatch[gi % swatch.length]}`}>{show}</span>
            <span className="text-xs text-ink/45">{eps.length} episodes</span>
          </div>

          <ScrollRail
            prevLabel={`Scroll ${show} episodes backward`}
            nextLabel={`Scroll ${show} episodes forward`}
          >
            {eps.map((e) => (
              <button
                key={e.video_id}
                onClick={() => handleOpen(e)}
                data-cursor="open"
                className="card overflow-hidden flex flex-col shrink-0 w-[300px] text-left"
              >
                <div className="relative aspect-video bg-ink/10">
                  <Image
                    src={thumbnailUrl(e.video_id)}
                    alt={e.title}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 right-2 chip bg-ink text-cream">
                    {fmtDuration(e.duration)}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-medium text-sm leading-snug line-clamp-3 flex-1">
                    {e.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-ink/70">
                    <span>{fmtViews(e.view_count)} views</span>
                    <span className="eyebrow text-wtf-purple">open ↗</span>
                  </div>
                </div>
              </button>
            ))}
          </ScrollRail>
        </section>
      ))}

      <EpisodeDrawer
        episode={selectedEpisode}
        onClose={handleClose}
      />
    </>
  );
}
