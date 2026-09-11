"use client";

import { useState } from "react";
import {
  YOUTUBE_ANALYTICS_FIXTURE,
  type IntegrationConnectionState,
  type OperatorSettingsRole,
} from "@/lib/ops/integration-contract";

const control =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-55";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-canvas px-3 py-2 font-label text-xs font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";
const command =
  "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-attention px-4 py-2 font-label text-xs font-bold lowercase text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";

function statusLabel(state: IntegrationConnectionState) {
  return {
    not_configured: "not configured",
    verifying: "verifying",
    connected: "connected · mock",
    degraded: "degraded",
    revoked: "revoked",
    unavailable: "unavailable",
  }[state];
}

export function YouTubeAnalyticsSettingsPanel({ role, previewOnly = false }: { role: OperatorSettingsRole; previewOnly?: boolean }) {
  const canManage = !previewOnly && (role === "admin" || role === "super_admin");
  const [connection, setConnection] = useState<IntegrationConnectionState>("not_configured");
  const [keyDraft, setKeyDraft] = useState("");
  const [notice, setNotice] = useState("no provider observation loaded");
  const [showDashboard, setShowDashboard] = useState(false);

  const connectPreview = (withCredential: boolean) => {
    if (!canManage) return;
    if (withCredential && !keyDraft.trim()) {
      setConnection("unavailable");
      setNotice("a local preview key is required; no provider request was made");
      return;
    }
    setConnection("verifying");
    setNotice("verifying local preview · live YouTube Analytics adapter is held");
    window.setTimeout(() => {
      setConnection("connected");
      setShowDashboard(true);
      setKeyDraft("");
      setNotice("local mock connected · dashboard values are fixture data");
    }, 350);
  };

  const revokePreview = () => {
    setConnection("revoked");
    setShowDashboard(false);
    setNotice("local preview revoked · no provider credentials were changed");
  };

  return (
    <section
      className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6"
      aria-labelledby="youtube-analytics-settings-title"
      id="youtube-analytics-settings"
      data-youtube-analytics-settings
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            read-only source adapter
          </p>
          <h2 id="youtube-analytics-settings-title" className="mt-1 font-heading text-2xl font-bold lowercase">
            YouTube Analytics
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
            Connect a future read-only observation source and keep freshness, scope, and unavailable states visible. This dashboard is a local, non-persisted preview and cannot save or mutate provider state.
          </p>
        </div>
        <span className={`shrink-0 rounded-control border-2 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] ${connection === "connected" ? "border-live bg-canvas text-foreground" : "border-foreground/40 bg-surface-subtle text-secondary"}`}>
          {statusLabel(connection)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border-2 border-foreground bg-canvas p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">connection management</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <div className="flex items-start justify-between gap-3 border-b-2 border-foreground/15 pb-2"><dt className="text-secondary">adapter mode</dt><dd className="font-semibold">OAuth-first · read-only</dd></div>
            <div className="flex items-start justify-between gap-3 border-b-2 border-foreground/15 pb-2"><dt className="text-secondary">KV projection</dt><dd className="text-right font-semibold">health + redacted metadata</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="text-secondary">last refresh</dt><dd className="font-semibold">{showDashboard ? YOUTUBE_ANALYTICS_FIXTURE.refreshed : "not observed"}</dd></div>
          </dl>
          {!previewOnly ? <label className="mt-4 grid gap-1">
            <span className="font-label text-xs font-bold uppercase tracking-[0.08em] text-secondary">API key · local preview only</span>
            <input type="password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="write-only local test value" autoComplete="new-password" disabled={!canManage || connection === "verifying"} className={control} />
          </label> : null}
          {!previewOnly ? <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={command} onClick={() => connectPreview(true)} disabled={!canManage || connection === "verifying"}>connect preview</button>
            <button type="button" className={button} onClick={() => connectPreview(false)} disabled={!canManage || connection === "verifying"}>preview mock dashboard</button>
            {showDashboard ? <button type="button" className={button} onClick={revokePreview}>revoke preview</button> : null}
          </div> : <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-secondary">local preview only · no save or provider request is available.</p>}
          <p className="mt-3 text-xs leading-relaxed text-secondary" aria-live="polite">{notice}</p>
          {!canManage ? <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-secondary">Editor view is read-only. Provider connection management is admin-only.</p> : null}
        </div>

        {showDashboard ? (
          <div className="border-2 border-foreground bg-canvas p-4" data-youtube-analytics-mock-dashboard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">mock dashboard · fixture data</p>
                <h3 className="mt-1 font-heading text-xl font-bold lowercase">{YOUTUBE_ANALYTICS_FIXTURE.channel}</h3>
              </div>
              <span className="border-2 border-foreground/40 bg-surface-subtle px-2 py-1 font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">not provider data</span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {YOUTUBE_ANALYTICS_FIXTURE.metrics.map((metric) => (
                <div key={metric.label} className="border-2 border-foreground/20 p-3">
                  <dt className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{metric.label}</dt>
                  <dd className="mt-1 font-heading text-2xl font-bold">{metric.value}</dd>
                  <p className="mt-1 text-xs text-secondary">{metric.detail}</p>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-secondary">
              Source: {YOUTUBE_ANALYTICS_FIXTURE.source}. Window: {YOUTUBE_ANALYTICS_FIXTURE.window}. Freshness: {YOUTUBE_ANALYTICS_FIXTURE.refreshed}.
            </p>
          </div>
        ) : (
          <div className="flex min-h-52 items-center border-2 border-dashed border-foreground/40 bg-canvas p-5">
            <div>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">dashboard state</p>
              <h3 className="mt-2 font-heading text-xl font-bold lowercase">no analytics observation</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-secondary">Connect the local preview or use the mock preview action to inspect the dashboard composition. No zero is inferred from an absent provider.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
