import type { Metadata } from "next";
import { Suspense } from "react";
import { BetaSocialAnalyticsWorkspace } from "@/components/domain/social/SocialAnalyticsWorkspace";

export const metadata: Metadata = {
  title: "social media analytics · wtf os beta",
};

export default function BetaSocialAnalyticsPage() {
  // The shared Beta gate enforces admission and analytics:read. The backend
  // owns integration availability; a missing frontend flag must not hide the page.
  return <Suspense fallback={<div className="grid min-h-[70vh] place-items-center font-label text-sm font-bold uppercase tracking-widest text-muted">opening social analytics…</div>}>
    <BetaSocialAnalyticsWorkspace />
  </Suspense>;
}
