import { useId } from "react";
import { RESEARCH_CHANNEL_LABELS, RESEARCH_CHANNELS, RESEARCH_EVIDENCE_LABELS, researchSourcePlatform, safeResearchUrl, type ResearchChannel, type ResearchCoverage, type ResearchSource } from "@/lib/research";

/** Local marks keep source identity visible without contacting a tracking image host. */
export function ResearchSourceBadge({ platform, label }: { platform: ResearchChannel; label?: string }) {
  const gradientId = useId();
  return <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
    <svg aria-label={RESEARCH_CHANNEL_LABELS[platform]} role="img" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="white" strokeWidth="1.7">
      {platform === "web" && <g stroke="#2563eb"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></g>}
      {platform === "linkedin" && <><rect x="1" y="1" width="22" height="22" rx="3" fill="#0A66C2" stroke="none" /><path d="M7 10v7m4 0v-7m0 3c0-4 6-4 6 0v4" /><circle cx="7" cy="7" r=".6" fill="white" /></>}
      {platform === "youtube" && <><rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000" stroke="none" /><path d="m10 8 6 4-6 4z" fill="white" stroke="none" /></>}
      {platform === "instagram" && <><defs><linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".65" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" /></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6" fill={`url(#${gradientId})`} stroke="none" /><rect x="5" y="5" width="14" height="14" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17" cy="7" r=".7" fill="white" stroke="none" /></>}
      {platform === "reddit" && <><circle cx="12" cy="12" r="12" fill="#FF4500" stroke="none" /><path d="m12 9 2-5 4 1" /><circle cx="19" cy="5" r="1.5" fill="white" /><ellipse cx="12" cy="14" rx="8" ry="5" fill="white" stroke="none" /><g stroke="#FF4500"><path d="M8 16q4 3 8 0" /><circle cx="8.5" cy="12.5" r=".7" /><circle cx="15.5" cy="12.5" r=".7" /></g></>}
      {platform === "x" && <><rect width="24" height="24" rx="4" fill="#000000" stroke="none" /><path d="M5 4h4l10 16h-4L5 4Zm14 0-6 8M5 20l6-8" strokeWidth="1.3" /></>}
    </svg>
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label ?? RESEARCH_CHANNEL_LABELS[platform]}</span>
  </span>;
}

const coverageLabels: Record<ResearchCoverage["status"], string> = {
  pending: "Pending", searching: "Searching", found: "Found", no_results: "No results",
  unavailable: "Unavailable", failed: "Search failed", budget_limited: "Budget limited",
};

export function ResearchSourceExcerpt({ source }: { source: ResearchSource }) {
  const url = safeResearchUrl(source.url);
  return <div className="space-y-2 break-words [overflow-wrap:anywhere]">
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm underline">Open original source ↗</a>}
    <p className="whitespace-pre-wrap text-sm">{source.excerpt || (source.kind === "alpha_reference" ? "Episode reference, transcript excerpt unavailable." : "Supporting excerpt unavailable.")}</p>
    <p className="text-xs text-secondary">{source.publisher && `${source.publisher} · `}{source.publishedAt && `Published ${source.publishedAt} · `}Retrieved {source.retrievedAt}</p>
    <p className="text-xs text-secondary">{source.evidenceType ? RESEARCH_EVIDENCE_LABELS[source.evidenceType] : "Evidence type not recorded"}{source.retrievedVia ? ` · Retrieved via ${source.retrievedVia}` : ""}</p>
    {typeof source.timestampSeconds === "number" && Number.isFinite(source.timestampSeconds) && source.timestampSeconds >= 0 && <p className="text-xs">Source timestamp: {Math.floor(source.timestampSeconds / 60)}:{String(Math.floor(source.timestampSeconds % 60)).padStart(2, "0")}</p>}
  </div>;
}

export function ResearchCoverageSummary({ coverage, sources }: { coverage?: ResearchCoverage[]; sources: ResearchSource[] }) {
  return <section aria-label="Source channel coverage" className="min-w-0 space-y-2">
    <h3 className="font-bold">Source coverage</h3>
    <ul className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {RESEARCH_CHANNELS.map(channel => {
        const receipt = coverage?.find(item => item.channel === channel);
        const retained = sources.filter(source => researchSourcePlatform(source) === channel);
        return <li key={channel} className="min-w-0 border border-foreground/20 bg-surface-raised text-sm has-[details[open]]:col-span-full">
          <details>
            <summary className="cursor-pointer p-3 focus-visible:outline focus-visible:outline-2">
              <ResearchSourceBadge platform={channel} />
              <span className="mt-1 block">{receipt ? receipt.status === "found" && receipt.sourceCount === 0 ? "Results found; none retained" : coverageLabels[receipt.status] : retained.length ? "Found" : "Not recorded"}</span>
              <span className="block text-xs text-secondary">{retained.length} retained {retained.length === 1 ? "source" : "sources"}</span>
              {receipt && <span className="block text-xs text-secondary">{receipt.method === "web_search" ? "Web search" : "Dedicated tool"}</span>}
              <span className="mt-2 block text-xs underline">View sources and excerpts</span>
            </summary>
            <div className="border-t border-foreground/15 p-3">
              {!retained.length && <p>No saved sources or excerpts are available for this channel.</p>}
              {receipt && receipt.sourceCount !== retained.length && <p className="mb-3 text-xs text-secondary">The search recorded {receipt.sourceCount} sources; {retained.length} {retained.length === 1 ? "is" : "are"} available in this saved report.</p>}
              <ul className="space-y-4">{retained.map(source => <li key={source.id} className="min-w-0 space-y-2 border-b border-foreground/15 pb-4 last:border-0 last:pb-0">
                <p className="break-words font-bold [overflow-wrap:anywhere]">{source.title || source.publisher || "Source"}</p>
                <ResearchSourceExcerpt source={source} />
              </li>)}</ul>
            </div>
          </details>
        </li>;
      })}
    </ul>
  </section>;
}
