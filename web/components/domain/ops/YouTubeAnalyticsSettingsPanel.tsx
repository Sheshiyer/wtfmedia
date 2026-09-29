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
  range?: { startDate: string; endDate: string };
  freshness?: string | null;
  totals?: Record<string, number | null>;
  trends?: Array<Record<string, unknown>>;
  videos?: Array<Record<string, unknown>>;
  trafficSources?: Array<Record<string, unknown>>;
  periods?: { current?: Record<string, number | null>; previous?: Record<string, number | null>; trailing28?: Record<string, number | null> };
  comparisons?: { previous?: Record<string, { absolute: number | null; relative: number | null }>; trailing28?: Record<string, { absolute: number | null; relative: number | null }> };
  expectations?: { ctr?: number | null; retention?: number | null; method?: string; formulaVersion?: string };
  insights?: Array<{ kind: string; message: string; evidence: string[] }>;
  contentPatterns?: Array<Record<string, unknown>>;
  coverage?: Record<string, unknown>;
  formulas?: Record<string, unknown>;
};

const control = "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-55";
const button = "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-canvas px-3 py-2 font-label text-xs font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";
const command = "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground bg-attention px-4 py-2 font-label text-xs font-bold lowercase text-on-attention focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information disabled:cursor-not-allowed disabled:opacity-50";

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function formatMetric(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value) : "unavailable"; }
function formatPercent(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value * 100)}%` : "unavailable"; }
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

  async function syncNow() {
    if (!canManage || !connection?.resource) return;
    setBusy(true);
    try {
      const response = await fetch("/beta/api/analytics/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, startDate, endDate }) });
      const value = await response.json() as { sync?: { status?: string; rows?: number; errorCode?: string }; error?: string };
      if (!response.ok || value.sync?.status !== "completed") throw new Error(value.sync?.errorCode ?? value.error ?? "sync_failed");
      await Promise.all([loadStatus(), loadReport()]);
      setNotice(`Provider synchronization completed with ${formatMetric(value.sync.rows)} stored observations.`);
    } catch {
      setNotice("Provider synchronization did not complete. The prior stored report remains unchanged.");
    } finally { setBusy(false); }
  }

  const state = connection?.status ?? "not_configured";
  const totals = report?.totals ?? {};
  const cards = provider === "youtube"
    ? [["views", totals.views], ["impressions", totals.impressions], ["thumbnail CTR", typeof totals.impressions_ctr === "number" ? totals.impressions_ctr * 100 : null], ["retention %", totals.average_view_percentage], ["watch time (minutes)", totals.watch_minutes], ["average view duration (seconds)", totals.average_view_duration_seconds], ["subscribers gained", totals.subscribers_gained], ["unsubscribed views", totals.unsubscribed_views]]
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
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted">stored report</p><h3 className="mt-1 font-heading text-xl font-bold lowercase">{report?.resource?.name ?? (provider === "youtube" ? "YouTube channel" : "website property")}</h3></div><div className="flex flex-wrap gap-2"><label className="grid gap-1 text-xs"><span>from</span><input className={control} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="grid gap-1 text-xs"><span>to</span><input className={control} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button type="button" className={button} onClick={() => void loadReport()} disabled={busy || !connection?.resource}>refresh view</button>{canManage ? <button type="button" className={command} onClick={syncNow} disabled={busy || !connection?.resource}>sync provider</button> : null}</div></div>
        {!report ? <div className="mt-5 border-2 border-dashed border-foreground/40 p-5"><h4 className="font-heading text-lg font-bold lowercase">{connection?.resource ? "no stored report for this range" : "connect and select a resource"}</h4><p className="mt-2 text-sm text-secondary">The dashboard waits for provider-backed stored data. Missing observations remain unavailable.</p></div> : <><dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="border-2 border-foreground/20 p-3"><dt className="font-label text-[10px] font-bold uppercase text-muted">{label}</dt><dd className="mt-1 font-heading text-xl font-bold">{formatMetric(value)}</dd></div>)}</dl><p className="mt-4 text-xs text-secondary">Timezone: {report.resource?.timezone ?? "unavailable"}. Last successful refresh: {report.freshness ?? "not observed"}.</p>{provider === "youtube" ? <YouTubeDecisionWorkspace report={report} canManage={canManage} /> : null}<TrendTable provider={provider} rows={report.trends ?? []} /><ReportTable provider={provider} rows={provider === "youtube" ? report.videos ?? [] : report.trafficSources ?? []} /></>}
      </div>
    </div>
  </section>;
}

function YouTubeDecisionWorkspace({ report, canManage }: { report: Report; canManage: boolean }) {
  const current = report.periods?.current ?? {};
  const previous = report.comparisons?.previous ?? {};
  const decisions = [
    ["distribution", `CTR ${formatPercent(current.impressionsCtr)} · ${formatMetric(current.estimatedImpressionClicks)} estimated clicks`, previous.impressionsCtr?.relative],
    ["attention", `retention ${formatMetric(current.averageViewPercentage)}% · AVD ${formatMetric(current.averageViewDurationSeconds)}s`, previous.averageViewPercentage?.relative],
    ["subscriber value", `STV ${formatPercent(current.stvRate)} · conversion ${formatPercent(current.conversionRate)}`, previous.stvRate?.relative],
    ["audience mix", `${formatMetric(current.unsubscribedViews)} unsubscribed views · ${formatPercent(current.unsubscribedViewPercentage)}`, previous.unsubscribedViews?.relative],
  ] as const;
  return <div className="mt-5 grid gap-4">
    <section aria-label="Decision metrics"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{decisions.map(([label, detail, change]) => <article key={label} className="border-2 border-foreground p-3"><p className="font-label text-[10px] font-bold uppercase text-muted">{label}</p><p className="mt-2 text-sm font-semibold">{detail}</p><p className="mt-2 text-xs text-secondary">{typeof change === "number" ? `${change >= 0 ? "+" : ""}${formatPercent(change)} vs previous period` : "comparison unavailable"}</p></article>)}</div></section>
    <section className="border-2 border-foreground/20 p-4" aria-label="Expected performance"><h4 className="font-heading text-lg font-bold lowercase">expected performance</h4><p className="mt-2 text-sm text-secondary">Expected CTR: {formatPercent(report.expectations?.ctr)}. Expected retention: {formatMetric(report.expectations?.retention)}%. Baseline: previous 28 complete days. Contract: {report.expectations?.formulaVersion ?? "unavailable"}.</p></section>
    <section className="border-2 border-foreground/20 p-4" aria-label="Written insights"><h4 className="font-heading text-lg font-bold lowercase">written insights and recommendations</h4>{report.insights?.length ? <ul className="mt-3 grid gap-2">{report.insights.map((insight, index) => <li key={`${insight.kind}-${index}`} className="border-l-4 border-information bg-surface-subtle px-3 py-2 text-sm"><strong className="mr-2 font-label uppercase">{insight.kind}</strong>{insight.message}<span className="mt-1 block text-[10px] text-muted">Evidence: {insight.evidence.join(", ")}</span></li>)}</ul> : <p className="mt-2 text-sm text-secondary">Insufficient synchronized evidence for written recommendations.</p>}</section>
    <section className="border-2 border-foreground/20 p-4" aria-label="Content patterns"><h4 className="font-heading text-lg font-bold lowercase">content-pattern analysis</h4>{report.contentPatterns?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{report.contentPatterns.map((pattern, index) => <article key={`${String(pattern.contentType)}-${index}`} className="bg-surface-subtle p-3 text-sm"><strong>{String(pattern.contentType ?? "other").replaceAll("_", " ")}</strong><p className="mt-1 text-secondary">{formatMetric(pattern.episodeCount)} episodes · {formatMetric(pattern.views)} views · {formatMetric(pattern.impressions)} impressions</p><span className="mt-1 block font-label text-[10px] uppercase text-muted">{String(pattern.status ?? "unavailable").replaceAll("_", " ")} · hypothesis only</span></article>)}</div> : <p className="mt-2 text-sm text-secondary">No classified content groups are stored.</p>}</section>
    <YouTubeEpisodeComparisonPanel report={report} />
    <YouTubeRetentionPanel report={report} canManage={canManage} />
    <details className="border-2 border-foreground/20 p-4"><summary className="cursor-pointer font-label text-xs font-bold uppercase">coverage and formulas</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-secondary">{JSON.stringify({ coverage: report.coverage, formulas: report.formulas }, null, 2)}</pre></details>
  </div>;
}

function YouTubeEpisodeComparisonPanel({ report }: { report: Report }) {
  const options = report.videos ?? [];
  const [videoA, setVideoA] = useState(() => String(options[0]?.videoId ?? ""));
  const [videoB, setVideoB] = useState(() => String(options[1]?.videoId ?? ""));
  const [window, setWindow] = useState("first7");
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [notice, setNotice] = useState("Choose two episodes. Fixed windows enforce equal post-publish age.");

  async function compareEpisodes() {
    if (!videoA || !videoB || videoA === videoB) { setNotice("Choose two different episodes."); return; }
    const query = new URLSearchParams({ videoA, videoB, window });
    const response = await fetch(`/beta/api/analytics/youtube/episodes/compare?${query}`, { cache: "no-store" });
    const value = await response.json() as Record<string, unknown> & { error?: string };
    setComparison(response.ok ? value : null);
    setNotice(response.ok ? "Stored provider observations compared with the selected age rule." : "The comparison is unavailable for these episodes.");
  }

  const a = comparison?.episodeA as Record<string, unknown> | undefined;
  const b = comparison?.episodeB as Record<string, unknown> | undefined;
  const deviations = comparison?.deviations as Record<string, { absolute?: number | null; relative?: number | null }> | undefined;
  const rows = ["views", "impressions", "impressionsCtr", "averageViewPercentage", "subscribersGained", "subscribersPerMillionImpressions"];
  return <section className="border-2 border-foreground/20 p-4" aria-label="Episode comparison">
    <h4 className="font-heading text-lg font-bold lowercase">episode comparison</h4>
    <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]"><select className={control} aria-label="Episode A" value={videoA} onChange={(event) => setVideoA(event.target.value)}>{options.map((video) => <option key={`a-${String(video.videoId)}`} value={String(video.videoId)}>{String(video.title ?? video.videoId)}</option>)}</select><select className={control} aria-label="Episode B" value={videoB} onChange={(event) => setVideoB(event.target.value)}>{options.map((video) => <option key={`b-${String(video.videoId)}`} value={String(video.videoId)}>{String(video.title ?? video.videoId)}</option>)}</select><select className={control} aria-label="Comparison age window" value={window} onChange={(event) => setWindow(event.target.value)}><option value="first24">first 24 hours</option><option value="first7">first 7 days</option><option value="first28">first 28 days</option><option value="lifetime">lifetime</option></select><button type="button" className={button} onClick={compareEpisodes} disabled={options.length < 2}>compare</button></div>
    <p className="mt-2 text-xs text-secondary">{notice}</p>
    {a && b ? <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr><th className="border-b-2 border-foreground p-2">metric</th><th className="border-b-2 border-foreground p-2">{String(a.title ?? "episode A")}</th><th className="border-b-2 border-foreground p-2">deviation</th><th className="border-b-2 border-foreground p-2">{String(b.title ?? "episode B")}</th></tr></thead><tbody>{rows.map((key) => <tr key={key}><th className="border-b border-foreground/20 p-2">{key.replaceAll(/([A-Z])/gu, " $1")}</th><td className="border-b border-foreground/20 p-2">{key === "impressionsCtr" ? formatPercent(a[key]) : formatMetric(a[key])}</td><td className="border-b border-foreground/20 p-2">{key === "impressionsCtr" ? formatPercent(deviations?.[key]?.absolute) : formatMetric(deviations?.[key]?.absolute)}</td><td className="border-b border-foreground/20 p-2">{key === "impressionsCtr" ? formatPercent(b[key]) : formatMetric(b[key])}</td></tr>)}</tbody></table></div> : null}
  </section>;
}

function YouTubeRetentionPanel({ report, canManage }: { report: Report; canManage: boolean }) {
  const options = report.videos ?? [];
  const [videoId, setVideoId] = useState(() => String(options[0]?.videoId ?? ""));
  const [points, setPoints] = useState<Array<Record<string, unknown>>>([]);
  const [state, setState] = useState("Choose a synchronized episode to inspect its retention curve.");
  const range = report.range;

  const load = useCallback(async (selected: string) => {
    if (!selected || !range) return;
    const query = new URLSearchParams({ videoId: selected, startDate: range.startDate, endDate: range.endDate });
    const response = await fetch(`/beta/api/analytics/youtube/retention?${query}`, { cache: "no-store" });
    const value = await response.json() as { points?: Array<Record<string, unknown>>; status?: string };
    setPoints(response.ok ? value.points ?? [] : []);
    setState(response.ok && value.points?.length ? `${value.points.length} provider retention points loaded.` : "No stored curve for this episode and range. Admins can synchronize it on demand.");
  }, [range]);

  useEffect(() => { void load(videoId); }, [load, videoId]);

  async function syncRetention() {
    if (!videoId || !range) return;
    setState("Synchronizing the provider retention curve.");
    const response = await fetch("/beta/api/analytics/youtube/retention", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId, startDate: range.startDate, endDate: range.endDate }) });
    if (!response.ok) { setState("Retention synchronization did not complete; prior stored evidence is unchanged."); return; }
    await load(videoId);
  }

  return <section className="border-2 border-foreground/20 p-4" aria-label="Audience retention curve">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="font-heading text-lg font-bold lowercase">audience retention curve</h4><p className="mt-1 text-xs text-secondary">Dedicated per-video Analytics API report; it is not inferred from average retention.</p></div><div className="flex flex-wrap gap-2"><select className={control} aria-label="Retention episode" value={videoId} onChange={(event) => setVideoId(event.target.value)}>{options.map((video) => <option key={String(video.videoId)} value={String(video.videoId)}>{String(video.title ?? video.videoId)}</option>)}</select>{canManage ? <button type="button" className={button} onClick={syncRetention} disabled={!videoId || !range}>sync retention</button> : null}</div></div>
    <p className="mt-3 text-xs text-secondary">{state}</p>
    {points.length ? <div className="mt-3 max-h-56 overflow-auto"><table className="min-w-full text-left text-xs"><thead><tr><th className="border-b-2 border-foreground p-2">video elapsed</th><th className="border-b-2 border-foreground p-2">audience watch ratio</th><th className="border-b-2 border-foreground p-2">relative retention</th><th className="border-b-2 border-foreground p-2">segment impressions</th></tr></thead><tbody>{points.map((point, index) => <tr key={`${String(point.elapsedVideoTimeRatio)}-${index}`}><td className="border-b border-foreground/20 p-2">{formatPercent(point.elapsedVideoTimeRatio)}</td><td className="border-b border-foreground/20 p-2">{formatPercent(point.audienceWatchRatio)}</td><td className="border-b border-foreground/20 p-2">{formatMetric(point.relativeRetentionPerformance)}</td><td className="border-b border-foreground/20 p-2">{formatMetric(point.totalSegmentImpressions)}</td></tr>)}</tbody></table></div> : null}
  </section>;
}

function TrendTable({ provider, rows }: { provider: Provider; rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs text-secondary">No daily trend observations are stored for this range.</p>;
  const columns = provider === "youtube" ? ["date", "views", "watchMinutes", "subscribersGained", "subscribersLost"] : ["date", "users", "sessions", "engagedSessions", "engagementRate"];
  return <div className="mt-5"><h4 className="font-heading text-lg font-bold lowercase">daily trend</h4><div className="mt-2 max-h-72 overflow-auto"><table className="min-w-full border-collapse text-left text-xs"><thead><tr>{columns.map((column) => <th key={column} className="sticky top-0 border-b-2 border-foreground bg-canvas px-2 py-2 font-label uppercase">{column.replaceAll(/([A-Z])/gu, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.date ?? "day")}-${index}`}>{columns.map((column) => <td key={column} className="border-b border-foreground/20 px-2 py-2">{column === "date" ? String(row[column] ?? "unavailable") : column === "engagementRate" && typeof row[column] === "number" ? `${formatMetric(Number(row[column]) * 100)}%` : formatMetric(row[column])}</td>)}</tr>)}</tbody></table></div></div>;
}

