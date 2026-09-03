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
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import { formatPlaybackTimestamp } from "@/lib/provenance/useDualPlayback";
import { publicEpisodeHref } from "@/lib/public/chat-citations";

export type SourceCitation = PublicSourceCitation;

export interface SourcePanelProps {
  sources: SourceCitation[];
  citedIndices?: number[];
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

export function SourcePanel({ sources, citedIndices }: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const uncutPlaybackStatusId = useId();
  const hasPublishedSource = sources.some((source) => source.sourceMode !== "uncut");
  const hasUncutSource = sources.some((source) => source.sourceMode === "uncut");
  const hasMappedUncutSource = sources.some(
    (source) => source.sourceMode === "uncut" && source.mappingStatus === "mapped",
  );
  const citedSet = citedIndices ? new Set(citedIndices) : null;
  const citedCount = citedSet ? sources.filter((_, i) => citedSet.has(i + 1)).length : sources.length;
  const candidateCount = sources.length - citedCount;

  if (!sources || sources.length === 0) return null;

  return (
    <details
      className="rounded-control border-2 border-foreground bg-canvas p-3 text-xs text-secondary shadow-[4px_4px_0_var(--wtf-foreground)]"
      data-testid="source-panel"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 font-label font-bold lowercase text-foreground transition-colors hover:text-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-attention">●</span>
          {citedCount > 0
            ? `${citedCount} source${citedCount !== 1 ? "s" : ""} cited`
            : "no sources cited"}
          {candidateCount > 0
            ? `, ${candidateCount} candidate excerpt${candidateCount !== 1 ? "s" : ""}`
            : ""}
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
                {hasMappedUncutSource
                  ? "uncut timestamps come from the response. no published time was converted."
                  : hasUncutSource
                    ? "uncut evidence is present, but no verified uncut timestamp is available."
                    : "published moments are available. uncut stays unavailable until an uncut source is returned."}
              </p>
            </div>
            <div
              role="group"
              aria-label="Source modes present"
              className="inline-flex rounded border border-foreground/20 bg-surface-subtle p-0.5"
            >
              {hasPublishedSource ? (
                <span className="rounded bg-attention px-2.5 py-1 text-[11px] font-bold text-on-attention">
                  published
                </span>
              ) : null}
              {hasUncutSource ? (
                <span className={hasMappedUncutSource
                  ? "rounded bg-knowledge px-2.5 py-1 text-[11px] font-bold text-on-knowledge"
                  : "rounded bg-surface-subtle px-2.5 py-1 text-[11px] font-bold text-secondary"}>
                  uncut{hasMappedUncutSource ? "" : " unavailable"}
                </span>
              ) : (
                <span
                  aria-describedby={uncutPlaybackStatusId}
                  className="rounded px-2.5 py-1 text-[11px] text-muted opacity-70"
                >
                  uncut unavailable
                </span>
              )}
            </div>
          </div>
        </section>

        <ul className="space-y-2.5 pl-1">
          {sources.map((source, index) => {
            const resolved = resolveCitation({
              ...source,
              requestedMode: source.sourceMode ?? "published",
            });
            const videoId = resolved.youtubeVideoId;
            const label = source.title || source.episodeId || "WTF episode";
            const episodeHref = publicEpisodeHref(source);
            const publishedHref = videoId
              ? youtubeWatchUrl(videoId, resolved.activeTimeSec)
              : null;
            const uncutHref = source.sourceMode === "uncut" && isApprovedFrameIoUrl(source.url)
              ? source.url
              : null;
            const playbackHref = source.sourceMode === "uncut" ? uncutHref : publishedHref;
            const isCited = citedSet ? citedSet.has(index + 1) : true;

            return (
              <li
                key={`${source.episodeId ?? source.videoId ?? source.url ?? "source"}-${index}`}
                className={`space-y-1.5 rounded border p-2 transition-colors ${isCited ? "border-foreground/10 bg-canvas/40 hover:bg-canvas/70" : "border-foreground/5 bg-canvas/20 opacity-60"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className={`font-mono text-[10px] font-bold ${isCited ? "text-attention" : "text-muted"}`}>[{index + 1}]</span>
                    {!isCited && (
                      <span className="rounded bg-surface-subtle px-1 py-0.5 font-label text-[9px] uppercase tracking-wider text-muted">candidate</span>
                    )}
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
                      ? `${source.sourceMode === "uncut" ? "uncut" : "published"} timestamp unavailable`
                      : `${source.sourceMode === "uncut" ? "uncut" : "published"} ${formatPlaybackTimestamp(resolved.activeTimeSec)}`}
                  </span>
                  {playbackHref ? (
                    <a
                      href={playbackHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 items-center rounded-control border border-foreground bg-attention px-2.5 py-1 font-label text-[10px] font-bold lowercase tracking-wide text-on-attention transition-colors hover:bg-attention/85"
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
