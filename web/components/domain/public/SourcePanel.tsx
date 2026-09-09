/**
 * Public source citations for Ask WTF — the editor-sheet view.
 *
 * Retrieval is published-only, so this panel has no mode controls. Each cited
 * episode lists its moments with a real start–end range, duration, and the
 * LLM editorial labels (topic / summary / why relevant). Sources
 * without a resolved moment keep a slim timestamp row.
 */

"use client";

import { useId, useState } from "react";
import { resolveCitation } from "@/lib/provenance/catalog-mapping";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import type { SourceMode } from "@/lib/provenance/source-mode";
import type { PublicMoment, PublicMomentsPayload } from "@/lib/provenance/public-moment-header";
import { formatPlaybackTimestamp } from "@/lib/provenance/useDualPlayback";
import { downloadMomentsXlsx, formatClock } from "@/lib/public/moments-export";
import { Button } from "@/components/ui/Button";
import {
  buildSourcePanelModel,
  type AnswerQueryScope,
  type SourcePanelEntry,
  type SourcePanelGroup,
  type SourcePanelOverflowGroup,
} from "@/lib/public/source-panel-model";

export type SourceCitation = PublicSourceCitation;

export interface SourcePanelProps {
  sources: SourceCitation[];
  citedIndices?: number[];
  queryScope?: AnswerQueryScope;
  effectiveSourceMode?: SourceMode;
  moments?: PublicMomentsPayload;
  question?: string;
}

function youtubeWatchUrl(videoId: string, timeSec: number | null): string {
  if (timeSec === null) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  }
  const timestamp = Math.max(0, Math.floor(timeSec));
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${timestamp}s`;
}

function momentDeepLink(moment: PublicMoment): string {
  return `${moment.url}${moment.url.includes("?") ? "&" : "?"}t=${Math.round(moment.startSec)}`;
}

/** One clip range with the editorial labels, deep-linked at its start.
 *  Strength stars live only in the Excel export, not the UI. */
function MomentDetailRow({ moment }: { moment: PublicMoment }) {
  return (
    <li
      className="grid gap-1 border-t border-foreground/10 py-2 first:border-t-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3"
      data-testid="moment-row"
    >
      <div className="font-label text-xs text-secondary">
        <a
          href={momentDeepLink(moment)}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-knowledge underline underline-offset-2"
        >
          {formatClock(moment.startSec)}–{moment.endSec != null ? `${moment.durationEstimated ? "~" : ""}${formatClock(moment.endSec)}` : "?"}
        </a>
        {moment.durationSec != null && (
          <span className="ml-1 text-muted">({moment.durationEstimated ? "~" : ""}{formatClock(moment.durationSec)})</span>
        )}
        <a
          href={momentDeepLink(moment)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex w-fit items-center gap-1 rounded-control border border-foreground bg-attention px-2 py-0.5 text-[10px] font-bold lowercase tracking-wide text-on-attention transition-colors hover:bg-attention/85"
        >
          ▶ play
        </a>
      </div>
      <div className="min-w-0 space-y-0.5 text-xs">
        {moment.topic && <p className="font-bold text-foreground">{moment.topic}</p>}
        {moment.summary && <p className="text-secondary">{moment.summary}</p>}
        {moment.whyRelevant && <p className="italic text-muted">{moment.whyRelevant}</p>}
      </div>
    </li>
  );
}

/** Slim fallback for sources that never resolved into a moment. */
function SourceEvidenceRow({ entry }: { entry: SourcePanelEntry }) {
  const { source } = entry;
  const resolved = resolveCitation({
    ...source,
    sourceMode: "published",
    requestedMode: "published",
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
  const timestampReason = source.timestampReason
    ?? "This published transcript was ingested without timestamp data; the link opens the full episode.";

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded border p-2 transition-colors ${entry.isCited
        ? "border-foreground/10 bg-canvas/50 hover:bg-canvas/75"
        : "border-foreground/5 bg-canvas/20"}`}
      data-testid="source-evidence-row"
      data-evidence-kind={entry.isCited ? "citation" : "candidate"}
      data-source-index={entry.citationNumber}
    >
      <span className={`font-mono text-[10px] font-bold ${entry.isCited ? "text-foreground" : "text-muted"}`}>
        {entry.evidenceId}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded border border-attention/40 bg-attention/20 px-1.5 py-0.5 font-mono font-bold text-foreground">
          {verifiedTimeSec === null
            ? "published time unavailable"
            : `published ${formatPlaybackTimestamp(verifiedTimeSec)}`}
        </span>
        {publishedHref ? (
          <a
            href={publishedHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center rounded-control border border-foreground bg-attention px-2.5 py-1 font-label text-[10px] font-bold lowercase tracking-wide text-on-attention transition-colors hover:bg-attention/85"
          >
            {timestampStatus === "verified" ? "open published moment" : "open full published episode"}
          </a>
        ) : null}
      </span>
      {timestampStatus !== "verified" ? (
        <p className="w-full text-[10px] leading-relaxed text-muted" data-testid="timestamp-reason">
          {timestampReason}
        </p>
      ) : null}
    </div>
  );
}

