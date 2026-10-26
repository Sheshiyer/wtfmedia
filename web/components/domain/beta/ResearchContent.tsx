"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prepareResearchSection, researchDisplayContent } from "@/lib/research-report";
import { RESEARCH_SECTIONS, RESEARCH_EVIDENCE_LABELS, replaceResearchCitations, researchFailureSummary, researchSourceLabel, researchSourcePlatform, safeResearchUrl, type ResearchBrief, type ResearchSource } from "@/lib/research";
import { ResearchCoverageSummary, ResearchSourceBadge } from "./ResearchSourceBadge";

export function ResearchMarkdown({ content, sources, sourcePrefix = "research-source-" }: { content: string; sources: ResearchSource[]; sourcePrefix?: string }) {
  // Relabel only legacy boilerplate in this view. Claims, saved prose and source excerpts stay intact.
  const displayContent = researchDisplayContent(content);
  const marker = "**Numeric evidence comparisons**";
  const split = displayContent.indexOf(marker);
  if (split >= 0) return <div className="min-w-0 space-y-5">
    <ResearchMarkdown content={displayContent.slice(0, split)} sources={sources} sourcePrefix={sourcePrefix} />
    <details className="min-w-0 rounded-control border border-foreground/20 p-4"><summary className="cursor-pointer font-bold">Check numeric evidence</summary><div className="mt-4 min-w-0"><ResearchMarkdown content={displayContent.slice(split + marker.length)} sources={sources} sourcePrefix={sourcePrefix} /></div></details>
  </div>;
  const cited = replaceResearchCitations(displayContent, sources, source => `[source](#${sourcePrefix}${encodeURIComponent(source.id)})`);
  return <div className="prose-chat min-w-0 break-words [overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_h2]:mt-6 [&_h3]:mt-5"><ReactMarkdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]} components={{
    table: ({ children }) => <div role="region" aria-label="Research evidence table" tabIndex={0} className="my-4 max-w-full overflow-x-auto"><table className="w-full min-w-[44rem] border-collapse text-left text-sm">{children}</table></div>,
    th: ({ children }) => <th className="min-w-32 border-b border-foreground/30 bg-surface-subtle p-3 align-top font-bold">{children}</th>,
    td: ({ children }) => <td className="min-w-32 border-b border-foreground/15 p-3 align-top">{children}</td>,
    a: ({ href, children }) => {
      const citation = sources.find(source => href === `#${sourcePrefix}${encodeURIComponent(source.id)}`);
      const safe = href ? safeResearchUrl(href) : null;
      return citation ? <a href={href} aria-label={`View source: ${researchSourceLabel(citation)} — ${citation.title}`} title={citation.title} className="inline-block max-w-full rounded-control px-1 align-baseline text-sm underline focus-visible:outline focus-visible:outline-2" onClick={event => {
          event.preventDefault();
          const target = document.getElementById(`${sourcePrefix}${encodeURIComponent(citation.id)}`);
          const sourceDetails = target?.querySelector("details");
          if (sourceDetails) sourceDetails.open = true;
          let parent = target?.parentElement;
          while (parent) {
            if (parent instanceof HTMLDetailsElement) parent.open = true;
            parent = parent.parentElement;
          }
          target?.querySelector("summary")?.focus({ preventScroll: true });
          target?.scrollIntoView({ block: "nearest" });
        }}><ResearchSourceBadge platform={researchSourcePlatform(citation)} label={researchSourceLabel(citation)} /></a>
        : safe ? <a href={safe} target="_blank" rel="noopener noreferrer" className="underline">{children}</a> : <span>{children}</span>;
    },
    img: ({ alt }) => <span>{alt}</span>,
  }}>{cited}</ReactMarkdown></div>;
}

