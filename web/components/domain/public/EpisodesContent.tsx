"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import type { Episode } from "@/lib/episodes";
import { thumbnailUrl, fmtDuration, fmtViews } from "@/lib/episodes";
import { ScrollRail } from "@/components/patterns/ScrollRail";
import { EpisodeDrawer } from "@/components/domain/public/EpisodeDrawer";
import {
  readEpisodeParam,
  pushEpisode,
  replaceClearEpisode,
} from "@/lib/public/url-state";

const swatch = [
  "bg-attention text-on-attention",
  "bg-information text-on-information",
  "bg-editorial text-on-editorial",
  "border-live bg-canvas text-foreground",
  "bg-knowledge text-on-knowledge",
];

interface EpisodesContentProps {
  groups: [string, Episode[]][];
}

/**
 * Client component that reads `?episode=<public-video-id>` from the URL
 * and manages episode selection via push/replace history.
 *
 * Uses ScrollRail (accessible multi-input horizontal rail) instead of DragRow.
 * Drawer uses the Phase 1 Drawer primitive (Radix Dialog backing).
 */
export function EpisodesContent({ groups }: EpisodesContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const triggerRef = useRef<HTMLElement | null>(null);

  const selectedId = readEpisodeParam(searchParams);

  // Build a flat lookup for selected episode
  const allEpisodes = useMemo(
    () => groups.flatMap(([, eps]) => eps),
    [groups],
  );

  const selectedEpisode = useMemo(
    () => (selectedId ? allEpisodes.find((e) => e.video_id === selectedId) ?? null : null),
    [selectedId, allEpisodes],
  );

  // On direct load with ?episode=, replace to mark as "initial" so close
  // uses replace instead of push
  const isDirectLoad = useMemo(() => {
    if (typeof window === "undefined") return false;
    // If there's an episode param and we haven't replaced yet, it's a direct load
    return !!selectedId;
  }, [selectedId]);

  const handleOpen = useCallback(
    (ep: Episode) => {
      pushEpisode(ep.video_id);
    },
    [],
  );

  const handleClose = useCallback(() => {
    const trigger = triggerRef.current;
    replaceClearEpisode();
    // Restore focus after the URL change and any re-render completes
    if (trigger) {
      requestAnimationFrame(() => {
        trigger.focus();
      });
      triggerRef.current = null;
    }
  }, []);

  return (
    <>
      {groups.map(([show, eps], gi) => (
        <section key={show} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className={`chip ${swatch[gi % swatch.length]}`}>{show}</h2>
            <span className="text-xs font-medium text-secondary">{eps.length} episodes</span>
          </div>

          <ScrollRail
            prevLabel={`Scroll ${show} episodes backward`}
            nextLabel={`Scroll ${show} episodes forward`}
            regionLabel={`${show} episodes`}
          >
            {eps.map((e) => (
              <button
                key={e.video_id}
                onMouseDown={(ev) => { triggerRef.current = ev.currentTarget; }}
                onClick={() => handleOpen(e)}
                data-cursor="open"
                className="card overflow-hidden flex flex-col shrink-0 w-[300px] text-left"
              >
                <div className="relative aspect-video bg-foreground/10">
                  <Image
                    src={thumbnailUrl(e.video_id)}
                    alt={e.title}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 right-2 chip bg-surface-structure text-on-structure">
                    {fmtDuration(e.duration)}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-medium text-sm leading-snug line-clamp-3 flex-1">
                    {e.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-secondary">
                    <span>{fmtViews(e.view_count)} views</span>
                    <span className="eyebrow text-knowledge">open ↗</span>
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