function SourceEpisodeGroup({
  group,
  moments,
  kindLabel,
}: {
  group: SourcePanelGroup;
  moments?: PublicMoment[];
  kindLabel?: string;
}) {
  const candidateOnly = group.citedEntries.length === 0;
  const momentGuest = moments?.find((moment) => moment.guest)?.guest;
  // The episode title opens YouTube — at the first moment's start when one
  // resolved, otherwise the episode from the top.
  const videoId = moments?.[0]?.videoId ?? group.entries[0]?.source.videoId;
  const titleHref = moments?.[0]
    ? momentDeepLink(moments[0])
    : videoId
      ? youtubeWatchUrl(videoId, null)
      : null;

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
            {kindLabel ?? (candidateOnly ? "candidate episode" : "cited episode")}
          </p>
          {titleHref ? (
            <a
              href={titleHref}
              target="_blank"
              rel="noreferrer"
              className="block truncate font-medium text-foreground underline decoration-foreground/30 hover:decoration-foreground"
            >
              {momentGuest ? `${momentGuest} — ${group.label}` : group.label}
            </a>
          ) : (
            <p className="truncate font-medium text-foreground">
              {momentGuest ? `${momentGuest} — ${group.label}` : group.label}
            </p>
          )}
        </div>
        {group.citedEntries.length > 0 ? (
          <span className="rounded bg-attention/20 px-1.5 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-foreground">
            {group.citedEntries.length} cited
          </span>
        ) : null}
      </div>

      {moments && moments.length > 0 ? (
        <ul className="mt-2" data-testid="episode-moments">
          {moments.map((moment, index) => (
            <MomentDetailRow key={`${moment.videoId}-${moment.startSec}-${index}`} moment={moment} />
          ))}
        </ul>
      ) : group.citedEntries.length > 0 ? (
        <div className="mt-2 space-y-2">
          {group.citedEntries.map((entry) => (
            <SourceEvidenceRow key={entry.originalIndex} entry={entry} />
          ))}
        </div>
      ) : null}

      {group.visibleCandidateEntries.length > 0 && !(moments && moments.length > 0) ? (
        <div className="mt-2 space-y-2 border-t border-foreground/10 pt-2" data-testid="candidate-evidence">
          <p className="font-label text-[10px] font-bold lowercase text-muted">
            {group.visibleCandidateEntries.length} top candidate excerpt{group.visibleCandidateEntries.length !== 1 ? "s" : ""}
            <span className="ml-1 font-normal">· strongest retrieval context</span>
          </p>
          {group.visibleCandidateEntries.map((entry) => (
            <SourceEvidenceRow key={entry.originalIndex} entry={entry} />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function SourceOverflowGroup({ group }: { group: SourcePanelOverflowGroup }) {
  const videoId = group.entries[0]?.source.videoId;
  const titleHref = videoId ? youtubeWatchUrl(videoId, null) : null;

  return (
    <li
      className="rounded-control border border-foreground/10 bg-canvas/20 p-2.5"
      data-testid="source-episode-group"
      data-episode-key={group.key}
    >
      <div className="min-w-0">
        <p className="font-label text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
          more matches
        </p>
        {titleHref ? (
          <a
            href={titleHref}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-medium text-foreground underline decoration-foreground/30 hover:decoration-foreground"
          >
            {group.label}
          </a>
        ) : (
          <p className="truncate font-medium text-foreground">{group.label}</p>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {group.entries.map((entry) => (
          <SourceEvidenceRow key={entry.originalIndex} entry={entry} />
        ))}
      </div>
    </li>
  );
}

export function SourcePanel({
  sources,
  citedIndices,
  queryScope,
  effectiveSourceMode,
  moments,
  question,
}: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const [exporting, setExporting] = useState(false);
  // Retrieval is published-only; the model keeps citation numbering intact
  // while this view never surfaces uncut evidence or a mode control.
  const model = buildSourcePanelModel({ sources, citedIndices, visibleMode: "published" });

  const visibleMoments = (moments?.moments ?? []).filter((moment) => moment.withinBudget);
  const momentsByVideo = new Map<string, PublicMoment[]>();
  for (const moment of visibleMoments) {
    const bucket = momentsByVideo.get(moment.videoId);
    if (bucket) bucket.push(moment);
    else momentsByVideo.set(moment.videoId, [moment]);
  }
  // Moments arrive score-ordered; within an episode the sheet reads on the
  // episode clock — earliest passage first.
  for (const episodeMoments of momentsByVideo.values()) {
    episodeMoments.sort((a, b) => a.startSec - b.startSec);
  }

  if (!sources || sources.length === 0) return null;

  const hasMoments = visibleMoments.length > 0;
  const totalLabel = moments ? formatClock(moments.totalDurationSec) : null;
  const budgetLabel = moments?.budgetSec != null ? formatClock(moments.budgetSec) : null;

  // Moments come from a wider retrieval than the answer's citations, so an
  // episode can hold relevant passages without being cited — surface those
  // as their own groups instead of dropping them.
  const coveredVideoIds = new Set<string>();
  for (const group of [...model.primaryGroups, ...model.overflowGroups]) {
    const videoId = group.entries[0]?.source.videoId;
    if (videoId) coveredVideoIds.add(videoId);
  }
  const momentOnlyGroups = [...momentsByVideo.entries()]
    .filter(([videoId]) => !coveredVideoIds.has(videoId))
    .map(([videoId, episodeMoments]) => ({
      videoId,
      episodeMoments,
      bestScore: Math.max(...episodeMoments.map((moment) => moment.score)),
    }))
    .sort((a, b) => b.bestScore - a.bestScore);

  async function handleExport() {
    if (!moments) return;
    setExporting(true);
    try {
      await downloadMomentsXlsx(moments, question ?? "moments");
    } finally {
      setExporting(false);
    }
  }

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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p id={citationPlaybackTitleId} className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
                sources
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {hasMoments && totalLabel !== null
                  ? `${totalLabel} of moments across ${momentsByVideo.size} episode${momentsByVideo.size === 1 ? "" : "s"}${budgetLabel ? ` (budget: ${budgetLabel})` : ""}`
                  : "published moments from the current catalogue."}
              </p>
            </div>
            {hasMoments ? (
              <Button
                variant="ghost"
                className="text-xs"
                onClick={handleExport}
                loading={exporting}
                data-testid="moment-export-button"
              >
                download excel
              </Button>
            ) : null}
          </div>
        </section>

        <ol className="space-y-2.5 pl-0">
          {model.primaryGroups.map((group) => (
            <SourceEpisodeGroup
              key={group.key}
              group={group}
              moments={momentsByVideo.get(group.entries[0]?.source.videoId ?? "")}
            />
          ))}
          {momentOnlyGroups.map(({ videoId, episodeMoments }) => (
            <SourceEpisodeGroup
              key={`moments-${videoId}`}
              group={{
                key: videoId,
                label: episodeMoments[0].title,
                entries: [],
                citedEntries: [],
                candidateEntries: [],
                visibleCandidateEntries: [],
                hiddenCandidateEntries: [],
              }}
              moments={episodeMoments}
              kindLabel="related episode"
            />
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
                    <SourceOverflowGroup key={group.key} group={group} />
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
