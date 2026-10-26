"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import type { OperatorSettingsRole } from "@/lib/ops/integration-contract";

export function YouTubeAnalyticsWorkspace({ role }: { role: OperatorSettingsRole | "member" }) {
  const { getToken } = useAuth();
  const observer = useRef<ResizeObserver | null>(null);
  useEffect(() => () => observer.current?.disconnect(), []);
  const canManage = role === "admin" || role === "super_admin";
  const source = `/analytics-demo/index.html?mode=production&embedded=1&manage=${canManage ? "1" : "0"}`;

  return <section className="min-w-0" data-youtube-analytics-workspace>
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
