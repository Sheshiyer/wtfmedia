/**
 * Public episode detail drawer.
 *
 * It supports public YouTube playback and transcript deep-links. The Uncut
 * control is deliberately unavailable until an authenticated Worker returns a
 * signed asset projection and verified timeline alignment.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Episode } from "@/lib/episodes";
import { fmtDuration, fmtViews } from "@/lib/episodes";
import { Drawer } from "@/components/ui/Drawer";
import { Sparkle } from "@/components/Sparkle";

type TranscriptBlock = { t: number; text: string };

function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  return hours > 0
    ? `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function youtubeWatchUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.max(0, Math.floor(seconds))}s`;
}

function youtubeEmbedUrl(videoId: string, seconds: number): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?start=${Math.max(0, Math.floor(seconds))}&rel=0`;
}

export interface EpisodeDrawerProps {
  /** The episode to display, or null to close. */
  episode: Episode | null;
  /** Callback when the drawer should close. */
  onClose: () => void;
}

export function EpisodeDrawer({ episode, onClose }: EpisodeDrawerProps) {
  const [blocks, setBlocks] = useState<TranscriptBlock[] | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [seekSeconds, setSeekSeconds] = useState(0);

  useEffect(() => {
    if (!episode) return;

    let active = true;
    setBlocks(null);
    setText(null);
    setLoadError(false);
    setPlayerOpen(false);
    setSeekSeconds(0);

    const loadTranscript = async () => {
      try {
        const transcriptId = encodeURIComponent(episode.video_id);
        const jsonResponse = await fetch(`/transcripts/${transcriptId}.json`);
        if (jsonResponse.ok) {
          const snips = await jsonResponse.json() as Array<{ t?: unknown; x?: unknown }>;
          if (!Array.isArray(snips)) throw new Error("invalid_transcript_json");

          const nextBlocks: TranscriptBlock[] = [];
          let current: string[] = [];
          let start = 0;
          let length = 0;

          for (const snip of snips) {
            const timestamp = Number(snip.t);
            const content = typeof snip.x === "string" ? snip.x.trim() : "";
            if (!Number.isFinite(timestamp) || timestamp < 0 || !content) continue;
            if (current.length === 0) start = timestamp;
            current.push(content);
            length += content.length + 1;
            if (length >= 360) {
              nextBlocks.push({ t: start, text: current.join(" ") });
              current = [];
              length = 0;
            }
          }
          if (current.length > 0) nextBlocks.push({ t: start, text: current.join(" ") });
          if (active) setBlocks(nextBlocks);
          return;
        }

        const textResponse = await fetch(`/transcripts/${transcriptId}.txt`);
        if (!textResponse.ok) throw new Error("transcript_not_found");
        if (active) setText(await textResponse.text());
      } catch {
        if (active) setLoadError(true);
      }
    };

    void loadTranscript();
    return () => {
      active = false;
    };
  }, [episode]);

  const embedUrl = useMemo(
    () => episode ? youtubeEmbedUrl(episode.video_id, seekSeconds) : "",
    [episode, seekSeconds],
  );

  if (!episode) return null;

  const askHref = `/chat?q=${encodeURIComponent(
    `About the episode "${episode.title}": give me the key takeaways and the most surprising thing said.`,
  )}`;
  const uncutStatusId = `uncut-status-${episode.video_id}`;

  const jumpToMoment = (seconds: number) => {
    setSeekSeconds(seconds);
    setPlayerOpen(true);
  };

  return (
    <Drawer
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={episode.title}
      description={`${episode.playlist_title || "Episode"} · ${fmtDuration(episode.duration)} · ${fmtViews(episode.view_count)} views`}
      side="right"
    >
      <div className="flex h-full flex-col space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-foreground/15 pb-4">
          <button
            type="button"
            onClick={() => setPlayerOpen((open) => !open)}
            aria-expanded={playerOpen}
            aria-controls="published-youtube-player"
            data-cursor="watch"
            className="pill bg-surface-raised px-4 py-2 text-sm text-foreground hover:bg-surface-structure hover:text-on-structure"
          >
            {playerOpen ? "Hide YouTube player" : "Play on YouTube"}
          </button>
          <button
            type="button"
            disabled
            aria-describedby={uncutStatusId}
            className="pill cursor-not-allowed bg-surface-subtle px-4 py-2 text-sm text-muted opacity-75"
          >
            Uncut · connection required
          </button>
          <Link
            href={askHref}
            data-cursor="ask!"
            className="pill pill-solid inline-flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Sparkle size={14} /> Ask about this episode
          </Link>
        </div>

        <p id={uncutStatusId} role="status" className="text-xs leading-relaxed text-secondary">
          Uncut playback will appear after a verified Cloudflare asset link and timeline alignment are approved for this episode.
        </p>

        {playerOpen ? (
          <section id="published-youtube-player" aria-label="Published YouTube player" className="overflow-hidden rounded-panel border-2 border-foreground bg-canvas">
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={`Published YouTube video: ${episode.title}`}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </section>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-3 flex items-center gap-2">
            <span className="eyebrow text-secondary">public transcript</span>
            {blocks ? <span className="text-[11px] text-muted">· jump to a published YouTube moment</span> : null}
          </div>

          {blocks === null && text === null && !loadError ? <p className="text-sm text-secondary">Loading transcript…</p> : null}
          {loadError ? <p className="text-sm text-secondary">No public transcript is available for this episode.</p> : null}

          {blocks ? (
            <div className="space-y-2.5">
              {blocks.map((block, index) => (
                <article key={`${block.t}-${index}`} className="-mx-2 flex gap-3 rounded-lg p-2 transition-colors hover:bg-surface-subtle">
                  <button
                    type="button"
                    onClick={() => jumpToMoment(block.t)}
                    className="h-fit shrink-0 rounded border border-foreground bg-attention px-1.5 py-0.5 text-[11px] font-semibold text-on-attention transition-colors hover:bg-editorial hover:text-on-editorial"
                    aria-label={`Play published video at ${formatTime(block.t)}`}
                  >
                    ▶ {formatTime(block.t)}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm leading-relaxed text-secondary">{block.text}</p>
                    <a
                      href={youtubeWatchUrl(episode.video_id, block.t)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[11px] text-secondary underline hover:text-foreground"
                    >
                      Open this moment on YouTube
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {text && !blocks ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary">{text}</p> : null}
        </div>
      </div>
    </Drawer>
  );
}
