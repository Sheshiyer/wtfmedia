"use client";

import { useState } from "react";
import type { PublicMoment, PublicMomentsPayload } from "@/lib/provenance/public-moment-header";
import { downloadMomentsXlsx, formatClock } from "@/lib/public/moments-export";
import { Button } from "@/components/ui/Button";

/**
 * MomentPanel — the sheet-style source section for an answer.
 *
 * Moments group by episode; each row is one clip range with start–end,
 * duration, and the LLM editorial labels (topic / summary / why relevant /
 * strength). When the question carried a duration budget ("30 min of ..."),
 * the header shows the selected total against it.
 */

interface MomentPanelProps {
  payload: PublicMomentsPayload;
  question?: string;
}

function deepLink(moment: PublicMoment): string {
  return `${moment.url}${moment.url.includes("?") ? "&" : "?"}t=${Math.round(moment.startSec)}`;
}

function StrengthStars({ value }: { value?: number }) {
  if (value == null) return <span className="text-muted">—</span>;
  return (
    <span aria-label={`strength ${value} of 5`} className="tracking-tight text-knowledge">
      {"★".repeat(value)}
      <span className="text-muted">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function MomentRow({ moment }: { moment: PublicMoment }) {
  return (
    <li className="grid gap-1 border-t border-foreground/10 py-2 first:border-t-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3">
      <div className="font-label text-xs text-secondary">
        <a
          href={deepLink(moment)}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-knowledge underline underline-offset-2"
        >
          {formatClock(moment.startSec)}–{moment.endSec != null ? formatClock(moment.endSec) : "?"}
        </a>
        {moment.durationSec != null && (
          <span className="ml-1 text-muted">({formatClock(moment.durationSec)})</span>
        )}
      </div>
      <div className="min-w-0 space-y-0.5 text-xs">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {moment.topic && <span className="font-bold text-foreground">{moment.topic}</span>}
          <StrengthStars value={moment.strength} />
        </div>
        {moment.summary && <p className="text-secondary">{moment.summary}</p>}
        {moment.whyRelevant && <p className="italic text-muted">{moment.whyRelevant}</p>}
      </div>
    </li>
  );
}

export function MomentPanel({ payload, question }: MomentPanelProps) {
  const [exporting, setExporting] = useState(false);
  const visible = payload.moments.filter((moment) => moment.withinBudget);
  if (visible.length === 0) return null;

  const byEpisode = new Map<string, PublicMoment[]>();
  for (const moment of visible) {
    const bucket = byEpisode.get(moment.videoId);
    if (bucket) bucket.push(moment);
    else byEpisode.set(moment.videoId, [moment]);
  }

  const totalLabel = formatClock(payload.totalDurationSec);
  const budgetLabel = payload.budgetSec != null ? formatClock(payload.budgetSec) : null;

  async function handleExport() {
    setExporting(true);
    try {
      await downloadMomentsXlsx(payload, question ?? "moments");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section
      className="border-2 border-foreground bg-surface-raised p-3 sm:p-4"
      data-testid="moment-panel"
      aria-label="episode moments"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-knowledge">
          {budgetLabel
            ? `${totalLabel} of moments across ${byEpisode.size} episode${byEpisode.size === 1 ? "" : "s"} (budget: ${budgetLabel})`
            : `${totalLabel} of moments across ${byEpisode.size} episode${byEpisode.size === 1 ? "" : "s"}`}
        </p>
        <Button
          variant="ghost"
          className="text-xs"
          onClick={handleExport}
          loading={exporting}
          data-testid="moment-export-button"
        >
          download excel
        </Button>
      </div>
      <div className="mt-2 space-y-3">
        {[...byEpisode.values()].map((moments) => {
          const first = moments[0];
          return (
            <div key={first.videoId}>
              <p className="font-label text-xs font-bold text-foreground">
                {first.guest ? `${first.guest} — ` : ""}
                <a href={deepLink(first)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {first.title}
                </a>
              </p>
              <ul>
                {moments.map((moment, index) => (
                  <MomentRow key={`${moment.videoId}-${moment.startSec}-${index}`} moment={moment} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
