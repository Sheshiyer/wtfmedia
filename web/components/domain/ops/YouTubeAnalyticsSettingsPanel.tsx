"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IntegrationConnectionState, OperatorSettingsRole } from "@/lib/ops/integration-contract";

type Provider = "youtube" | "ga4";
type Connection = {
  provider: Provider;
  status: IntegrationConnectionState;
  resource: { id: string; name: string | null; timezone: string | null } | null;
  lastAttemptedRefreshAt: string | null;
  lastSuccessfulRefreshAt: string | null;
  errorCode: string | null;
};
type StatusResponse = { configured: boolean; migrationRequired?: boolean; connections: Connection[] };
type Report = Record<string, unknown> & {
  resource?: { id: string; name: string; timezone: string };
  freshness?: string | null;
  totals?: Record<string, number | null>;
  trends?: Array<Record<string, unknown>>;
  videos?: Array<Record<string, unknown>>;
  trafficSources?: Array<Record<string, unknown>>;
};

const control = "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-55";
const button = "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-canvas px-3 py-2 font-label text-xs font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";
const command = "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-attention px-4 py-2 font-label text-xs font-bold lowercase text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function formatMetric(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value) : "unavailable"; }
function labelFor(state: IntegrationConnectionState | "loading") {
  if (state === "missing_scope") return "permission denied";
  return state.replaceAll("_", " ");
}

