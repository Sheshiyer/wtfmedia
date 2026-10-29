"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { OperatorSettingsRole } from "@/lib/ops/integration-contract";

type YouTubeConnection = { provider: string; resource: { id: string; name: string | null } | null; status: string };
export function YouTubeAnalyticsWorkspace({ role, channelId = "all" }: { role: OperatorSettingsRole | "member"; channelId?: string }) {
  const { getToken } = useAuth();
  const observer = useRef<ResizeObserver | null>(null);
  const [channels, setChannels] = useState<YouTubeConnection[]>([]);
  const loadChannels = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("/beta/api/analytics/status", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { connections?: YouTubeConnection[] };
      setChannels((result.connections ?? []).filter(item => item.provider === "youtube" && item.resource && item.status !== "revoked").slice(0, 3));
    } catch { /* The embedded workspace shows the connection error. */ }
  }, [getToken]);
  useEffect(() => { void loadChannels(); }, [loadChannels]);
  useEffect(() => () => observer.current?.disconnect(), []);
  const canManage = role === "admin" || role === "super_admin";
  const source = `/analytics-demo/index.html?mode=production&embedded=1&manage=${canManage ? "1" : "0"}&channel=${encodeURIComponent(channelId)}`;

  return <section className="min-w-0" data-youtube-analytics-workspace>
    <nav className="mb-5 flex flex-wrap items-center gap-2 border-2 border-foreground bg-surface-raised p-3" aria-label="YouTube analytics channels">
      <a href="/beta/analytics" aria-current={channelId === "all" ? "page" : undefined} className={`rounded-control border-2 border-foreground px-4 py-2 text-sm font-bold ${channelId === "all" ? "bg-attention" : "bg-canvas"}`}>All channels</a>
      {channels.map(item => <a key={item.resource!.id} href={`/beta/analytics/channels/${encodeURIComponent(item.resource!.id)}`} aria-current={channelId === item.resource!.id ? "page" : undefined} className={`min-w-0 rounded-control border-2 border-foreground px-4 py-2 text-sm font-bold ${channelId === item.resource!.id ? "bg-attention" : "bg-canvas"}`}>{item.resource!.name || item.resource!.id}</a>)}
      <span className="ml-auto font-label text-xs text-muted">{channels.length}/3 connected</span>
    </nav>
    <div className="min-w-0">
      <iframe
        className="block min-h-[920px] w-full border-0"
        onLoad={(event) => {
          observer.current?.disconnect();
          const frame = event.currentTarget;
          const frameWindow = frame.contentWindow as (Window & {
            wtfAuthenticatedFetch?: (path: string, options?: RequestInit) => Promise<Response>;
          }) | null;
          if (frameWindow) {
            frameWindow.wtfAuthenticatedFetch = async (path, options = {}) => {
              const url = new URL(path, window.location.origin);
              if (url.origin !== window.location.origin || !url.pathname.startsWith("/beta/api/analytics/")) {
                throw new Error("Invalid analytics request");
              }
              const send = async (skipCache: boolean) => {
                const token = await getToken({ skipCache });
                if (!token) throw new Error("Please sign in again to connect your channel.");
                const headers = new Headers(options.headers);
                headers.set("authorization", `Bearer ${token}`);
                return fetch(url, { ...options, headers, cache: "no-store", redirect: "error" });
              };
              const response = await send(false);
              return response.status === 401 ? send(true) : response;
            };
            frameWindow.dispatchEvent(new Event("wtf-analytics-auth-ready"));
          }
          const body = frame.contentDocument?.body;
          if (!body) return;
          const resize = () => { frame.style.height = `${Math.ceil(body.getBoundingClientRect().height)}px`; };
          observer.current = new ResizeObserver(resize);
          observer.current.observe(body);
          resize();
        }}
        src={source}
        title="WTFOS YouTube analytics production workspace"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
      />
    </div>

  </section>;
}
