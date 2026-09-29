"use client";

import { useState } from "react";
import type { OperatorSettingsRole } from "@/lib/ops/integration-contract";
import { YouTubeAnalyticsSettingsPanel } from "./YouTubeAnalyticsSettingsPanel";

type View = "prototype" | "live" | "assessment";

const button = "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-foreground px-4 py-2 font-label text-xs font-bold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-information";

const gaps = [
  ["Impressions + CTR", "Mapped", "OAuth-backed Reporting API reach job; asynchronous reports retain job/import provenance."],
  ["Retention", "Mapped", "averageViewPercentage supplies the headline; a per-video route stores the elapsed-time retention curve."],
  ["Unsubscribed audience", "Mapped as activity", "subscribedStatus segments views. UI deliberately says unsubscribed views, not unique audience."],
  ["STV + conversion", "Derived v1", "STV = subscribers gained / views; conversion = subscribers gained / unsubscribed views."],
  ["Week / trailing comparisons", "Derived v1", "Equal-length previous-period and previous-28-complete-day baselines are returned with null-safe deltas."],
  ["Episode comparisons + estimates", "Mapped", "Episode rows include CTR/retention deviations, subscribers per million impressions, and labelled estimated clicks."],
  ["Impression tiers + patterns", "Mapped with guards", "Versioned tiers plus content-type groups; groups below three episodes are marked insufficient sample."],
  ["Expected CTR + performance groups", "Derived v1", "Expected CTR is the previous-28-day impression-weighted baseline; groups compare reach and retention."],
  ["Written recommendations", "Evidence rules v1", "Deterministic observation/keep/change/test output cites the exact response fields used."],
] as const;

export function YouTubeAnalyticsWorkspace({ role }: { role: OperatorSettingsRole }) {
  const [view, setView] = useState<View>("live");

  return <section className="min-w-0" data-youtube-analytics-workspace>
    <div className="border-2 border-foreground bg-surface-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">production data contract</p>
          <h2 className="mt-1 font-heading text-2xl font-bold lowercase">youtube decision analytics</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">The live view maps OAuth-backed Google observations and versioned derived metrics. The imported prototype remains available only as a visual reference.</p>
        </div>
        <span className="rounded-control border-2 border-attention bg-attention/10 px-3 py-1 font-label text-[10px] font-bold uppercase">local code · OAuth data required</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Analytics workspace view">
        {([
          ["live", "production analytics"],
          ["prototype", "demo reference"],
          ["assessment", "mapping contract"],
        ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} className={`${button} ${view === id ? "bg-foreground text-canvas" : "bg-canvas text-foreground"}`} onClick={() => setView(id)}>{label}</button>)}
      </div>
    </div>

    {view === "prototype" ? <div className="mt-4 overflow-hidden border-2 border-foreground bg-[#fbf5e9]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground bg-attention/10 px-4 py-3 text-xs">
        <p><strong>Imported from WTFOS_Youtube_Analytics_demo.</strong> All displayed metric values are example responses.</p>
        <a className="font-label font-bold underline" href="/analytics-demo/index.html" target="_blank" rel="noreferrer">open full screen ↗</a>
      </div>
      <iframe className="block h-[82vh] min-h-[760px] w-full" src="/analytics-demo/index.html" title="Imported WTFOS YouTube Analytics prototype" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" />
    </div> : null}

    {view === "live" ? <div className="mt-4"><YouTubeAnalyticsSettingsPanel role={role} /></div> : null}

    {view === "assessment" ? <div className="mt-4 overflow-hidden border-2 border-foreground bg-surface-raised">
      <div className="border-b-2 border-foreground p-5">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-muted">implementation boundary</p>
        <h3 className="mt-1 font-heading text-2xl font-bold lowercase">fixture-to-production mapping</h3>
        <p className="mt-2 max-w-3xl text-sm text-secondary">Mapped means a route and evidence contract exist. A value remains unavailable until OAuth, migration, resource selection, and synchronization have completed.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead><tr className="bg-surface-subtle"><th className="border-b-2 border-foreground px-4 py-3 font-label uppercase">requirement</th><th className="border-b-2 border-foreground px-4 py-3 font-label uppercase">current state</th><th className="border-b-2 border-foreground px-4 py-3 font-label uppercase">production work</th></tr></thead>
          <tbody>{gaps.map(([requirement, state, work]) => <tr key={requirement}><th className="border-b border-foreground/20 px-4 py-3 font-semibold">{requirement}</th><td className="border-b border-foreground/20 px-4 py-3 whitespace-nowrap">{state}</td><td className="border-b border-foreground/20 px-4 py-3 text-secondary">{work}</td></tr>)}</tbody>
        </table>
      </div>
    </div> : null}
  </section>;
}
