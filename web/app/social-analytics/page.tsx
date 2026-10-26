import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SocialAnalyticsWorkspace } from "@/components/domain/social/SocialAnalyticsWorkspace";
import { hostnameFromHostHeader, localHostnameAllowed } from "@/lib/social-analytics/contracts";

export const metadata: Metadata = {
  title: "social analytics · wtf os local lab",
  description: "A local Zernio-powered social analytics workspace for the WTF team.",
};

export default async function SocialAnalyticsPage() {
  const requestHeaders = await headers();
  const hostname = hostnameFromHostHeader(requestHeaders.get("host"));
  if ((process.env.NODE_ENV === "production" || process.env.SOCIAL_ANALYTICS_LOCAL_ENABLED !== "1") || !localHostnameAllowed(hostname)) notFound();
  return <Suspense fallback={<div className="grid min-h-[70vh] place-items-center bg-canvas font-label text-sm font-bold uppercase tracking-widest text-muted">opening social analytics…</div>}>
    <SocialAnalyticsWorkspace />
  </Suspense>;
}
