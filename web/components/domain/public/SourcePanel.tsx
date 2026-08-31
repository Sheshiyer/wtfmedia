/**
 * Public source citations for Ask WTF.
 *
 * Published citations can deep-link to a YouTube source when the citation
 * carries public video identity. Uncut citations remain evidence-only unless a
 * trusted Worker projection supplies a signed asset link.
 */

"use client";

import { useId } from "react";
import Link from "next/link";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";
import { getSourcePanelPresentation } from "@/lib/provenance/source-panel-presentation";

export type SourceCitation = PublicSourceCitation;

export interface SourcePanelProps {
  sources: SourceCitation[];
  uncutUnavailable?: boolean;
}

export function SourcePanel({ sources, uncutUnavailable = false }: SourcePanelProps) {
  const citationPlaybackTitleId = useId();
  const citationStatusId = useId();

  if (!sources || sources.length === 0) return null;
  const presentation = getSourcePanelPresentation(sources, { uncutUnavailable });

  return (
    <details
      className="scroll-mt-20 rounded-control border-2 border-foreground bg-canvas p-3 text-xs text-secondary shadow-[4px_4px_0_var(--wtf-foreground)]"
      data-testid="source-panel"
      onToggle={(event) => {
        const panel = event.currentTarget;
        if (!panel.open) return;
        requestAnimationFrame(() => {
          const composer = document.querySelector<HTMLElement>('[data-testid="ask-composer"]');
          if (!composer || panel.getBoundingClientRect().bottom <= composer.getBoundingClientRect().top - 8) {
            return;
          }
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          panel.scrollIntoView({
            block: "start",
            behavior: reducedMotion ? "auto" : "smooth",
          });
        });
      }}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 font-label font-bold lowercase text-foreground transition-colors hover:text-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-attention">●</span>
          {sources.length} source{sources.length !== 1 ? "s" : ""} cited
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-secondary">
          view sources
        </span>
      </summary>

      <div className="mt-3 space-y-3 border-t-2 border-foreground pt-3">
        <section
          aria-labelledby={citationPlaybackTitleId}
          className="rounded-control border-2 border-foreground bg-surface-raised p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p id={citationPlaybackTitleId} className="font-label text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
                sources
              </p>
              <p id={citationStatusId} className="mt-0.5 text-[11px] text-muted">
                {presentation.status}
              </p>
            </div>
            {presentation.modes.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-describedby={citationStatusId}>
                {presentation.modes.map((mode) => (
                  <span
                    key={mode}
                    className="rounded border border-foreground/20 bg-surface-subtle px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground"
                  >
                    {mode}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <ul className="space-y-2.5 pl-1">
          {presentation.citations.map((citation, index) => {
            return (
              <li
                key={`${citation.key}-${index}`}
                className="space-y-1.5 rounded border border-foreground/10 bg-canvas/40 p-2 transition-colors hover:bg-canvas/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-attention">[{index + 1}]</span>
                    {citation.episodeHref ? (
                      <Link
                        href={citation.episodeHref}
                        className="truncate font-medium text-foreground underline decoration-foreground/30 hover:decoration-foreground"
                      >
                        {citation.label}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-foreground">{citation.label}</span>
                    )}
                  </div>
                  <span className="rounded border border-foreground/15 bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-secondary">
                    {citation.mode}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-secondary">
                  <span className="rounded border border-attention/40 bg-attention/20 px-1.5 py-0.5 font-mono font-bold text-foreground">
                    {citation.timestampLabel}
                  </span>
                  {citation.href && citation.linkLabel ? (
                    <a
                      href={citation.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-surface-structure px-2 py-0.5 text-[10px] text-on-structure hover:opacity-90"
                    >
                      {citation.linkLabel}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
