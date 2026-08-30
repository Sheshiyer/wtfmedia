"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export type IngestionJobStatus = "pending" | "running" | "completed" | "failed" | "skipped_unchanged";
export type IngestionJobType =
  | "youtube_metadata_sync"
  | "youtube_captions_fetch"
  | "uncut_audio_ingest"
  | "asr_transcription"
  | "timeline_alignment"
  | "vector_indexing";

export interface IngestionJob {
  id: string;
  job_type: IngestionJobType;
  episode_id: string | null;
  source_asset_id: string | null;
  status: IngestionJobStatus;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  payload_json?: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

const statusBadgeStyles: Record<IngestionJobStatus, string> = {
  pending: "border-attention bg-attention/20 text-foreground",
  running: "border-information bg-information text-white animate-pulse",
  completed: "border-live bg-live/20 text-foreground",
  failed: "border-editorial bg-editorial/20 text-foreground",
  skipped_unchanged: "border-foreground/30 bg-surface-subtle text-muted",
};

export function IngestionJobLedger({ refreshTrigger }: { refreshTrigger?: number }) {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/ops/api/ingest/jobs", { cache: "no-store" });
      const data = await res.json().catch(() => null) as { jobs?: unknown } | null;
      if (res.ok && data && Array.isArray(data.jobs)) {
        setJobs(data.jobs as IngestionJob[]);
        return;
      }
      setJobs([]);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, [refreshTrigger]);

  const filteredJobs = jobs.filter((j) => {
    if (filterStatus !== "all" && j.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        j.id.toLowerCase().includes(q) ||
        j.job_type.toLowerCase().includes(q) ||
        (j.episode_id && j.episode_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <section
      aria-label="ingest jobs"
      className="space-y-4 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b-2 border-foreground pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            ingest jobs
          </span>
          <h2 className="font-heading text-xl font-bold lowercase sm:text-2xl">
            ingestion jobs
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="job-status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="job-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-label text-xs font-semibold uppercase tracking-wider text-foreground"
          >
            <option value="all">all statuses</option>
            <option value="pending">pending</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="skipped_unchanged">skipped unchanged</option>
            <option value="failed">failed</option>
          </select>

          <Button
            type="button"
            variant="ghost"
            className="min-h-10 border-2 border-foreground px-3 font-label text-xs font-bold uppercase"
            onClick={() => void fetchJobs()}
            disabled={loading}
          >
            {loading ? "syncing..." : "refresh"}
          </Button>
        </div>
      </div>

      <div className="mb-2">
        <label htmlFor="job-search-input" className="sr-only">
          Search jobs
        </label>
        <input
          id="job-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by job ID, type, or episode ID..."
          className="w-full min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-attention"
        />
      </div>

      {filteredJobs.length === 0 ? (
        <div className="rounded-control border-2 border-dashed border-foreground/30 p-8 text-center">
          <p className="font-body text-sm text-secondary">
            no ingest jobs. none were inferred.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-body text-xs">
            <thead>
              <tr className="border-b-2 border-foreground bg-surface-subtle font-label text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                <th className="p-3">job id</th>
                <th className="p-3">type</th>
                <th className="p-3">episode / target</th>
                <th className="p-3">status</th>
                <th className="p-3">attempts</th>
                <th className="p-3">timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-foreground/20">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="p-3 font-mono text-[11px] font-semibold text-foreground">
                    {job.id}
                  </td>
                  <td className="p-3">
                    <span className="rounded border border-foreground/40 bg-canvas px-2 py-0.5 font-mono text-[11px]">
                      {job.job_type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-secondary">
                    {job.episode_id || "global_sync"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyles[job.status]}`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-secondary">
                    {job.attempts} / {job.max_attempts}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-muted">
                    {new Date(job.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
