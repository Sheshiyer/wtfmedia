/**
 * Public source citations for Ask WTF.
 *
 * Public citations can deep-link to a published YouTube moment or an approved
 * Frame.io source. Uncut playback remains unavailable until timeline alignment
 * and a trusted media projection are separately verified.
 */

"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import { formatPlaybackTimestamp } from "@/lib/provenance/useDualPlayback";
import { filterSourcesByMode } from "@/lib/provenance/source-mode";

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

/**
 * Match-strength label for a citation's retrieval score. Sources arrive in
 * score order from the edge (most matched first); the badge makes that
 * ranking visible. Thresholds follow the retrieval floor (0.45).
 */
function matchTier(score: number): string {
  if (score >= 0.7) return "strong match";
  if (score >= 0.55) return "medium match";
  return "loose match";
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const uncutPlaybackStatusId = useId();
  const hasPublishedSources = sources.some((source) => source.sourceMode === "published");
  const hasUncutSources = sources.some((source) => source.sourceMode === "uncut");
  const [visibleMode, setVisibleMode] = useState<"published" | "uncut" | "both">(() => {
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
            <div className="inline-flex rounded border border-foreground/20 bg-surface-subtle p-0.5" aria-label="source mode filter">
              {(["published", "uncut", "both"] as const).map((mode) => {
                const available = mode === "published"
                  ? hasPublishedSources
                  : mode === "uncut"
                    ? hasUncutSources
                    : hasPublishedSources && hasUncutSources;
                return (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`source-mode-filter-${mode}`}
                    disabled={!available}
                    aria-pressed={visibleMode === mode}
                    onClick={() => setVisibleMode(mode)}
                    className={visibleMode === mode
                      ? "rounded bg-attention px-2.5 py-1 text-[11px] font-bold text-on-attention"
                      : "rounded px-2.5 py-1 text-[11px] text-muted disabled:cursor-not-allowed disabled:opacity-40"}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <ul className="space-y-2.5 pl-1">
          {visibleSources.map((source, index) => {
            const resolved = resolveCitation({
              ...source,
              requestedMode: source.sourceMode ?? "published",
            });
            const videoId = resolved.youtubeVideoId;
            const label = source.title || source.episodeId || "WTF episode";
            const episodeHref = source.episodeId
              ? `/episodes?id=${encodeURIComponent(source.episodeId)}`
              : null;
            const uncutHref = source.sourceMode === "uncut" && source.url?.startsWith("https://")
              ? source.url
              : null;
            const publishedHref = videoId && source.sourceMode !== "uncut"
              ? youtubeWatchUrl(videoId, resolved.activeTimeSec)
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
                  {typeof source.score === "number" && source.score > 0 ? (
                    <span
                      className="rounded border border-foreground/20 bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold text-secondary"
                      title={`retrieval confidence ${(source.score * 100).toFixed(1)}% — sources are listed most matched first`}
                    >
                      {matchTier(source.score)} · {Math.round(source.score * 100)}%
                    </span>
                  ) : null}
                  {resolved.activeTimeSec !== null ? (
                    <span className="rounded border border-attention/40 bg-attention/20 px-1.5 py-0.5 font-mono font-bold text-foreground">
                      {`${source.sourceMode === "uncut" ? "uncut" : "published"} ${formatPlaybackTimestamp(resolved.activeTimeSec)}`}
                    </span>
                  ) : null}
                  {uncutHref ? (
                    <a
                      href={uncutHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-surface-structure px-2 py-0.5 text-[10px] text-on-structure hover:opacity-90"
                    >
                      open Frame.io source
                    </a>
                  ) : publishedHref ? (
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
