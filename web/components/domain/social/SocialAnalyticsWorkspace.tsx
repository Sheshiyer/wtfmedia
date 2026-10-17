"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PlatformLogo } from "@/components/domain/social/PlatformLogo";
import {
  PLATFORM_DEFINITIONS,
  type SocialAccount,
  type SocialDashboard,
  type SocialPlatform,
  type SocialStatusResponse,
} from "@/lib/social-analytics/contracts";

type PlatformFilter = SocialPlatform | "all";
type RangeDays = 7 | 28 | 90;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function dateScope(days: RangeDays) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { fromDate: isoDate(from), toDate: isoDate(to) };
}

function compact(value: number | null): string {
  if (value === null) return "Unavailable";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function percent(value: number | null): string {
  if (value === null) return "Unavailable";
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function accountLabel(account: SocialAccount): string {
  return account.displayName ?? account.username ?? "Connected account";
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "The request could not be completed.");
  return payload;
}

export function SocialAnalyticsWorkspace() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SocialStatusResponse | null>(null);
  const [dashboard, setDashboard] = useState<SocialDashboard | null>(null);
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [rangeDays, setRangeDays] = useState<RangeDays>(28);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callbackPlatform = searchParams.get("connected");
  const accounts = useMemo(() => status?.accounts ?? [], [status?.accounts]);
  const connectedPlatforms = useMemo(() => new Set(accounts.filter((account) => account.isActive).map((account) => account.platform)), [accounts]);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const response = await fetch("/api/social-analytics/status", { cache: "no-store" });
      setStatus(await responseJson<SocialStatusResponse>(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load connected accounts.");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!status?.configured || accounts.length === 0) {
      setDashboard(null);
      return;
    }
    if (platform !== "all" && !connectedPlatforms.has(platform)) {
      setPlatform("all");
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoadingDashboard(true);
      setError(null);
      try {
        const scope = dateScope(rangeDays);
        const query = new URLSearchParams({ platform, ...scope });
        const response = await fetch(`/api/social-analytics/dashboard?${query}`, { cache: "no-store", signal: controller.signal });
        const payload = await responseJson<{ dashboard: SocialDashboard }>(response);
        setDashboard(payload.dashboard);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setDashboard(null);
        setError(caught instanceof Error ? caught.message : "Could not load analytics.");
      } finally {
        if (!controller.signal.aborted) setLoadingDashboard(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [accounts.length, connectedPlatforms, platform, rangeDays, status?.configured]);

  const connect = async (target: SocialPlatform) => {
    setConnecting(target);
    setError(null);
    try {
      const response = await fetch("/api/social-analytics/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: target }),
      });
      const payload = await responseJson<{ authUrl: string }>(response);
      window.location.assign(payload.authUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the connection.");
      setConnecting(null);
    }
  };

  const chartMaximum = Math.max(1, ...(dashboard?.daily.map((day) => day.impressions ?? 0) ?? [1]));
  const metricCards = dashboard ? [
    { label: "impressions", value: compact(dashboard.totals.impressions), note: "content shown" },
    { label: "reach", value: compact(dashboard.totals.reach), note: "reported reach across days" },
    { label: "engagement", value: percent(dashboard.totals.engagementRate), note: "interaction rate" },
    { label: "followers", value: compact(dashboard.followers.current), note: dashboard.followers.gained === null ? "Growth unavailable" : `${dashboard.followers.gained >= 0 ? "+" : ""}${compact(dashboard.followers.gained)} in range` },
    { label: "likes", value: compact(dashboard.totals.likes), note: "positive signals" },
    { label: "shares + saves", value: compact(dashboard.totals.shares === null || dashboard.totals.saves === null ? null : dashboard.totals.shares + dashboard.totals.saves), note: "high-intent actions" },
    { label: "clicks", value: compact(dashboard.totals.clicks), note: "traffic actions" },
    { label: "video views", value: compact(dashboard.totals.views), note: "plays reported" },
  ] : [];

  return <div className="bg-canvas pb-16" data-social-analytics-workspace>
    <section className="border-b-2 border-foreground px-4 py-10 sm:px-8 xl:px-12">
      <div className="mx-auto grid max-w-[var(--wtf-content-max)] gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-end">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="h-1 w-9 border border-foreground bg-editorial" aria-hidden="true" />
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">WTF social intelligence · local lab</p>
          </div>
          <h1 className="font-display text-[clamp(3rem,8vw,7rem)] font-extrabold lowercase leading-[0.82] tracking-[-0.055em] text-foreground">
            read the room.<br /><span className="font-editorial font-medium italic">across every feed.</span>
          </h1>
        </div>
        <div className="border-l-4 border-attention pl-6">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">one connected workspace</p>
          <p className="mt-3 max-w-md font-body text-lg leading-relaxed text-secondary">Connect each channel once. Zernio handles platform OAuth; WTF OS turns the returned data into one decision view.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-surface-raised px-3 py-2 font-label text-xs font-bold uppercase tracking-wide">
            <span className="h-2.5 w-2.5 rounded-full bg-live" aria-hidden="true" /> local only · not deployed
          </div>
        </div>
      </div>
    </section>

    <main className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
      {callbackPlatform && <div className="mb-6 border-2 border-foreground bg-live/10 p-4 font-body text-sm" role="status">
        <strong className="font-label">Connection returned from Zernio.</strong> Refreshing account access for {callbackPlatform}.
      </div>}
      {status && !status.configured && <p className="mb-6 border-2 border-foreground p-4" role="status">Social analytics is not configured. Add the local Zernio API key and profile ID to enable connections.</p>}
      {error && <div className="mb-6 border-2 border-editorial bg-editorial/10 p-4 font-body text-sm text-foreground" role="alert">
        <strong className="font-label">Needs attention:</strong> {error}
      </div>}

      <section aria-labelledby="connections-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">01 · connections</p>
            <h2 id="connections-heading" className="mt-2 font-display text-heading font-bold lowercase tracking-tight">bring the channels in</h2>
          </div>
          <Button variant="secondary" onClick={() => void loadStatus()} loading={loadingStatus}>refresh connections</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLATFORM_DEFINITIONS.map((definition) => {
            const account = accounts.find((candidate) => candidate.platform === definition.id && candidate.isActive);
            return <article key={definition.id} className="flex min-h-[260px] flex-col border-2 border-foreground bg-surface-raised p-5 shadow-[6px_6px_0_var(--wtf-surface-structure)]">
              <div className="flex items-start justify-between gap-3">
                <PlatformLogo platform={definition.id} />
                <span className="inline-flex items-center gap-2 font-label text-[11px] font-bold uppercase tracking-wide text-muted">
                  <span className={`h-2.5 w-2.5 rounded-full ${account ? account.health === "connected" ? "bg-live" : "bg-attention" : "bg-muted"}`} aria-hidden="true" />
                  {account ? account.health === "connected" ? "connected" : account.health === "attention" ? "attention" : "check unavailable" : "not connected"}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold">{definition.label}</h3>
              <p className="mt-2 flex-1 font-body text-sm leading-relaxed text-secondary">{account ? accountLabel(account) : definition.description}</p>
              {account?.healthMessage && <p className="mb-3 text-xs text-editorial">{account.healthMessage}</p>}
              <Button variant={account ? "secondary" : "attention"} loading={connecting === definition.id} disabled={!status?.configured || connecting !== null} onClick={() => void connect(definition.id)}>
                {account ? "reconnect" : `connect ${definition.label}`}
              </Button>
            </article>;
          })}
        </div>
      </section>

      <section className="mt-12 border-2 border-foreground bg-surface-raised" aria-labelledby="dashboard-heading">
        <div className="flex flex-col gap-5 border-b-2 border-foreground p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">02 · performance</p>
            <h2 id="dashboard-heading" className="mt-2 font-display text-heading font-bold lowercase tracking-tight">what changed?</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 font-label text-[10px] font-bold uppercase tracking-wide text-muted">
              platform
              <select className="min-h-11 rounded-[var(--wtf-radius-control)] border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground" value={platform} onChange={(event) => setPlatform(event.target.value as PlatformFilter)}>
                <option value="all">All connected</option>
                {PLATFORM_DEFINITIONS.filter((item) => connectedPlatforms.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 font-label text-[10px] font-bold uppercase tracking-wide text-muted">
              date range
              <select className="min-h-11 rounded-[var(--wtf-radius-control)] border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground" value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value) as RangeDays)}>
                <option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option>
              </select>
            </label>
          </div>
        </div>

        {loadingDashboard ? <div className="grid min-h-[360px] place-items-center p-8"><p className="font-label text-sm font-bold uppercase tracking-widest text-muted">loading live analytics…</p></div>
          : accounts.length === 0 ? <div className="grid min-h-[360px] place-items-center p-8 text-center"><div className="max-w-lg"><p className="font-editorial text-3xl italic">The dashboard is ready for its first signal.</p><p className="mt-4 font-body text-secondary">Connect any platform above. Once OAuth returns, the totals, trend line, and strongest posts will populate here automatically.</p></div></div>
          : dashboard ? <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {metricCards.map((metric) => <article key={metric.label} className="border-b-2 border-foreground p-5 sm:border-r-2 [&:nth-child(2n)]:sm:border-r-0 [&:nth-child(4n)]:lg:border-r-0 [&:nth-child(2n)]:lg:border-r-2">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{metric.label}</p>
                <p className="mt-3 font-display text-4xl font-extrabold tracking-tight">{metric.value}</p>
                <p className="mt-2 text-sm text-secondary">{metric.note}</p>
              </article>)}
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <article className="border-b-2 border-foreground p-5 lg:border-b-0 lg:border-r-2 sm:p-6">
                <div className="flex items-center justify-between gap-4"><h3 className="font-display text-2xl font-bold lowercase">daily distribution</h3><p className="font-label text-[10px] uppercase tracking-wide text-muted">impressions</p></div>
                <div className="mt-8 flex h-56 items-end gap-1 border-b-2 border-foreground" aria-label="Daily performance chart">
                  {dashboard.daily.length ? dashboard.daily.map((day) => {
                    const value = day.impressions;
                    return <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${day.date}: ${value === null ? "Unavailable" : value.toLocaleString()} impressions`}>
                      <div className="w-full bg-information transition-colors group-hover:bg-attention" style={{ height: `${((value ?? 0) / chartMaximum) * 100}%` }} />
                    </div>;
                  }) : <div className="grid h-full w-full place-items-center text-sm text-muted">No daily observations returned for this range.</div>}
                </div>
                <div className="mt-2 flex justify-between font-label text-[10px] text-muted"><span>{dashboard.dateRange.fromDate}</span><span>{dashboard.dateRange.toDate}</span></div>
              </article>
              <article className="p-5 sm:p-6">
                <h3 className="font-display text-2xl font-bold lowercase">strongest posts</h3>
                <p className="mt-2 text-xs text-muted">Published in this range · lifetime metrics</p>
                <div className="mt-5 divide-y-2 divide-foreground">
                  {dashboard.topPosts.length ? dashboard.topPosts.slice(0, 5).map((post, index) => <div key={`${post.postId}-${index}`} className="py-4 first:pt-0">
                    <div className="flex items-center justify-between gap-3"><span className="font-label text-[10px] font-bold uppercase tracking-wide text-information">{post.platform === "twitter" ? "X" : post.platform}</span><span className="font-label text-[10px] text-muted">{compact(post.metrics.impressions)} impressions</span></div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed">{post.text ?? `Post ${post.postId}`}</p>
                  </div>) : <p className="py-6 text-sm leading-relaxed text-muted">No post-level analytics returned yet. Zernio may need the analytics add-on or a completed first data sync.</p>}
                </div>
              </article>
            </div>
          </div> : <div className="grid min-h-[360px] place-items-center p-8 text-center"><p className="max-w-lg font-body text-secondary">Connected accounts were found, but the analytics summary is unavailable. Check the notice above for the provider response.</p></div>}
      </section>
    </main>
  </div>;
}
