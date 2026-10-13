"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RESEARCH_SECTIONS, safeResearchUrl, type ResearchBrief, type ResearchSource } from "@/lib/research";

export function ResearchMarkdown({ content, sources, sourcePrefix = "research-source-" }: { content: string; sources: ResearchSource[]; sourcePrefix?: string }) {
  // Only identifiers present in the receipt become citations.
  const cited = content.replace(/\[([A-Za-z0-9_-]{1,100})\](?!\()/gu, (match, id: string) =>
    sources.some(source => source.id === id) ? `[${id}](#${sourcePrefix}${encodeURIComponent(id)})` : match);
  return <div className="prose-chat min-w-0 break-words"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ href, children }) => {
      const citation = sources.find(source => href === `#${sourcePrefix}${encodeURIComponent(source.id)}`);
      const safe = href ? safeResearchUrl(href) : null;
      return citation ? <a href={href} className="underline">{children}</a>
        : safe ? <a href={safe} target="_blank" rel="noopener noreferrer" className="underline">{children}</a> : <span>{children}</span>;
    },
    img: ({ alt }) => <span>{alt}</span>,
  }}>{cited}</ReactMarkdown></div>;
}

export function ResearchSources({ sources, sourcePrefix = "research-source-" }: { sources: ResearchSource[]; sourcePrefix?: string }) {
  return <section aria-label="Research sources" className="space-y-3">
    <h3 className="font-heading text-xl font-bold">Sources · {sources.length}</h3>
    {!sources.length && <p className="text-sm text-secondary">No source evidence has been returned yet.</p>}
    <ol className="grid gap-3 md:grid-cols-2">{sources.map(source => {
      const url = safeResearchUrl(source.url);
      return <li id={`${sourcePrefix}${encodeURIComponent(source.id)}`} key={source.id} className="min-w-0 scroll-mt-24 border-2 border-foreground bg-surface-raised p-4">
        <p className="break-all font-label text-xs">[{source.id}]</p>
        <h4 className="mt-1 break-words font-bold">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{source.title}</a> : source.title}</h4>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{source.excerpt || (source.kind === "alpha_reference" ? "Episode reference, transcript excerpt unavailable." : "Supporting excerpt unavailable.")}</p>
        <p className="mt-2 break-words text-xs text-secondary">{source.publisher && `${source.publisher} · `}{source.publishedAt && `Published ${source.publishedAt} · `}Retrieved {source.retrievedAt}</p>
        {typeof source.timestampSeconds === "number" && Number.isFinite(source.timestampSeconds) && source.timestampSeconds >= 0 && <p className="mt-1 text-xs">Source timestamp: {Math.floor(source.timestampSeconds / 60)}:{String(Math.floor(source.timestampSeconds % 60)).padStart(2, "0")}</p>}
      </li>;
    })}</ol>
  </section>;
}

export function ResearchContent({ brief }: { brief: ResearchBrief }) {
  const sourcePrefix = `research-version-${brief.revision}-source-`;
  return <div className="space-y-5">
    {RESEARCH_SECTIONS.map(({ key, title, description }) => {
      const section = brief.sections.find(s => s.key === key);
      return <section key={key} className="min-w-0 space-y-3 border-2 border-foreground bg-surface-raised p-4 sm:p-5">
        <div><p className="font-label text-xs uppercase text-secondary">{description}</p><h3 className="font-heading text-2xl font-bold">{title}</h3><p className="text-sm">{section?.status ?? "Not started"}</p></div>
        {section?.content ? <ResearchMarkdown content={section.content} sources={brief.sources} sourcePrefix={sourcePrefix} /> : <p className="text-sm text-secondary">No findings yet.</p>}
      </section>;
    })}
    <ResearchSources sources={brief.sources} sourcePrefix={sourcePrefix} />
  </div>;
}
