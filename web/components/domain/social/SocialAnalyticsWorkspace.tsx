"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useMemberFetch } from "@/components/domain/beta/BetaPrincipalGate";
import { SocialAnalyticsChat } from "@/components/domain/social/SocialAnalyticsChat";
import { PlatformLogo } from "@/components/domain/social/PlatformLogo";
import {
  PLATFORM_DEFINITIONS,
  type LinkedInOrganization,
  type SocialAccount,
  type SocialDashboard,
  type SocialPlatform,
  type SocialStatusResponse,
} from "@/lib/social-analytics/contracts";

type PlatformFilter = SocialPlatform | "all";
type RangeDays = 7 | 28 | 90 | 365;

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
function postFallback(platform: SocialPlatform, publishedAt: string | null): string {
  const name = platform === "twitter" ? "X" : PLATFORM_DEFINITIONS.find(item => item.id === platform)!.label;
  const date = publishedAt ? new Date(publishedAt) : null;
  return date && Number.isFinite(date.getTime()) ? `${name} post · ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date)}` : `${name} post`;
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "The request could not be completed.");
  return payload;
}

type BetaSocialStatusResponse = SocialStatusResponse & {
  canManage: boolean;
  selectionRequired?: boolean;
};

type SocialFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const localFetch: SocialFetch = (input, init) => fetch(input, init);

export function SocialAnalyticsWorkspace() {
  return <SocialAnalyticsView request={localFetch} apiBase="/api/social-analytics" />;
}

export function BetaSocialAnalyticsWorkspace() {
  const request = useMemberFetch();
  return <SocialAnalyticsView request={request} apiBase="/beta/api/social-analytics" beta />;
}