function ReportTable({ provider, rows }: { provider: Provider; rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="mt-4 border-l-4 border-information bg-surface-subtle px-3 py-2 text-xs text-secondary">No per-{provider === "youtube" ? "video" : "source"} rows are stored for this range.</p>;
  const columns = provider === "youtube" ? ["title", "views", "impressions", "impressionsCtr", "averageViewPercentage", "subscriberChange", "subscribersPerMillionImpressions", "impressionTier", "performanceGroup"] : ["trafficSource", "users", "sessions", "engagedSessions"];
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full border-collapse text-left text-xs"><thead><tr>{columns.map((column) => <th key={column} className="border-b-2 border-foreground px-2 py-2 font-label uppercase">{column.replaceAll(/([A-Z])/gu, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.videoId ?? row.trafficSource ?? "row")}-${index}`}>{columns.map((column) => <td key={column} className="border-b border-foreground/20 px-2 py-2">{column === "title" || column === "trafficSource" || column === "performanceGroup" ? String(row[column] ?? "unavailable").replaceAll("_", " ") : column === "impressionTier" ? String((row[column] as { label?: string } | null)?.label ?? "unavailable") : column === "impressionsCtr" ? formatPercent(row[column]) : formatMetric(row[column])}</td>)}</tr>)}</tbody></table></div>;
}
