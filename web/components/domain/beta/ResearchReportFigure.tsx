"use client";

import { useRef, useState } from "react";
import { figureDataUrl, renderFigure, FIGURE_REASONS, figureAccessibleText, type FigureSlot } from "@/lib/research-figures";
import type { ResearchSource } from "@/lib/research";

export function ResearchReportFigure({ slot, sources, sourcePrefix, running = false }: { slot: FigureSlot; sources: ResearchSource[]; sourcePrefix: string; running?: boolean }) {
  const [broken, setBroken] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const figure = slot.figure;
  if (slot.status !== "ready" || !figure || broken) return <aside role="status" className="my-5 space-y-2 rounded-control border border-foreground/25 bg-surface-subtle p-4">
    <p className="font-bold">{slot.goal}</p><p className="text-sm">{broken ? "The figure could not be displayed. Reload the page or retry the Word download." : slot.status === "planned" || slot.status === "generating" ? (running ? "Preparing this visual…" : "This visual was not completed before generation stopped.") : FIGURE_REASONS[slot.reason ?? "invalid_output"]}</p>
  </aside>;
  const rendered = renderFigure(figure);
  return <figure id={slot.id} className="my-6 min-w-0 space-y-3 rounded-control border border-foreground/20 bg-surface-raised p-3 sm:p-5">
    <div className="max-w-full">
      {/* All SVG drawing primitives and embedded raster bytes are validated locally. No remote image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={figureDataUrl(figure)} alt={figure.title} width={rendered.width} height={rendered.height} onError={() => setBroken(true)} className="h-auto w-full" />
    </div>
    <button type="button" onClick={() => dialog.current?.showModal()} className="rounded-control border border-foreground/30 px-4 py-2 text-sm font-bold">Enlarge visual</button>
    <dialog ref={dialog} aria-label={figure.title} className="m-auto w-[96vw] max-w-[1200px] rounded-control border border-foreground/30 bg-surface-raised p-4 backdrop:bg-black/50">
      <div className="mb-3 flex items-start justify-between gap-4"><h2 className="font-bold">{figure.title}</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} className="shrink-0 rounded-control border border-foreground/30 px-3 py-2">Close visual</button></div>
      <div role="region" aria-label="Full-size visual — scroll to explore" tabIndex={0} className="max-h-[75vh] overflow-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={figureDataUrl(figure)} alt={figure.title} width={rendered.width} height={rendered.height} style={{ width: rendered.width, maxWidth: "none" }} />
      </div>
    </dialog>
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
