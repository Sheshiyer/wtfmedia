"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface YouTubeSyncResult {
  jobId?: string;
  status?: string;
  syncedChannels?: string[];
}

interface YouTubeSyncFailure {
  error?: string;
}

const persistedSyncStatuses = new Set(["pending", "running", "completed", "skipped_unchanged"]);

function isPersistedSyncResult(value: YouTubeSyncResult): value is Required<Pick<YouTubeSyncResult, "jobId" | "status">> {
  return (
    typeof value.jobId === "string" &&
    value.jobId.length > 0 &&
    typeof value.status === "string" &&
    persistedSyncStatuses.has(value.status)
  );
}

export function YouTubeSyncControl({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [channelId, setChannelId] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<YouTubeSyncResult | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "oauth connection required before a sync can run.",
  );
  const [isError, setIsError] = useState(false);

  const triggerSync = async () => {
    setSyncing(true);
    setLastResult(null);
    setIsError(false);
    setStatusMessage("Checking the configured OAuth connection…");

    try {
      const response = await fetch("/ops/api/ingest/youtube-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim() || undefined,
          force: forceRefresh,
        }),
      });
      const payload = await response.json().catch(() => ({} as YouTubeSyncFailure));

      if (!response.ok) {
        const failure = payload as YouTubeSyncFailure;
        if (failure.error === "youtube_oauth_not_configured") {
          setStatusMessage("OAuth is not connected. Configure the approved YouTube account in Settings before synchronizing.");
        } else {
          setStatusMessage("The sync request could not be completed. No completion or quota data was recorded.");
        }
        setIsError(true);
        return;
      }

      const result = payload as YouTubeSyncResult;
      if (!isPersistedSyncResult(result)) {
        setStatusMessage("The response did not identify a persisted ingestion job. No sync result was inferred.");
        setIsError(true);
        return;
      }

      setLastResult(result);
      setStatusMessage("The authorized sync request completed. Review the job ledger for its persisted result.");
      onSyncComplete?.();
    } catch {
      setStatusMessage("The sync endpoint could not be reached. No completion or quota data was inferred.");
      setIsError(true);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section
      aria-labelledby="youtube-sync-heading"
      className="space-y-6 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b-2 border-foreground pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            youtube sync
          </span>
          <h2 id="youtube-sync-heading" className="font-heading text-xl font-bold lowercase sm:text-2xl">
            youtube catalog sync
          </h2>
        </div>
        <span className="rounded border-2 border-editorial bg-editorial/10 px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
          connection: not configured
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-1">
            <label htmlFor="youtube-channel-id" className="font-label text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">
              Approved channel ID (optional)
            </label>
            <input
              id="youtube-channel-id"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
              placeholder="Supplied after OAuth approval"
              autoComplete="off"
              className="min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-mono text-xs text-foreground focus-visible:outline-attention"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 select-none" htmlFor="youtube-force-refresh">
            <input
              id="youtube-force-refresh"
              type="checkbox"
              checked={forceRefresh}
              onChange={(event) => setForceRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-2 border-foreground text-attention focus:ring-attention"
            />
            <span className="font-body text-xs font-medium text-secondary">
              Request a fresh sync after an OAuth connection is available
            </span>
          </label>

          <Button
            type="button"
            variant="attention"
            onClick={() => void triggerSync()}
            disabled={syncing}
            className="min-h-11 w-full border-2 border-foreground font-label text-sm font-bold uppercase tracking-wider text-on-attention shadow-[4px_4px_0_var(--wtf-foreground)]"
          >
            {syncing ? "checking connection" : "check youtube connection"}
          </Button>
        </div>

        <aside className="space-y-3 rounded-control border-2 border-foreground/30 bg-canvas p-4" aria-labelledby="youtube-sync-status-heading">
          <h3 id="youtube-sync-status-heading" className="font-label text-xs font-bold uppercase tracking-wider text-muted">
            Sync status
          </h3>
          <p className="text-xs leading-relaxed text-secondary">
            channel and completion details appear only after a real authorized response.
          </p>
          <div
            role="status"
            aria-live="polite"
            className={`rounded border p-3 text-xs ${isError ? "border-editorial bg-editorial/10 text-foreground" : "border-foreground/20 bg-surface-subtle text-secondary"}`}
          >
            {statusMessage}
          </div>
          {lastResult ? (
            <dl className="grid gap-2 text-xs text-secondary">
              <div>
                <dt className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Job</dt>
                <dd className="font-mono text-foreground">{lastResult.jobId}</dd>
              </div>
              <div>
                <dt className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Result</dt>
                <dd className="text-foreground">{lastResult.status}</dd>
              </div>
            </dl>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
