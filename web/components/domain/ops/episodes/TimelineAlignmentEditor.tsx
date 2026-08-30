"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export type IntervalStatus = "matched" | "cut_from_published" | "added_in_published" | "conflicted";

export interface AlignmentInterval {
  id?: number;
  alignment_id?: string;
  interval_index: number;
  uncut_start_sec: number;
  uncut_end_sec: number;
  pub_start_sec: number;
  pub_end_sec: number;
  interval_status: IntervalStatus;
  confidence: number;
}

export interface TimelineAlignment {
  id: string;
  episode_id: string;
  uncut_asset_id: string;
  published_asset_id: string;
  algorithm: string;
  confidence_score: number;
  status: string;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const intervalColorMap: Record<IntervalStatus, { bg: string; border: string; label: string }> = {
  matched: { bg: "bg-live/15", border: "border-live", label: "Matched (1:1 / Scaled)" },
  cut_from_published: { bg: "bg-editorial/15", border: "border-editorial", label: "Cut in Published Video" },
  added_in_published: { bg: "bg-information/15", border: "border-information", label: "Added Intro / Sponsor" },
  conflicted: { bg: "bg-attention/15", border: "border-attention", label: "Conflicted Segment" },
};

export function TimelineAlignmentEditor({
  alignment,
  intervals,
}: {
  alignment?: TimelineAlignment | null;
  intervals: AlignmentInterval[];
}) {
  const [sourceTimeline, setSourceTimeline] = useState<"uncut" | "published">("uncut");
  const [inputTimestamp, setInputTimestamp] = useState<string>("120");
  const [conversionResult, setConversionResult] = useState<{
    targetTimeSec: number | null;
    status: string;
    confidence: number;
    intervalIndex: number | null;
  } | null>(null);

  const handleConvert = () => {
    const timeVal = parseFloat(inputTimestamp);
    if (isNaN(timeVal) || timeVal < 0) return;

    // Piecewise linear conversion logic
    for (const intv of intervals) {
      if (sourceTimeline === "uncut") {
        if (timeVal >= intv.uncut_start_sec && timeVal <= intv.uncut_end_sec) {
          if (intv.interval_status === "cut_from_published") {
            setConversionResult({
              targetTimeSec: null,
              status: "cut_from_published",
              confidence: 1.0,
              intervalIndex: intv.interval_index,
            });
            return;
          }
          if (intv.interval_status === "matched") {
            const uncutSpan = intv.uncut_end_sec - intv.uncut_start_sec;
            const pubSpan = intv.pub_end_sec - intv.pub_start_sec;
            const frac = uncutSpan === 0 ? 0 : (timeVal - intv.uncut_start_sec) / uncutSpan;
            const targetTime = intv.pub_start_sec + frac * pubSpan;
            setConversionResult({
              targetTimeSec: Math.round(targetTime * 100) / 100,
              status: "matched",
              confidence: intv.confidence,
              intervalIndex: intv.interval_index,
            });
            return;
          }
        }
      } else {
        if (timeVal >= intv.pub_start_sec && timeVal <= intv.pub_end_sec) {
          if (intv.interval_status === "added_in_published") {
            setConversionResult({
              targetTimeSec: null,
              status: "added_in_published",
              confidence: 1.0,
              intervalIndex: intv.interval_index,
            });
            return;
          }
          if (intv.interval_status === "matched") {
            const pubSpan = intv.pub_end_sec - intv.pub_start_sec;
            const uncutSpan = intv.uncut_end_sec - intv.uncut_start_sec;
            const frac = pubSpan === 0 ? 0 : (timeVal - intv.pub_start_sec) / pubSpan;
            const targetTime = intv.uncut_start_sec + frac * uncutSpan;
            setConversionResult({
              targetTimeSec: Math.round(targetTime * 100) / 100,
              status: "matched",
              confidence: intv.confidence,
              intervalIndex: intv.interval_index,
            });
            return;
          }
        }
      }
    }

    setConversionResult({
      targetTimeSec: null,
      status: "unmapped",
      confidence: 0.0,
      intervalIndex: null,
    });
  };

  if (!alignment || intervals.length === 0) {
    return (
      <section
        aria-labelledby="alignment-unavailable-heading"
        className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      >
        <h3 id="alignment-unavailable-heading" className="font-heading text-lg font-bold lowercase text-foreground">
          timeline alignment unavailable
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
          No approved interval mapping was returned for this episode. WTF OS will not calculate or display a published or uncut timestamp
          until a verified source-bound alignment is available.
        </p>
      </section>
    );
  }

  const totalUncut = intervals.length > 0 ? Math.max(...intervals.map((i) => i.uncut_end_sec)) : 1;

  return (
    <div className="space-y-6">
      {/* Alignment Overview Bar */}
      <div className="flex flex-col gap-3 rounded-panel border-2 border-foreground bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-label text-[10px] font-bold uppercase tracking-wider text-muted">
            Algorithm: {alignment.algorithm} • Status: {alignment.status}
          </span>
          <h3 className="font-heading text-lg font-bold lowercase text-foreground">
            dual-timeline piecewise reconciliation
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-secondary">
          <span>Overall Confidence:</span>
          <strong className="text-foreground">
            {(alignment.confidence_score * 100).toFixed(0)}%
          </strong>
        </div>
      </div>

      {/* Visual Piecewise Timeline Strip */}
      <div className="space-y-2 rounded-panel border-2 border-foreground bg-surface-raised p-4">
        <h4 className="font-label text-xs font-bold uppercase tracking-wider text-muted">
          Interval Continuity Map
        </h4>

        <div className="flex h-10 w-full overflow-hidden rounded border-2 border-foreground bg-canvas">
          {intervals.map((intv) => {
            const span = intv.uncut_end_sec - intv.uncut_start_sec;
            const pct = Math.max((span / totalUncut) * 100, 2);
            const style = intervalColorMap[intv.interval_status] || intervalColorMap.matched;

            return (
              <div
                key={intv.interval_index}
                title={`#${intv.interval_index}: ${style.label} (${formatSec(intv.uncut_start_sec)} - ${formatSec(intv.uncut_end_sec)})`}
                style={{ width: `${pct}%` }}
                className={`h-full border-r border-foreground/40 ${style.bg} transition-opacity hover:opacity-80 flex items-center justify-center font-mono text-[9px] font-bold text-foreground truncate px-0.5`}
              >
                #{intv.interval_index}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-mono text-secondary pt-2">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-live bg-live/20" />
            <span>Matched Segment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-editorial bg-editorial/20" />
            <span>Cut in Published</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-information bg-information/20" />
            <span>Added in Published</span>
          </div>
        </div>
      </div>

      {/* Dual Coordinate Converter Interactive Widget */}
      <div className="rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:p-6 space-y-4">
        <h4 className="font-heading text-base font-bold lowercase text-foreground">
          test coordinate conversion engine
        </h4>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr_auto] items-end">
          <label className="grid gap-1">
            <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
              Source Timeline
            </span>
            <select
              value={sourceTimeline}
              onChange={(e) => setSourceTimeline(e.target.value as "uncut" | "published")}
              className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-2 text-xs font-semibold text-foreground focus-visible:outline-attention"
            >
              <option value="uncut">Uncut Studio</option>
              <option value="published">Published Video</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
              Timestamp (Seconds or MM:SS)
            </span>
            <input
              type="text"
              value={inputTimestamp}
              onChange={(e) => setInputTimestamp(e.target.value)}
              placeholder="e.g. 120 or 02:00"
              className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-mono text-xs text-foreground focus-visible:outline-attention"
            />
          </label>

          <Button
            type="button"
            variant="attention"
            onClick={handleConvert}
            className="min-h-10 border-2 border-foreground font-label text-xs font-bold uppercase tracking-wider"
          >
            Convert Coordinate
          </Button>
        </div>

        {conversionResult && (
          <div className="rounded-control border-2 border-foreground bg-canvas p-3 font-mono text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted">Target Timeline Coordinate:</span>
              <strong className="text-sm font-bold text-foreground">
                {conversionResult.targetTimeSec !== null
                  ? `${formatSec(conversionResult.targetTimeSec)} (${conversionResult.targetTimeSec}s)`
                  : "Unmapped / Cut"}
              </strong>
            </div>
            <p className="text-secondary text-[11px]">
              Status: <strong className="text-foreground">{conversionResult.status}</strong> • Interval: #{conversionResult.intervalIndex ?? "none"} • Confidence: {(conversionResult.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Intervals Table */}
      <div className="rounded-panel border-2 border-foreground bg-surface-raised overflow-x-auto">
        <table className="w-full border-collapse text-left font-body text-xs">
          <thead>
            <tr className="border-b-2 border-foreground bg-surface-subtle font-label text-[11px] font-bold uppercase tracking-wider text-muted">
              <th className="p-3">#</th>
              <th className="p-3">Uncut Interval</th>
              <th className="p-3">Published Interval</th>
              <th className="p-3">Status</th>
              <th className="p-3">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-foreground/20 font-mono text-[11px]">
            {intervals.map((intv) => (
              <tr key={intv.interval_index} className="hover:bg-canvas/50">
                <td className="p-3 font-bold text-foreground">#{intv.interval_index}</td>
                <td className="p-3 text-secondary">
                  {formatSec(intv.uncut_start_sec)} – {formatSec(intv.uncut_end_sec)} ({intv.uncut_start_sec}s - {intv.uncut_end_sec}s)
                </td>
                <td className="p-3 text-secondary">
                  {formatSec(intv.pub_start_sec)} – {formatSec(intv.pub_end_sec)} ({intv.pub_start_sec}s - {intv.pub_end_sec}s)
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider ${
                      intervalColorMap[intv.interval_status]?.bg || ""
                    } ${intervalColorMap[intv.interval_status]?.border || ""}`}
                  >
                    {intv.interval_status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3 text-muted">{(intv.confidence * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
