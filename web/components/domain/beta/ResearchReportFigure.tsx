"use client";

import { useState } from "react";
import { figureDataUrl, renderFigure, FIGURE_REASONS, figureAccessibleText, type FigureSlot } from "@/lib/research-figures";
import type { ResearchSource } from "@/lib/research";

export function ResearchReportFigure({ slot, sources, sourcePrefix, running = false }: { slot: FigureSlot; sources: ResearchSource[]; sourcePrefix: string; running?: boolean }) {
  const [broken, setBroken] = useState(false);
  const figure = slot.figure;
  if (slot.status !== "ready" || !figure || broken) return <aside role="status" className="my-5 space-y-2 rounded-control border border-foreground/25 bg-surface-subtle p-4">
    <p className="font-bold">{slot.goal}</p><p className="text-sm">{broken ? "The figure could not be displayed. Reload the page or retry the Word download." : slot.status === "planned" || slot.status === "generating" ? (running ? "Preparing this visual…" : "This visual was not completed before generation stopped.") : FIGURE_REASONS[slot.reason ?? "invalid_output"]}</p>
  </aside>;
  const rendered = renderFigure(figure);
  return <figure id={slot.id} className="my-6 min-w-0 space-y-3 rounded-control border border-foreground/20 bg-surface-raised p-3 sm:p-5">
    <div role="region" aria-label={`${figure.title} — scroll to view the full figure`} tabIndex={0} className="max-w-full overflow-x-auto">
      {/* All SVG drawing primitives and embedded raster bytes are validated locally. No remote image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={figureDataUrl(figure)} alt={figure.title} width={rendered.width} height={rendered.height} onError={() => setBroken(true)} className="h-auto w-full min-w-[42rem]" />
    </div>
    <figcaption className="space-y-2 text-sm"><p className="font-bold">{figure.title}</p><p>{figure.takeaway}</p>{figure.caveat && <p className="text-secondary">{figure.caveat}</p>}</figcaption>
    <details className="text-sm"><summary className="cursor-pointer font-bold">Read explanation and sources</summary>
      <p className="mt-3 whitespace-pre-line">{figureAccessibleText(figure)}</p>
      {figure.items.filter(i => i.calculation).map(i => <p key={i.id} className="mt-2">Calculated {i.label}: {i.calculation!.operation} of {i.calculation!.inputs.map(id => figure.items.find(p => p.id === id)?.label).join(", ")}. Inputs are cited below.</p>)}
      <ul className="mt-4 space-y-3">{figure.evidence.map((ref, index) => { const source = sources.find(s => s.id === ref.sourceId); return <li key={index}>
        <p>{ref.quote}</p>{source && <a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher || source.title}</a>}
        {source && <a href={`#${sourcePrefix}${encodeURIComponent(source.id)}`} className="ml-3 underline">Saved source</a>}
      </li>; })}</ul>
      {figure.asset && <p className="mt-3">{figure.asset.attribution} · {figure.asset.license} · <a className="underline" href={figure.asset.sourceUrl} target="_blank" rel="noopener noreferrer">Image source</a></p>}
    </details>
  </figure>;
}
