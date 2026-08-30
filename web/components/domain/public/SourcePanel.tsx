/**
 * Public source citations for Ask WTF.
 *
 * Public citations can deep-link to a published YouTube moment. Uncut playback
 * is intentionally shown as unavailable until a trusted Worker projection
 * provides a signed asset link and verified timeline alignment.
 */

"use client";

import { useId } from "react";
import Link from "next/link";

export type SourceCitation = {
  episodeId?: string;
  title?: string;
  url?: string;
  videoId?: string;
  timeSec?: number | null;
};

export interface SourcePanelProps {
  sources: SourceCitation[];
}

function youtubeWatchUrl(videoId: string, timeSec: number | null): string {
  if (timeSec === null) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  }
  const timestamp = Math.max(0, Math.floor(timeSec));
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${timestamp}s`;
}

function formatPlaybackTimestamp(timeSec: number): string {
  const minutes = Math.floor(timeSec / 60);
  const seconds = Math.floor(timeSec % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const uncutPlaybackStatusId = useId();

  if (!sources || sources.length === 0) return null;

  return (
    <details
      className="rounded-control border border-foreground/15 bg-surface-raised/40 p-2.5 text-xs text-muted"
      data-testid="source-panel"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between font-medium transition-colors hover:text-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-attention">●</span>
          {sources.length} source{sources.length !== 1 ? "s" : ""} cited
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
          view sources
        </span>
      </summary>

      <div className="mt-3 space-y-3 border-t border-foreground/10 pt-2">
        <section
          aria-labelledby={citationPlaybackTitleId}
          className="rounded-control border border-foreground/15 bg-canvas/70 p-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p id={citationPlaybackTitleId} className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
                sources
              </p>
              <p id={uncutPlaybackStatusId} className="mt-0.5 text-[11px] text-muted">
                published moments are available. uncut playback waits on a verified mapping.
              </p>
            </div>
            <div className="inline-flex rounded border border-foreground/20 bg-surface-subtle p-0.5">
              <span className="rounded bg-attention px-2.5 py-1 text-[11px] font-bold text-on-attention">
                published
              </span>
              <button
                type="button"
                disabled
                aria-describedby={uncutPlaybackStatusId}
                className="cursor-not-allowed rounded px-2.5 py-1 text-[11px] text-muted opacity-70"
              >
                uncut unavailable
              </button>
            </div>
          </div>
        </section>

        <ul className="space-y-2.5 pl-1">
          {sources.map((source, index) => {
            const videoId = source.videoId;
            const label = source.title || source.episodeId || "WTF episode";
            const episodeHref = source.episodeId
              ? `/episodes?id=${encodeURIComponent(source.episodeId)}`
              : null;
            const publishedHref = videoId
              ? youtubeWatchUrl(videoId, source.timeSec ?? null)
              : null;

            return (
              <li
                key={`${source.episodeId ?? source.videoId ?? source.url ?? "source"}-${index}`}
                className="space-y-1.5 rounded border border-foreground/10 bg-canvas/40 p-2 transition-colors hover:bg-canvas/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-attention">[{index + 1}]</span>
                    {episodeHref ? (
                      <Link
                        href={episodeHref}
                        className="truncate font-medium text-foreground underline decoration-foreground/30 hover:decoration-foreground"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-foreground">{label}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-secondary">
                  <span className="rounded border border-attention/40 bg-attention/20 px-1.5 py-0.5 font-mono font-bold text-foreground">
                    {source.timeSec === null || source.timeSec === undefined
                      ? "timestamp unavailable"
                      : `published ${formatPlaybackTimestamp(source.timeSec)}`}
                  </span>
                  {publishedHref ? (
                    <a
                      href={publishedHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-surface-structure px-2 py-0.5 text-[10px] text-on-structure hover:opacity-90"
                    >
                      open published moment
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
