"use client";

import type { OperatorSettingsRole } from "@/lib/ops/integration-contract";

const gaps = [
  ["Impressions + CTR", "YouTube Reporting API reach job"],
  ["Retention", "YouTube Analytics per-video retention route"],
  ["Unsubscribed audience", "subscribedStatus activity segments"],
  ["STV + conversion", "versioned server derivations"],
  ["Week / trailing comparisons", "equal-length stored-period comparisons"],
  ["Episode comparison", "matched first-1/7/28-day API route"],
  ["Tiers + patterns", "guarded catalogue derivations"],
  ["Expected performance", "previous-28-day weighted baselines"],
  ["Recommendations", "deterministic evidence rules"],
] as const;

export function YouTubeAnalyticsWorkspace({ role }: { role: OperatorSettingsRole }) {
  const canManage = role === "admin" || role === "super_admin";
  const source = `/analytics-demo/index.html?mode=production&manage=${canManage ? "1" : "0"}`;

  return <section className="min-w-0" data-youtube-analytics-workspace>
    <div className="overflow-hidden border-2 border-foreground bg-[#fbf5e9]">
      <iframe
        className="block h-[calc(100vh-7rem)] min-h-[920px] w-full"
        src={source}
        title="WTFOS YouTube analytics production workspace"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
      />
    </div>

    <details className="mt-4 border-2 border-foreground bg-surface-raised">
      <summary className="cursor-pointer px-5 py-4 font-label text-xs font-bold uppercase tracking-[0.1em]">production mapping contract</summary>
      <div className="overflow-x-auto border-t-2 border-foreground">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead><tr className="bg-surface-subtle"><th className="border-b-2 border-foreground px-4 py-3 font-label uppercase">workspace signal</th><th className="border-b-2 border-foreground px-4 py-3 font-label uppercase">production source</th></tr></thead>
          <tbody>{gaps.map(([requirement, sourceLabel]) => <tr key={requirement}><th className="border-b border-foreground/20 px-4 py-3 font-semibold">{requirement}</th><td className="border-b border-foreground/20 px-4 py-3 text-secondary">{sourceLabel}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
