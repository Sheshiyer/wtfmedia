"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { thumbnailUrl, fmtDuration, fmtViews } from "@/lib/episodes";
import { Drawer } from "@/components/ui/Drawer";
import { ScrollRail } from "@/components/patterns/ScrollRail";
import { Sparkle } from "@/components/Sparkle";
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
                  <div className="flex items-center justify-between mt-3 text-xs text-ink/50">
                    <span>{fmtViews(e.view_count)} views</span>
                    <span className="eyebrow text-wtf-purple">open ↗</span>
                  </div>
                </div>
              </button>
            ))}
          </ScrollRail>
        </section>
      ))}

      {selectedEpisode && (
        <EpisodeDetailDrawer
          ep={selectedEpisode}
          onClose={handleClose}
        />
      )}
    </>
  );
}

type Block = { t: number; text: string };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function EpisodeDetailDrawer({
  ep,
  onClose,
}: {
  ep: Episode;
  onClose: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setBlocks(null);
    setText(null);
    setErr(false);
    fetch(`/transcripts/${ep.video_id}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((snips: { t: number; x: string }[]) => {
        const out: Block[] = [];
        let cur: string[] = [];
        let start = snips[0]?.t ?? 0;
        let len = 0;
        for (const s of snips) {
          if (!cur.length) start = s.t;
          cur.push(s.x);
          len += s.x.length + 1;
          if (len >= 360) {
            out.push({ t: start, text: cur.join(" ") });
            cur = [];
            len = 0;
          }
        }
        if (cur.length) out.push({ t: start, text: cur.join(" ") });
        setBlocks(out);
      })
      .catch(() => {
        fetch(`/transcripts/${ep.video_id}.txt`)
          .then((r) => (r.ok ? r.text() : Promise.reject()))
          .then(setText)
          .catch(() => setErr(true));
      });
  }, [ep.video_id]);

  const askHref = `/chat?q=${encodeURIComponent(
    `About the episode "${ep.title}": give me the key takeaways and the most surprising thing said.`,
  )}`;

  return (
    <Drawer
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={ep.title}
      description={`${ep.playlist_title || "Episode"} · ${fmtDuration(ep.duration)} · ${fmtViews(ep.view_count)} views`}
      side="right"
    >
      <div className="flex flex-col h-full">
        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href={ep.url}
            target="_blank"
            rel="noreferrer"
            data-cursor="watch"
            className="pill px-4 py-2 bg-white text-sm hover:bg-ink hover:text-cream"
          >
            ▶ Watch on YouTube
          </a>
          <Link
            href={askHref}
            data-cursor="ask!"
            className="pill pill-solid px-4 py-2 text-sm inline-flex items-center gap-1.5"
          >
            <Sparkle size={14} color="#F1B333" /> Ask about this episode
          </Link>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow text-ink/45">transcript</span>
            {blocks && (
              <span className="text-[11px] text-ink/40">
                · click any line to jump to that moment
              </span>
            )}
          </div>
          {blocks === null && text === null && !err && (
            <p className="text-sm text-ink/50">Loading transcript…</p>
          )}
          {err && (
            <p className="text-sm text-ink/50">
              No transcript available for this episode.
            </p>
          )}
          {blocks && (
            <div className="space-y-2.5">
              {blocks.map((b, i) => (
                <a
                  key={i}
                  href={`${ep.url}&t=${Math.floor(b.t)}s`}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="jump"
                  className="group flex gap-3 rounded-lg p-2 -mx-2 hover:bg-white transition-colors"
                >
                  <span className="shrink-0 text-[11px] font-semibold bg-wtf-yellow border border-ink rounded px-1.5 h-fit py-0.5 group-hover:bg-wtf-red group-hover:text-cream transition-colors">
                    ▶ {fmtTime(b.t)}
                  </span>
                  <span className="text-sm leading-relaxed text-ink/80">
                    {b.text}
                  </span>
                </a>
              ))}
            </div>
          )}
          {text && !blocks && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink/80">
              {text}
            </p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