function SocialAnalyticsView({ request, apiBase, beta = false }: {
  request: SocialFetch;
  apiBase: string;
  beta?: boolean;
}) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BetaSocialStatusResponse | null>(null);
  const [dashboard, setDashboard] = useState<SocialDashboard | null>(null);
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [rangeDays, setRangeDays] = useState<RangeDays>(28);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pagePicker, setPagePicker] = useState<string | null>(null);
  const [linkedinPages, setLinkedinPages] = useState<LinkedInOrganization[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [switchingPage, setSwitchingPage] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mutationPending = useRef(false);
  const dashboardRequest = useRef<AbortController | null>(null);
  const statusRequest = useRef<AbortController | null>(null);
  const canManage = beta && status?.canManage === true;
  const scope = useMemo(() => ({ platform, ...dateScope(rangeDays) }), [platform, rangeDays]);

  const callbackPlatform = searchParams.get("connected");
  const accounts = useMemo(() => status?.accounts ?? [], [status?.accounts]);
  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);
  const connectedPlatforms = useMemo(() => new Set(activeAccounts.map((account) => account.platform)), [activeAccounts]);
  const selectedAccount = useMemo(() => platform === "all" ? null : activeAccounts.find((account) => account.platform === platform) ?? null, [activeAccounts, platform]);

  const loadStatus = useCallback(async () => {
    dashboardRequest.current?.abort();
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    setLoadingStatus(true);
    setStatus(null);
    setDashboard(null);
    setError(null);
    try {
      const response = await request(`${apiBase}/status`, { cache: "no-store", signal: controller.signal });
      const payload = await responseJson<BetaSocialStatusResponse>(response);
      if (controller.signal.aborted) return;
      setStatus(payload);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Could not load connected accounts.");
    } finally {
      if (!controller.signal.aborted) setLoadingStatus(false);
    }
  }, [apiBase, request]);

  useEffect(() => {
    void loadStatus();
    return () => statusRequest.current?.abort();
  }, [loadStatus]);

  useEffect(() => {
    setDashboard(null);
    if (!status?.configured || status.selectionRequired || activeAccounts.length === 0) {
      setLoadingDashboard(false);
      return;
    }
    if (platform !== "all" && !connectedPlatforms.has(platform)) {
      setPlatform("all");
      return;
    }
    const controller = new AbortController();
    dashboardRequest.current = controller;
    const load = async () => {
      setLoadingDashboard(true);
      setError(null);
      try {
        const query = new URLSearchParams(scope);
        const response = await request(`${apiBase}/dashboard?${query}`, { cache: "no-store", signal: controller.signal });
        const payload = await responseJson<{ dashboard: SocialDashboard }>(response);
        if (!controller.signal.aborted) setDashboard(payload.dashboard);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setDashboard(null);
        setError(caught instanceof Error ? caught.message : "Could not load analytics.");
      } finally {
        if (!controller.signal.aborted) setLoadingDashboard(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [activeAccounts.length, apiBase, connectedPlatforms, platform, request, scope, status]);

  const connect = async (target: SocialPlatform) => {
    if (!canManage || !status?.configured || status.selectionRequired || mutationPending.current) return;
    mutationPending.current = true;
    setConnecting(target);
    setError(null);
    try {
      const response = await request(`${apiBase}/connect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: target }),
      });
      const payload = await responseJson<{ authUrl: string }>(response);
      window.location.assign(payload.authUrl);
    } catch (caught) {
      dashboardRequest.current?.abort();
      setDashboard(null);
      setLoadingDashboard(false);
      setError(caught instanceof Error ? caught.message : "Could not start the connection.");
      mutationPending.current = false;
      setConnecting(null);
    }
  };

  const openLinkedInPages = async (accountId: string) => {
    if (!canManage || mutationPending.current) return;
    if (pagePicker === accountId) { setPagePicker(null); return; }
    setLoadingPages(true);
    setError(null);
    try {
      const response = await request(`${apiBase}/linkedin-pages?accountId=${encodeURIComponent(accountId)}`, { cache: "no-store" });
      const payload = await responseJson<{ organizations: LinkedInOrganization[] }>(response);
      setLinkedinPages(payload.organizations);
      setPagePicker(accountId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not list company pages."); }
    finally { setLoadingPages(false); }
  };
  const switchLinkedInPage = async (accountId: string, organizationId: string) => {
    if (!canManage || mutationPending.current) return;
    mutationPending.current = true;
    setSwitchingPage(true);
    setError(null);
    try {
      const response = await request(`${apiBase}/linkedin-pages`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId, organizationId }) });
      const result = await responseJson<{ postsSync: "complete" | "pending" }>(response);
      setPagePicker(null);
      setNotice(result.postsSync === "complete" ? "LinkedIn company page selected and posts imported. Analytics may take a moment to refresh." : "LinkedIn company page selected. Zernio is still syncing posts; refresh shortly.");
      await loadStatus();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not select this company page."); }
    finally { mutationPending.current = false; setSwitchingPage(false); }
  };
  const removeConnection = async (account: SocialAccount) => {
    if (!canManage || mutationPending.current) return;
    mutationPending.current = true;
    setRemoving(account.id);
    setError(null);
    try {
      const response = await request(`${apiBase}/accounts/${encodeURIComponent(account.id)}`, { method: "DELETE" });
      await responseJson(response);
      setRemoveConfirm(null);
      setPagePicker(null);
      setNotice(`${accountLabel(account)} was removed from this workspace.`);
      await loadStatus();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not remove this connection."); }
    finally { mutationPending.current = false; setRemoving(null); }
  };

  const chartMaximum = Math.max(1, ...(dashboard?.daily.map((day) => day.impressions ?? 0) ?? [1]));
  const performance = dashboard ? [dashboard.totals.impressions, dashboard.totals.reach, dashboard.totals.likes, dashboard.totals.comments, dashboard.totals.shares, dashboard.totals.saves, dashboard.totals.clicks, dashboard.totals.views] : [];
  const hasPerformance = performance.some(value => value !== null && value !== 0);
  const hasReportedPerformance = performance.some(value => value !== null);
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
      <div className="mx-auto max-w-[var(--wtf-content-max)]">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="h-1 w-9 border border-foreground bg-editorial" aria-hidden="true" />
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">WTF social intelligence</p>
          </div>
          <h1 className="font-display text-[clamp(3rem,8vw,7rem)] font-extrabold lowercase leading-[0.82] tracking-[-0.055em] text-foreground">
            read the room.<br /><span className="font-editorial font-medium italic">across every feed.</span>
          </h1>
        </div>
      </div>
    </section>

    <main className="mx-auto max-w-[var(--wtf-content-max)] px-4 py-8 sm:px-8 xl:px-12">
      {callbackPlatform && <div className="mb-6 border-2 border-foreground bg-live/10 p-4 font-body text-sm" role="status">
        <strong className="font-label">Connection returned from Zernio.</strong> Refreshing account access for {callbackPlatform}.
      </div>}
      {status && !status.configured && <p className="mb-6 border-2 border-foreground p-4" role="status">{beta ? "Social analytics is not configured. Ask an administrator to check the workspace integration." : "Social analytics is not configured. Add the local Zernio API key to discover your workspace and enable connections."}</p>}
      {error && <div className="mb-6 border-2 border-editorial bg-editorial/10 p-4 font-body text-sm text-foreground" role="alert">
        <strong className="font-label">Needs attention:</strong> {error}
      </div>}
      {notice && <div className="mb-6 border-2 border-foreground bg-live/10 p-4 font-body text-sm" role="status">{notice}</div>}

      {!beta && <p className="mb-4 text-sm"><a className="underline" href="/beta/social-analytics">Open the signed-in workspace</a> to connect accounts as an admin and ask questions about your metrics.</p>}
      {(connecting || loadingStatus) && <p className="mb-4 text-sm" role="status">{connecting ? "Opening secure platform connection…" : "Loading connected accounts…"}</p>}

      <section aria-labelledby="connections-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">01 · connections</p>
            <h2 id="connections-heading" className="mt-2 font-display text-heading font-bold lowercase tracking-tight">bring the channels in</h2>
          </div>
          <Button variant="secondary" onClick={() => void loadStatus()} loading={loadingStatus} disabled={connecting !== null}>refresh connections</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {PLATFORM_DEFINITIONS.map((definition) => {
            const account = accounts.find((candidate) => candidate.platform === definition.id && candidate.isActive);
            const syncPending = account?.analyticsSyncStatus === "never_synced";
            return <article key={definition.id} className="flex min-h-[260px] flex-col border-2 border-foreground bg-surface-raised p-5 shadow-[6px_6px_0_var(--wtf-surface-structure)]">
              <div className="flex items-start justify-between gap-3">
                <PlatformLogo platform={definition.id} />
                <span className="inline-flex items-center gap-2 font-label text-[11px] font-bold uppercase tracking-wide text-muted">
                  <span className={`h-2.5 w-2.5 rounded-full ${account ? account.health === "connected" && !syncPending ? "bg-live" : "bg-attention" : "bg-muted"}`} aria-hidden="true" />
                  {account ? account.health === "connected" ? syncPending ? "sync pending" : "connected" : account.health === "attention" ? "attention" : "check unavailable" : "not connected"}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold">{definition.label}</h3>
              <p className="mt-2 flex-1 font-body text-sm leading-relaxed text-secondary">{account ? accountLabel(account) : definition.description}</p>
              {account?.healthMessage && <p className="mb-3 text-xs text-editorial">{account.healthMessage}</p>}
              {account?.analyticsNote && <p className="mb-3 text-xs leading-relaxed text-muted">{account.analyticsNote}</p>}
              {canManage && account?.platform === "tiktok" && <p className="mb-3 text-xs leading-relaxed text-muted">Reconnect the same TikTok account to keep its history. Connecting a different account replaces the current account and deletes its history.</p>}
              {canManage && account?.platform === "linkedin" && <Button variant={account.accountType === "organization" ? "secondary" : "attention"} loading={loadingPages} disabled={connecting !== null || switchingPage || removing !== null} onClick={() => void openLinkedInPages(account.id)}>
                {account.accountType === "organization" ? "change company page" : "choose company page"}
              </Button>}
              {canManage && (!account || account.platform !== "linkedin") && <Button variant={account ? "secondary" : "attention"} loading={connecting === definition.id} disabled={!status?.configured || status.selectionRequired || connecting !== null} onClick={() => void connect(definition.id)}>
                {account ? "reconnect" : `connect ${definition.label}`}
              </Button>}
              {canManage && account?.platform === "linkedin" && pagePicker === account.id && <div className="mt-4 border-t-2 border-foreground pt-3">
                <p className="font-label text-xs font-bold">Pages you administer</p>
                {linkedinPages.length ? <div className="mt-3 grid gap-2">{linkedinPages.map(page => <button key={page.id} type="button" disabled={switchingPage} onClick={() => void switchLinkedInPage(account.id, page.id)} className="min-w-0 rounded-[var(--wtf-radius-control)] border-2 border-foreground bg-canvas px-3 py-2 text-left font-body text-sm font-semibold hover:bg-attention/20 disabled:opacity-50">{page.name}{page.vanityName && <span className="block break-all text-xs font-normal text-muted">linkedin.com/company/{page.vanityName}</span>}</button>)}</div>
                  : <p className="mt-2 font-body text-xs leading-relaxed text-secondary">No company pages were returned. Make sure this LinkedIn login administers the Page, then reconnect and try again.</p>}
              </div>}
              {canManage && account && <details className="mt-3 border-t border-foreground/20 pt-2">
                <summary className="cursor-pointer font-label text-xs font-semibold text-secondary underline-offset-4 hover:underline">Manage connection</summary>
                <div className="mt-3 grid gap-2">
                  {account.platform === "linkedin" && <button type="button" className="text-left font-body text-xs underline underline-offset-4" onClick={() => void connect("linkedin")}>Reconnect LinkedIn login</button>}
                  {removeConfirm === account.id ? <div className="rounded-[var(--wtf-radius-control)] border border-editorial/60 bg-editorial/5 p-3 font-body text-xs leading-relaxed">
                    <p>Remove {accountLabel(account)} from Zernio? Its analytics will disappear here until you connect it again.</p>
                    <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={removing === account.id} onClick={() => void removeConnection(account)} className="font-semibold text-editorial underline underline-offset-4 disabled:opacity-50">{removing === account.id ? "Removing…" : "Yes, remove connection"}</button><button type="button" onClick={() => setRemoveConfirm(null)} className="underline underline-offset-4">Cancel</button></div>
                  </div> : <button type="button" className="text-left font-body text-xs text-secondary underline underline-offset-4" onClick={() => setRemoveConfirm(account.id)}>Remove this connection</button>}
                </div>
              </details>}
            </article>;
          })}
        </div>
      </section>

      <div className={beta ? "mt-10 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "mt-12"}>
      <section className="min-w-0 border-2 border-foreground bg-surface-raised" aria-labelledby="dashboard-heading">
        <div className="flex flex-col gap-5 border-b-2 border-foreground p-5 sm:p-6">
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
                <option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option><option value={365}>Last 365 days</option>
              </select>
            </label>
          </div>
        </div>

        {loadingDashboard ? <div className="grid min-h-[360px] place-items-center p-8"><p className="font-label text-sm font-bold uppercase tracking-widest text-muted">loading live analytics…</p></div>
          : activeAccounts.length === 0 ? <div className="grid min-h-[360px] place-items-center p-8 text-center"><div className="max-w-lg"><p className="font-editorial text-3xl italic">The dashboard is ready for its first signal.</p><p className="mt-4 font-body text-secondary">{canManage ? "Connect any platform above. Once OAuth returns, the totals, trend line, and strongest posts will populate here automatically." : "An administrator can connect platforms for this workspace. Analytics will appear here when data is available."}</p></div></div>
          : dashboard ? <div>
            {selectedAccount?.analyticsNote && <div className="border-b-2 border-foreground bg-attention/10 px-5 py-4 font-body text-sm leading-relaxed sm:px-6"><strong className="font-label">Platform coverage:</strong> {selectedAccount.analyticsNote}</div>}
            {!hasPerformance && <div className="border-b-2 border-foreground bg-information/10 px-5 py-4 font-body text-sm leading-relaxed sm:px-6">
              {selectedAccount?.analyticsSyncStatus === "never_synced" ? <><strong className="font-label">Analytics sync is pending.</strong> Zernio has not completed its first analytics sync yet. Refresh after synchronization.</>
                : hasReportedPerformance ? <><strong className="font-label">No activity reported in this range.</strong> Available metrics are zero; missing metrics remain unavailable. Try a wider date range.</>
                : <><strong className="font-label">Performance data is unavailable.</strong> Zernio returned no metrics for these dates. Try a wider date range or check the connection’s analytics access.</>}
            </div>}
            <div className={beta ? "grid sm:grid-cols-2" : "grid sm:grid-cols-2 lg:grid-cols-4"}>
              {metricCards.map((metric) => <article key={metric.label} className="min-w-0 border-b-2 border-foreground p-5">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{metric.label}</p>
                <p className={`mt-3 break-words font-display font-extrabold tracking-tight ${beta ? "text-2xl xl:text-3xl" : "text-4xl"}`}>{metric.value}</p>
                <p className="mt-2 text-sm text-secondary">{metric.note}</p>
              </article>)}
            </div>
            <div className={beta ? "grid min-w-0" : "grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"}>
              <article className="min-w-0 border-b-2 border-foreground p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="font-display text-2xl font-bold lowercase">daily distribution</h3><p className="font-label text-[10px] uppercase tracking-wide text-muted">impressions</p></div>
                <div className="mt-8 flex h-56 items-end gap-px overflow-x-auto border-b-2 border-foreground" aria-label="Daily performance chart">
                  {dashboard.daily.length ? dashboard.daily.map((day) => {
                    const value = day.impressions;
                    return <div key={day.date} className="group relative flex h-full min-w-[4px] flex-1 items-end" title={`${day.date}: ${value === null ? "Unavailable" : value.toLocaleString()} impressions`}>
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
                    <div className="flex gap-3">{post.thumbnailUrl && <Image src={post.thumbnailUrl} alt="" width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded object-cover" unoptimized />}
                      <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="font-label text-[10px] font-bold uppercase tracking-wide text-information">{post.platform === "twitter" ? "X" : post.platform}</span><span className="font-label text-[10px] text-muted">{compact(post.metrics.impressions)} impressions</span></div>
                        <p className="mt-2 line-clamp-3 text-sm font-medium leading-relaxed">{post.text ?? postFallback(post.platform, post.publishedAt)}</p>
                        {post.postUrl && <a href={post.postUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-label text-[10px] font-bold uppercase tracking-wide underline underline-offset-4">open post ↗</a>}
                      </div>
                    </div>
                  </div>) : <p className="py-6 text-sm leading-relaxed text-muted">No post-level analytics returned yet. Zernio may need the analytics add-on or a completed first data sync.</p>}
                </div>
              </article>
            </div>
          </div> : <div className="grid min-h-[360px] place-items-center p-8 text-center"><p className="max-w-lg font-body text-secondary">Connected accounts were found, but the analytics summary is unavailable. Check the notice above for the provider response.</p></div>}
      </section>
      {beta && <aside className="w-full min-w-0" aria-label="Social analytics chat"><SocialAnalyticsChat scope={scope} /></aside>}
      </div>
    </main>
  </div>;
}
