/**
 * Public source citations for Ask WTF.
 *
 * Public citations can deep-link to a published YouTube moment. Uncut playback
 * is intentionally shown as unavailable until a trusted Worker projection
 * provides a signed asset link and verified timeline alignment.
 */

"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import { filterSourcesByMode, SOURCE_MODES, type SourceMode } from "@/lib/provenance/source-mode";
import { formatPlaybackTimestamp } from "@/lib/provenance/useDualPlayback";

export type SourceCitation = PublicSourceCitation;

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

function isApprovedFrameIoUrl(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:"
      && (hostname === "f.io" || hostname === "frame.io" || hostname.endsWith(".frame.io"));
  } catch {
    return false;
  }
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const uncutPlaybackStatusId = useId();
  const hasPublishedSources = sources.some((source) => source.sourceMode === "published");
  const hasUncutSources = sources.some((source) => source.sourceMode === "uncut");
  const [visibleMode, setVisibleMode] = useState<SourceMode>(() => {
    if (hasPublishedSources && hasUncutSources) return "both";
    if (hasUncutSources) return "uncut";
    return "published";
  });
  const visibleSources = filterSourcesByMode(sources, visibleMode);

  if (!sources || sources.length === 0) return null;

  return (
    <details
      className="rounded-control border-2 border-foreground bg-canvas p-3 text-xs text-secondary shadow-[4px_4px_0_var(--wtf-foreground)]"
      data-testid="source-panel"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 font-label font-bold lowercase text-foreground transition-colors hover:text-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-attention">●</span>
          {visibleSources.length} source{visibleSources.length !== 1 ? "s" : ""} cited
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
          view sources
        </span>
      </summary>

      <div className="mt-3 space-y-3 border-t-2 border-foreground pt-3">
        <section
          aria-labelledby={citationPlaybackTitleId}
          className="rounded-control border-2 border-foreground bg-surface-raised p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p id={citationPlaybackTitleId} className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
                sources
              </p>
              <p id={uncutPlaybackStatusId} className="mt-0.5 text-[11px] text-muted">
                {visibleSources.some((source) => source.sourceMode === "uncut" && source.mappingStatus === "mapped")
                  ? "uncut timestamps come from the response. no published time was converted."
                  : visibleMode === "uncut"
                    ? "uncut sources are shown here. timestamps appear only when mapped."
                    : visibleMode === "both"
                      ? "published and uncut sources are shown here. timestamps appear only when mapped."
                      : "published sources are shown here. timestamps appear only when mapped."}
              </p>
            </div>
            <div className="inline-flex rounded border border-foreground/20 bg-surface-subtle p-0.5" role="group" aria-label="filter cited sources by mode">
              {SOURCE_MODES.map((mode) => {
                const available = mode === "both" || (mode === "published" ? hasPublishedSources : hasUncutSources);
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={visibleMode === mode}
                    disabled={!available}
                    data-testid={`source-mode-filter-${mode}`}
                    onClick={() => setVisibleMode(mode)}
                    className={[
                      "rounded px-2.5 py-1 text-[11px] font-bold lowercase transition-colors",
                      visibleMode === mode
                        ? "bg-attention text-on-attention"
                        : available
                          ? "text-muted hover:text-foreground"
                          : "cursor-not-allowed text-muted/50",
                    ].join(" ")}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <ul className="space-y-2.5 pl-1">
          {visibleSources.length === 0 ? (
            <li className="rounded border border-foreground/10 bg-canvas/40 p-3 text-secondary">
              no {visibleMode} sources cited in this answer.
            </li>
          ) : visibleSources.map((source, index) => {
            const resolved = resolveCitation({
              ...source,
              requestedMode: source.sourceMode ?? "published",
            });
            const videoId = resolved.youtubeVideoId;
            const label = source.title || source.episodeId || "WTF episode";
            const episodeHref = source.episodeId
              ? `/episodes?id=${encodeURIComponent(source.episodeId)}`
              : null;
            const publishedHref = videoId
              ? youtubeWatchUrl(videoId, resolved.activeTimeSec)
              : null;
            const uncutHref = source.sourceMode === "uncut" && isApprovedFrameIoUrl(source.url)
              ? source.url
              : null;
            const playbackHref = source.sourceMode === "uncut" ? uncutHref : publishedHref;

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
                    {resolved.activeTimeSec === null
                      ? "timestamp unavailable"
                      : `${source.sourceMode === "uncut" ? "uncut" : "published"} ${formatPlaybackTimestamp(resolved.activeTimeSec)}`}
                  </span>
                  {playbackHref ? (
                    <a
                      href={playbackHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-surface-structure px-2 py-0.5 text-[10px] text-on-structure hover:opacity-90"
                    >
                      {source.sourceMode === "uncut" ? "open uncut source" : "open published moment"}
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
