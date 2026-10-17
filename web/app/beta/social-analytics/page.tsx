import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SocialAnalyticsWorkspace } from "@/components/domain/social/SocialAnalyticsWorkspace";
import { hostnameFromHostHeader, localHostnameAllowed } from "@/lib/social-analytics/contracts";

export const metadata: Metadata = {
  title: "social media analytics · wtf os beta",
};

export default async function BetaSocialAnalyticsPage() {
  const requestHeaders = await headers();
  if (process.env.SOCIAL_ANALYTICS_LOCAL_ENABLED !== "1" || !localHostnameAllowed(hostnameFromHostHeader(requestHeaders.get("host")))) notFound();
  return <Suspense fallback={<div className="grid min-h-[70vh] place-items-center font-label text-sm font-bold uppercase tracking-widest text-muted">opening social analytics…</div>}>
    <SocialAnalyticsWorkspace />
  </Suspense>;
}