export function ResearchSources({ sources, sourcePrefix = "research-source-" }: { sources: ResearchSource[]; sourcePrefix?: string }) {
  return <details aria-label="Research sources" className="min-w-0 border-2 border-foreground bg-surface-raised p-4">
    <summary className="cursor-pointer font-heading text-xl font-bold">Sources · {sources.length}</summary>
    {!sources.length && <p className="text-sm text-secondary">No source evidence has been returned yet.</p>}
    <ol className="mt-4 grid min-w-0 items-start gap-3">{sources.map(source => {
      const url = safeResearchUrl(source.url);
      return <li id={`${sourcePrefix}${encodeURIComponent(source.id)}`} key={source.id} className="min-w-0 scroll-mt-24 border-2 border-foreground bg-surface-raised p-4">
        <details>
          <summary className="cursor-pointer break-words font-bold [overflow-wrap:anywhere]"><ResearchSourceBadge platform={researchSourcePlatform(source)} label={researchSourceLabel(source)} /><span className="mt-1 block">{source.title}</span></summary>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline">Open original source ↗</a>}
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{source.excerpt || (source.kind === "alpha_reference" ? "Episode reference, transcript excerpt unavailable." : "Supporting excerpt unavailable.")}</p>
        <p className="mt-2 break-words text-xs text-secondary">{source.publisher && `${source.publisher} · `}{source.publishedAt && `Published ${source.publishedAt} · `}Retrieved {source.retrievedAt}</p>
        <p className="mt-2 text-xs text-secondary">{source.evidenceType ? RESEARCH_EVIDENCE_LABELS[source.evidenceType] : "Evidence type not recorded"}{source.retrievedVia ? ` · Retrieved via ${source.retrievedVia}` : ""}</p>
        {typeof source.timestampSeconds === "number" && Number.isFinite(source.timestampSeconds) && source.timestampSeconds >= 0 && <p className="mt-1 text-xs">Source timestamp: {Math.floor(source.timestampSeconds / 60)}:{String(Math.floor(source.timestampSeconds % 60)).padStart(2, "0")}</p>}
        </details>
      </li>;
    })}</ol>
  </details>;
}

export function ResearchContent({ brief, sourcePrefix = `research-version-${brief.revision}-source-` }: { brief: ResearchBrief; sourcePrefix?: string }) {
  if (brief.status === "clarification" && !brief.sections.some(section => section.content.trim()) && !brief.sources.length) return null;
  return <div className="min-w-0 space-y-5">
    {brief.needsResearch && <section role="status" className="space-y-2 border-2 border-foreground bg-attention p-4">
      <h3 className="font-bold">Previous report no longer matches the edited inputs</h3>
      <p className="text-sm">The findings and sources below are retained from the previous scope. Research again to update them. Follow-up is paused until fresh research is available.</p>
    </section>}
    <ResearchCoverageSummary coverage={brief.coverage} />
    {RESEARCH_SECTIONS.filter(({ key }) => brief.sections.some(s => s.key === key && s.status !== "skipped" && s.content.trim())).map(({ key, title, description }) => {
      const section = brief.sections.find(s => s.key === key);
      const { markdown: content, citedSources } = prepareResearchSection(section?.content ?? "", brief.sources);
      const platforms = [...new Set(citedSources.map(researchSourcePlatform))];
      return <section key={key} className="min-w-0 space-y-3 border-2 border-foreground bg-surface-raised p-4 sm:p-5">
        <div><p className="font-label text-xs uppercase text-secondary">{description}</p><h3 className="font-heading text-2xl font-bold">{title}</h3><p className="text-sm">{section?.status ?? "Not started"}</p></div>
        {section?.content ? <ResearchMarkdown content={content} sources={[]} sourcePrefix={sourcePrefix} /> : <p className="text-sm text-secondary">No findings yet.</p>}
        {citedSources.length > 0 && <details aria-label={`${title} sources`} className="min-w-0 border-t border-foreground/15 pt-3">
          <summary className="w-fit max-w-full cursor-pointer rounded-full border border-foreground/20 bg-surface-subtle px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2">
            <span className="inline-flex flex-wrap items-center gap-2 align-middle">
              {platforms.map(platform => <ResearchSourceBadge key={platform} platform={platform} label="" />)}
              <span>{citedSources.length} {citedSources.length === 1 ? "source" : "sources"}</span>
            </span>
          </summary>
          <ResearchMarkdown content={citedSources.map(source => `- [source](#${sourcePrefix}${encodeURIComponent(source.id)})`).join("\n")} sources={citedSources} sourcePrefix={sourcePrefix} />
        </details>}
        {section?.failure && <p className="text-sm text-secondary">{researchFailureSummary(section.failure)}</p>}
      </section>;
    })}
    {brief.sources.length > 0 && <ResearchSources sources={brief.sources} sourcePrefix={sourcePrefix} />}
  </div>;
}
