import { RESEARCH_CHANNEL_LABELS, RESEARCH_CHANNELS, type ResearchChannel, type ResearchCoverage } from "@/lib/research";

/** Local marks keep source identity visible without contacting a tracking image host. */
export function ResearchSourceBadge({ platform, label }: { platform: ResearchChannel; label?: string }) {
  return <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
    <svg aria-label={RESEARCH_CHANNEL_LABELS[platform]} role="img" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7">
      {platform === "web" && <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>}
      {platform === "linkedin" && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7m4 0v-7m0 3c0-4 6-4 6 0v4" /><circle cx="7" cy="7" r=".6" /></>}
      {platform === "youtube" && <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /></>}
      {platform === "instagram" && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r=".7" /></>}
      {platform === "reddit" && <><ellipse cx="12" cy="14" rx="9" ry="6" /><path d="m12 8 2-5 5 1M8 16q4 3 8 0" /><circle cx="8" cy="12" r=".6" /><circle cx="16" cy="12" r=".6" /><circle cx="20" cy="4" r="1.5" /></>}
      {platform === "x" && <path d="M4 3h5l11 18h-5L4 3Zm16 0-7 9M4 21l7-9" />}
    </svg>
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label ?? RESEARCH_CHANNEL_LABELS[platform]}</span>
  </span>;
}

const coverageLabels: Record<ResearchCoverage["status"], string> = {
  pending: "Pending", searching: "Searching", found: "Found", no_results: "No results",
  unavailable: "Unavailable", failed: "Search failed", budget_limited: "Budget limited",
};

export function ResearchCoverageSummary({ coverage }: { coverage?: ResearchCoverage[] }) {
  return <section aria-label="Source channel coverage" className="min-w-0 space-y-2">
    <h3 className="font-bold">Source coverage</h3>
    <ul className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
      {RESEARCH_CHANNELS.map(channel => {
        const receipt = coverage?.find(item => item.channel === channel);
        return <li key={channel} className="min-w-0 border border-foreground/20 bg-surface-raised p-3 text-sm">
          <ResearchSourceBadge platform={channel} />
          <p className="mt-1">{receipt ? coverageLabels[receipt.status] : "Not recorded"}</p>
          {receipt && <><p className="text-xs text-secondary">{receipt.sourceCount} retained {receipt.sourceCount === 1 ? "source" : "sources"}</p><p className="text-xs text-secondary">{receipt.method === "web_search" ? "Web search" : "Dedicated tool"}</p></>}
        </li>;
      })}
    </ul>
  </section>;
}