export function YouTubeAnalyticsSettingsPanel({ role }: { role: OperatorSettingsRole }) {
  const canManage = role === "admin" || role === "super_admin";
  const [provider, setProvider] = useState<Provider>("youtube");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Loading the server connection state.");
  const [resourceId, setResourceId] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const today = useMemo(() => new Date(), []);
  const [endDate, setEndDate] = useState(isoDate(today));
  const [startDate, setStartDate] = useState(isoDate(new Date(today.getTime() - 27 * 86_400_000)));
  const connection = status?.connections.find((item) => item.provider === provider) ?? null;

  useEffect(() => {
    setResourceId(connection?.resource?.id ?? "");
    setResourceName(connection?.resource?.name ?? "");
    setTimezone(connection?.resource?.timezone ?? "UTC");
  }, [connection?.resource?.id, connection?.resource?.name, connection?.resource?.timezone, provider]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/beta/api/analytics/status", { cache: "no-store" });
      const value = await response.json() as StatusResponse & { error?: string };
      if (!response.ok) throw new Error(value.error ?? "analytics_unavailable");
      setStatus(value);
      setNotice(value.migrationRequired ? "Analytics storage migration is required before a connection can be saved." : "Connection state loaded from the server.");
    } catch {
      setNotice("Analytics connection state is unavailable. No values are being inferred.");
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (!connection?.resource) { setReport(null); return; }
    setBusy(true);
    try {
      const query = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/beta/api/analytics/${provider}?${query}`, { cache: "no-store" });
      const value = await response.json() as Report & { error?: string };
      if (!response.ok) throw new Error(value.error ?? "report_unavailable");
      setReport(value);
      setNotice("Stored provider report loaded. Freshness is shown with the selected resource.");
    } catch {
      setReport(null);
      setNotice("No stored report is available for this resource and date range.");
    } finally { setBusy(false); }
  }, [connection?.resource, endDate, provider, startDate]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => { void loadReport(); }, [loadReport]);

  async function connect() {
    if (!canManage) return;
    setBusy(true);
    try {
      const response = await fetch("/beta/api/analytics/oauth/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider }) });
      const value = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !value.authorizationUrl) throw new Error(value.error ?? "oauth_unavailable");
      window.location.assign(value.authorizationUrl);
    } catch {
      setNotice("Google OAuth is not configured for this environment.");
      setBusy(false);
    }
  }

  async function selectResource() {
    if (!canManage) return;
    setBusy(true);
    try {
      const response = await fetch("/beta/api/analytics/selection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, resourceId, resourceName, timezone }) });
      const value = await response.json() as { error?: string };
      if (!response.ok) throw new Error(value.error ?? "selection_failed");
      await loadStatus();
      setNotice(provider === "youtube" ? "Authorized channel selected. Stored reports appear after the first sync." : "Authorized GA4 property selected. Stored reports appear after the first sync.");
    } catch {
      setNotice(provider === "youtube" ? "The channel ID is invalid or is not authorized by this Google account." : "The GA4 property ID is invalid or is not readable by this Google account.");
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!canManage) return;
    setBusy(true);
    try {
      const response = await fetch("/beta/api/analytics/disconnect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider }) });
      if (!response.ok) throw new Error("disconnect_failed");
      setReport(null);
      await loadStatus();
      setNotice("Connection revoked. Scheduled access is stopped; historical retention follows server policy.");
    } catch { setNotice("The connection could not be revoked. No local success is being claimed."); }
    finally { setBusy(false); }
  }

  const state = connection?.status ?? "not_configured";
  const totals = report?.totals ?? {};
  const cards = provider === "youtube"
    ? [["views", totals.views], ["watch time (minutes)", totals.watch_minutes], ["average view duration (seconds)", totals.average_view_duration_seconds], ["likes", totals.likes], ["comments", totals.comments_count], ["shares", totals.shares], ["subscribers gained", totals.subscribers_gained], ["subscribers lost", totals.subscribers_lost]]
    : [["users", totals.users], ["sessions", totals.sessions], ["engaged sessions", totals.engaged_sessions], ["engagement rate", typeof totals.engagement_rate === "number" ? totals.engagement_rate * 100 : null]];

  return <section className="rounded-panel border-2 border-foreground bg-surface-raised p-5 sm:p-6" aria-labelledby="analytics-settings-title" data-youtube-analytics-settings>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">read-only Google data</p><h2 id="analytics-settings-title" className="mt-1 font-heading text-2xl font-bold lowercase">analytics</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">YouTube channel reports and GA4 website reports remain separate. Values come from stored provider data; unavailable data is never converted to zero.</p></div>
      <span className={`rounded-control border-2 px-2.5 py-1 font-label text-[10px] font-bold uppercase ${state === "connected" ? "border-live" : "border-foreground/40"}`}>{labelFor(busy ? "loading" : state)}</span>
    </div>
    <div className="mt-5 flex gap-2" role="tablist" aria-label="Analytics source">
      {(["youtube", "ga4"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={provider === item} className={provider === item ? command : button} onClick={() => setProvider(item)}>{item === "youtube" ? "YouTube" : "Website (GA4)"}</button>)}
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="border-2 border-foreground bg-canvas p-4">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">connection</p>
        <dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-secondary">provider</dt><dd className="font-semibold">{provider === "youtube" ? "Google / YouTube" : "Google Analytics 4"}</dd></div><div className="flex justify-between gap-3"><dt className="text-secondary">selected resource</dt><dd className="text-right font-semibold">{connection?.resource?.name ?? "not selected"}</dd></div><div className="flex justify-between gap-3"><dt className="text-secondary">last attempted refresh</dt><dd className="text-right font-semibold">{connection?.lastAttemptedRefreshAt ?? "not observed"}</dd></div><div className="flex justify-between gap-3"><dt className="text-secondary">last successful refresh</dt><dd className="text-right font-semibold">{connection?.lastSuccessfulRefreshAt ?? "not observed"}</dd></div>{connection?.errorCode ? <div className="flex justify-between gap-3"><dt className="text-secondary">provider state</dt><dd className="text-right font-semibold">{connection.errorCode.replaceAll("_", " ")}</dd></div> : null}</dl>
        {canManage ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={command} onClick={connect} disabled={busy || !status?.configured}>{state === "connected" ? "reconnect Google" : "connect Google"}</button>{connection && state !== "revoked" ? <button type="button" className={button} onClick={disconnect} disabled={busy}>disconnect</button> : null}</div> : <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs text-secondary">Editor access is report-only. Connection management requires admin authority.</p>}
        {!status?.configured ? <p className="mt-3 text-xs text-secondary">OAuth secrets are not configured in this environment. No credential is accepted in the browser.</p> : null}
        {canManage && connection && !["not_configured", "revoked"].includes(state) ? <div className="mt-5 grid gap-3 border-t-2 border-foreground/20 pt-4"><label className="grid gap-1"><span className="font-label text-xs font-bold uppercase">{provider === "youtube" ? "YouTube channel ID" : "GA4 property ID"}</span><input className={control} value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder={provider === "youtube" ? "UC…" : "numeric property ID"} /></label>{provider === "ga4" ? <label className="grid gap-1"><span className="font-label text-xs font-bold uppercase">property display name</span><input className={control} value={resourceName} onChange={(event) => setResourceName(event.target.value)} placeholder="website name" /></label> : null}<label className="grid gap-1"><span className="font-label text-xs font-bold uppercase">reporting timezone</span><input className={control} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label><button type="button" className={command} onClick={selectResource} disabled={busy || !resourceId.trim()}>{connection.resource ? "validate and change selection" : "validate and select"}</button></div> : null}
        <p className="mt-4 text-xs leading-relaxed text-secondary" aria-live="polite">{notice}</p>
      </div>
      <div className="border-2 border-foreground bg-canvas p-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">stored report</p><h3 className="mt-1 font-heading text-xl font-bold lowercase">{report?.resource?.name ?? (provider === "youtube" ? "YouTube channel" : "website property")}</h3></div><div className="flex flex-wrap gap-2"><label className="grid gap-1 text-xs"><span>from</span><input className={control} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="grid gap-1 text-xs"><span>to</span><input className={control} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button type="button" className={button} onClick={() => void loadReport()} disabled={busy || !connection?.resource}>refresh view</button></div></div>
        {!report ? <div className="mt-5 border-2 border-dashed border-foreground/40 p-5"><h4 className="font-heading text-lg font-bold lowercase">{connection?.resource ? "no stored report for this range" : "connect and select a resource"}</h4><p className="mt-2 text-sm text-secondary">The dashboard waits for provider-backed stored data. Missing observations remain unavailable.</p></div> : <><dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="border-2 border-foreground/20 p-3"><dt className="font-label text-[10px] font-bold uppercase text-muted">{label}</dt><dd className="mt-1 font-heading text-xl font-bold">{formatMetric(value)}</dd></div>)}</dl><p className="mt-4 text-xs text-secondary">Timezone: {report.resource?.timezone ?? "unavailable"}. Last successful refresh: {report.freshness ?? "not observed"}.</p><TrendTable provider={provider} rows={report.trends ?? []} /><ReportTable provider={provider} rows={provider === "youtube" ? report.videos ?? [] : report.trafficSources ?? []} /></>}
      </div>
    </div>
  </section>;
}

function TrendTable({ provider, rows }: { provider: Provider; rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs text-secondary">No daily trend observations are stored for this range.</p>;
  const columns = provider === "youtube" ? ["date", "views", "watchMinutes", "subscribersGained", "subscribersLost"] : ["date", "users", "sessions", "engagedSessions", "engagementRate"];
  return <div className="mt-5"><h4 className="font-heading text-lg font-bold lowercase">daily trend</h4><div className="mt-2 max-h-72 overflow-auto"><table className="min-w-full border-collapse text-left text-xs"><thead><tr>{columns.map((column) => <th key={column} className="sticky top-0 border-b-2 border-foreground bg-canvas px-2 py-2 font-label uppercase">{column.replaceAll(/([A-Z])/gu, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.date ?? "day")}-${index}`}>{columns.map((column) => <td key={column} className="border-b border-foreground/20 px-2 py-2">{column === "date" ? String(row[column] ?? "unavailable") : column === "engagementRate" && typeof row[column] === "number" ? `${formatMetric(Number(row[column]) * 100)}%` : formatMetric(row[column])}</td>)}</tr>)}</tbody></table></div></div>;
}

function ReportTable({ provider, rows }: { provider: Provider; rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs text-secondary">No per-{provider === "youtube" ? "video" : "source"} rows are stored for this range.</p>;
  const columns = provider === "youtube" ? ["title", "views", "watchMinutes", "averageViewDurationSeconds", "subscriberChange"] : ["trafficSource", "users", "sessions", "engagedSessions"];
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full border-collapse text-left text-xs"><thead><tr>{columns.map((column) => <th key={column} className="border-b-2 border-foreground px-2 py-2 font-label uppercase">{column.replaceAll(/([A-Z])/gu, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.videoId ?? row.trafficSource ?? "row")}-${index}`}>{columns.map((column) => <td key={column} className="border-b border-foreground/20 px-2 py-2">{column === "title" || column === "trafficSource" ? String(row[column] ?? "unavailable") : formatMetric(row[column])}</td>)}</tr>)}</tbody></table></div>;
}
