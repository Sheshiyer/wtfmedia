/**
 * Public source citations for Ask WTF.
 *
 * The answer's retrieval scope is immutable. The controls in this panel only
 * change which returned evidence is visible; they never trigger or relabel a
 * retrieval. Every moment keeps its source-native timeline and action.
 */

"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import { SOURCE_MODES, type SourceMode } from "@/lib/provenance/source-mode";
import { formatPlaybackTimestamp } from "@/lib/provenance/useDualPlayback";
import { publicEpisodeHref } from "@/lib/public/chat-citations";
import {
  buildSourcePanelModel,
  type AnswerQueryScope,
  type SourcePanelEntry,
  type SourcePanelGroup,
} from "@/lib/public/source-panel-model";

export type SourceCitation = PublicSourceCitation;

export interface SourcePanelProps {
  sources: SourceCitation[];
  citedIndices?: number[];
  queryScope?: AnswerQueryScope;
  effectiveSourceMode?: SourceMode;
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

/**
 * Timestamp-certainty label. The badge reports how sure we are of the
 * moment's timestamp (see timestampConfidence on the edge worker), not how
 * well the excerpt matches the question — content match strength only drives
 * the order sources are listed in.
 */
function timestampTier(source: PublicSourceCitation): { label: string; percent: number | null } {
  const confidence = source.timestampConfidence;
  if (typeof confidence === "number" && Number.isFinite(confidence) && confidence > 0) {
    const percent = Math.round(confidence * 100);
    if (confidence >= 0.9) return { label: "verified time", percent };
    if (confidence >= 0.5) return { label: "time estimated", percent };
    return { label: "time uncertain", percent };
  }
  return source.timestampStatus === "verified"
    ? { label: "verified time", percent: null }
    : { label: "time uncertain", percent: null };
}

function SourceEvidenceRow({ entry }: { entry: SourcePanelEntry }) {
  const { source, sourceMode } = entry;
  const resolved = resolveCitation({
    ...source,
    sourceMode,
    requestedMode: sourceMode,
  });
  const timestampStatus = resolved.activeTimeSec === null
    ? source.timestampStatus === "requested_timeline_unavailable"
      ? "requested_timeline_unavailable"
      : "source_timing_unavailable"
    : source.timestampStatus === "source_timing_unavailable"
      || source.timestampStatus === "requested_timeline_unavailable"
      ? source.timestampStatus
      : "verified";
  const verifiedTimeSec = timestampStatus === "verified" ? resolved.activeTimeSec : null;
  const videoId = resolved.youtubeVideoId;
  const publishedHref = videoId ? youtubeWatchUrl(videoId, verifiedTimeSec) : null;
  const uncutHref = sourceMode === "uncut" && isApprovedFrameIoUrl(source.url)
    ? source.url
    : null;
  const playbackHref = sourceMode === "uncut" ? uncutHref : publishedHref;
  const timestampReason = source.timestampReason
    ?? (sourceMode === "uncut"
      ? "This approved uncut transcript has no verified uncut timestamp; no published time was inferred."
      : "This published transcript was ingested without timestamp data; the link opens the full episode.");

  return (
    <div
      className={`space-y-1.5 rounded border p-2 transition-colors ${entry.isCited
        ? "border-foreground/10 bg-canvas/50 hover:bg-canvas/75"
        : "border-foreground/5 bg-canvas/20"}`}
      data-testid="source-evidence-row"
      data-evidence-kind={entry.isCited ? "citation" : "candidate"}
      data-source-index={entry.citationNumber}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`font-mono text-[10px] font-bold ${entry.isCited ? "text-foreground" : "text-muted"}`}>
            {entry.evidenceId}
          </span>
          {(() => {
            const tier = timestampTier(source);
            return (
              <span
                className="rounded bg-surface-subtle px-1 py-0.5 font-label text-[9px] uppercase tracking-wider text-muted"
                title={`timestamp confidence${tier.percent === null ? "" : ` ${tier.percent}%`} — how sure we are of this moment's timestamp; sources are ordered by content match, strongest first`}
              >
                {tier.label}{tier.percent === null ? "" : ` · ${tier.percent}%`}
              </span>
            );
          })()}
        </div>
        <span className="flex items-center gap-1.5">
          <span className="rounded border border-attention/40 bg-attention/20 px-1.5 py-0.5 font-mono font-bold text-foreground">
            {verifiedTimeSec === null
              ? `${sourceMode} time unavailable`
              : `${sourceMode} ${formatPlaybackTimestamp(verifiedTimeSec)}`}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-end gap-2">
        {playbackHref ? (
          <a
            href={playbackHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center rounded-control border border-foreground bg-attention px-2.5 py-1 font-label text-[10px] font-bold lowercase tracking-wide text-on-attention transition-colors hover:bg-attention/85"
          >
            {sourceMode === "uncut"
              ? "open uncut source"
              : timestampStatus === "verified"
                ? "open published moment"
                : "open full published episode"}
          </a>
        ) : null}
      </div>

      {timestampStatus !== "verified" ? (
        <p className="text-[10px] leading-relaxed text-muted" data-testid="timestamp-reason">
          {timestampReason}
        </p>
      ) : null}
    </div>
  );
}

function SourceEpisodeGroup({ group }: { group: SourcePanelGroup }) {
  const episodeHref = publicEpisodeHref(group.entries[0]?.source);
  const candidateOnly = group.citedEntries.length === 0;

  return (
    <li
      className={`rounded-control border p-2.5 ${candidateOnly
        ? "border-foreground/10 bg-canvas/20"
        : "border-foreground/20 bg-canvas/45"}`}
      data-testid="source-episode-group"
      data-episode-key={group.key}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-label text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
            {candidateOnly ? "candidate episode" : "cited episode"}
          </p>
          {episodeHref ? (
            <Link
              href={episodeHref}
              className="block truncate font-medium text-foreground underline decoration-foreground/30 hover:decoration-foreground"
            >
              {group.label}
            </Link>
          ) : (
            <p className="truncate font-medium text-foreground">{group.label}</p>
          )}
        </div>
        {group.citedEntries.length > 0 ? (
          <span className="rounded bg-attention/20 px-1.5 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-foreground">
            {group.citedEntries.length} cited
          </span>
        ) : null}
      </div>

      {group.citedEntries.length > 0 ? (
        <div className="mt-2 space-y-2">
          {group.citedEntries.map((entry) => (
            <SourceEvidenceRow key={entry.originalIndex} entry={entry} />
          ))}
        </div>
      ) : null}

      {group.candidateEntries.length > 0 ? (
        <div className="mt-2 space-y-2 border-t border-foreground/10 pt-2" data-testid="candidate-evidence">
          <p className="font-label text-[10px] font-bold lowercase text-muted">
            {group.candidateEntries.length} candidate excerpt{group.candidateEntries.length !== 1 ? "s" : ""}
            <span className="ml-1 font-normal">· retrieval context</span>
          </p>
          {group.candidateEntries.map((entry) => (
            <SourceEvidenceRow key={entry.originalIndex} entry={entry} />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function initialVisibleMode(
  hasPublishedSource: boolean,
  hasUncutSource: boolean,
  effectiveSourceMode: SourceMode | undefined,
): SourceMode {
  if (effectiveSourceMode === "published" && hasPublishedSource) return "published";
  if (effectiveSourceMode === "uncut" && hasUncutSource) return "uncut";
  if (effectiveSourceMode === "both" && hasPublishedSource && hasUncutSource) return "both";
  if (hasPublishedSource && hasUncutSource) return "both";
  return hasUncutSource ? "uncut" : "published";
}

export function SourcePanel({
  sources,
  citedIndices,
  queryScope,
  effectiveSourceMode,
}: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const hasPublishedSource = sources.some((source) => source.sourceMode !== "uncut");
  const hasUncutSource = sources.some((source) => source.sourceMode === "uncut");
  const [visibleMode, setVisibleMode] = useState<SourceMode>(() => initialVisibleMode(
    hasPublishedSource,
    hasUncutSource,
    effectiveSourceMode,
  ));
  const model = buildSourcePanelModel({ sources, citedIndices, visibleMode });
  const visibleEntries = model.groups.flatMap((group) => group.entries);
  const hasMappedUncutSource = visibleEntries.some(
    ({ source, sourceMode }) => sourceMode === "uncut" && source.mappingStatus === "mapped",
  );
  const hasVisibleUncutSource = visibleEntries.some(({ sourceMode }) => sourceMode === "uncut");
  const hasUntimedPublishedSource = visibleEntries.some(
    ({ source, sourceMode }) => sourceMode === "published" && source.timestampStatus === "source_timing_unavailable",
  );

  if (!sources || sources.length === 0) return null;

  return (
    <details
      className="rounded-control border-2 border-foreground bg-canvas p-3 text-xs text-secondary shadow-[4px_4px_0_var(--wtf-foreground)]"
      data-testid="source-panel"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 font-label font-bold lowercase text-foreground transition-colors hover:text-foreground">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="font-bold text-attention">●</span>
          <span>
            {model.totalCitedCount > 0
              ? `${model.totalCitedCount} source${model.totalCitedCount !== 1 ? "s" : ""} cited`
              : "no sources cited"}
            {model.visibleCandidateCount > 0
              ? `, ${model.visibleCandidateCount} candidate excerpt${model.visibleCandidateCount !== 1 ? "s" : ""}`
              : ""}
          </span>
          {model.hiddenCitedCount > 0 ? (
            <span className="font-normal text-muted">· {model.hiddenCitedCount} cited hidden</span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-col items-end text-right">
          {queryScope ? (
            <span
              className="font-label text-[10px] font-bold normal-case leading-tight text-foreground"
              data-testid="answer-query-scope"
            >
              <span className="block">searched: {queryScope.sourceMode}</span>
              <span className="block font-normal text-muted">
                {queryScope.episodeId ? `episode scope: ${queryScope.episodeId}` : "catalogue scope"}
              </span>
              {effectiveSourceMode ? (
                <span className="block font-normal text-muted">returned evidence: {effectiveSourceMode}</span>
              ) : null}
            </span>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
            view sources
          </span>
        </span>
      </summary>

      <div className="mt-3 space-y-3 border-t-2 border-foreground pt-3">
        <section
          aria-labelledby={citationPlaybackTitleId}
          className="rounded-control border-2 border-foreground bg-surface-raised p-3"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <p id={citationPlaybackTitleId} className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
                sources
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {hasMappedUncutSource
                  ? "uncut timestamps come from the response. no published time was converted."
                  : hasVisibleUncutSource
                    ? "uncut evidence is present, but no verified uncut timestamp is available."
                    : hasUntimedPublishedSource
                      ? "some published transcripts have no source timing; those links open the full episode."
                      : "published moments are shown. uncut appears only when a relevant approved excerpt is returned."}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-label text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                view this answer only
              </p>
              <div
                role="group"
                aria-label="View evidence returned for this answer (view only)"
                className="inline-flex max-w-full rounded border border-foreground/20 bg-surface-subtle p-0.5"
              >
                {SOURCE_MODES.map((mode) => {
                  const available = mode === "published"
                    ? hasPublishedSource
                    : mode === "uncut"
                      ? hasUncutSource
                      : hasPublishedSource && hasUncutSource;

                  return (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`source-mode-filter-${mode}`}
                      disabled={!available}
                      aria-pressed={visibleMode === mode}
                      onClick={() => setVisibleMode(mode)}
                      className={visibleMode === mode
                        ? "min-h-8 rounded bg-attention px-2.5 py-1 text-[11px] font-bold text-on-attention"
                        : "min-h-8 rounded px-2.5 py-1 text-[11px] text-muted disabled:cursor-not-allowed disabled:opacity-40"}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {model.hiddenCitedCount > 0 ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-attention/50 bg-attention/10 px-3 py-2"
            data-testid="hidden-citation-notice"
            role="status"
          >
            <p className="font-label text-[11px] font-bold text-foreground">
              {model.hiddenCitedCount} cited source{model.hiddenCitedCount !== 1 ? "s" : ""} hidden
              <span className="ml-1 font-normal text-muted">
                · {model.visibleCitedCount} of {model.totalCitedCount} visible
              </span>
            </p>
            <button
              type="button"
              onClick={() => setVisibleMode("both")}
              className="min-h-8 rounded-control border border-foreground bg-canvas px-2.5 py-1 font-label text-[10px] font-bold lowercase text-foreground"
            >
              show all cited sources
            </button>
          </div>
        ) : null}

        <ol className="space-y-2.5 pl-0">
          {model.primaryGroups.map((group) => (
            <SourceEpisodeGroup key={group.key} group={group} />
          ))}
          {model.overflowGroups.length > 0 ? (
            <li>
              <details
                className="rounded-control border border-foreground/15 bg-canvas/20 p-2.5"
                data-testid="more-matches"
              >
                <summary className="cursor-pointer select-none font-label text-[10px] font-bold lowercase tracking-wide text-muted transition-colors hover:text-foreground">
                  show {model.overflowEntryCount} more match{model.overflowEntryCount !== 1 ? "es" : ""}
                  <span className="ml-1 font-normal">· weaker content matches</span>
                </summary>
                <ol className="mt-2.5 space-y-2.5 pl-0">
                  {model.overflowGroups.map((group) => (
                    <SourceEpisodeGroup key={group.key} group={group} />
                  ))}
                </ol>
              </details>
            </li>
          ) : null}
        </ol>
      </div>
    </details>
  );
}
