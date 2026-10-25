"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { safeIpColor, type ProductionSourceRow, type ProductionSourceSheet } from "@/lib/ops/production-data";

const pageSize = 25;

function sourceFillColor(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const fill = JSON.parse(raw) as { foreground?: { type?: string; rgb?: string } };
    const rgb = fill.foreground?.type === "rgb" ? fill.foreground.rgb : null;
    return rgb && /^[0-9a-fA-F]{8}$/u.test(rgb) ? `#${rgb.slice(2)}` : null;
  } catch { return null; }
}

function sourceCellValue(sheet: string, ref: string, value: ProductionSourceRow["cells"][number]["value"]) {
  if (sheet === "Production Tracker Podcast" && /^[HIJ]\d+$/u.test(ref) && (value === true || value === false || value === "True" || value === "False")) {
    return value === true || value === "True" ? "☑ Checked" : "☐ Unchecked";
  }
  return value == null ? "(blank)" : String(value);
}

export function ProductionSourceView({ sheets, summary }: {
  sheets: readonly ProductionSourceSheet[];
  summary: { sheets: number; cells: number; review: number } | null;
}) {
  const [sheet, setSheet] = useState(sheets[0]?.name ?? "");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<ProductionSourceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sheet) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const url = new URL("/ops/api/production", window.location.origin);
    url.searchParams.set("sourceSheet", sheet);
    url.searchParams.set("offset", String(offset));
    void fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? "Source workbook access is restricted." : "Source workbook could not be loaded.");
        const body = await response.json() as { sourceRows?: ProductionSourceRow[]; total?: number };
        if (!Array.isArray(body.sourceRows) || typeof body.total !== "number") throw new Error("Source workbook response is incomplete.");
        setRows(body.sourceRows);
        setTotal(body.total);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setError(cause instanceof Error ? cause.message : "Source workbook could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sheet, offset]);

  if (!sheets.length) return <section className="border-2 border-foreground bg-canvas p-5 font-body text-sm">No workbook import is available yet.</section>;

  return (
    <section aria-label="Source workbook" className="border-2 border-foreground bg-canvas">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground bg-surface-raised p-4">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">Restricted source view</p>
          <h2 className="font-heading text-2xl">Workbook rows</h2>
          <p className="mt-1 font-body text-sm text-secondary">Original cells stay unchanged here. Past dated shoot, post, and dubbed-live marks are actuals in the tracker; ambiguous values remain source-only.</p>
          {sheet === "Production Tracker Podcast" && <p className="mt-1 font-body text-xs text-secondary">Unnamed rows 17–19 are omitted from the working view as requested. The private import retains the original workbook cells.</p>}
        </div>
        <label className="grid min-w-56 gap-1 font-label text-xs font-bold" htmlFor="source-sheet">Sheet
          <select id="source-sheet" value={sheet} onChange={(event) => { setSheet(event.target.value); setOffset(0); }} className="min-h-11 border-2 border-foreground bg-canvas px-2 font-body text-sm">
            {sheets.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
          </select>
        </label>
      </div>
      <div className="border-b border-foreground/30 px-4 py-2 font-label text-xs text-secondary">
        {summary ? `${summary.sheets} sheets · ${summary.cells} preserved cells (including formatted blanks) · ${summary.review} import review issues` : "Import summary unavailable"}
      </div>
      {error && <p role="alert" className="m-4 border-l-4 border-editorial bg-surface-subtle p-3 font-body text-sm">{error}</p>}
      {loading ? <p className="p-5 font-body text-sm">Loading source rows…</p> : rows.length ? (
        <div className="divide-y divide-foreground/20">
          {rows.map((row) => <article key={`${row.sheet}:${row.rowNumber}`} className="grid gap-2 p-3 sm:grid-cols-[5rem_1fr]"><h3 className="font-label text-sm font-bold">Row {row.rowNumber}</h3><div className="flex flex-wrap gap-1.5">{row.cells.map((cell) => { const fill = sourceFillColor(cell.fill); return <div key={cell.ref} className="max-w-full border border-foreground/30 bg-surface-raised px-2 py-1 font-label text-xs" title={cell.formula ? `Formula: ${cell.formula}` : undefined}><span className="font-bold text-secondary">{cell.ref}</span><span className="mx-1">·</span><span className="whitespace-pre-wrap break-all">{cell.formula ? cell.cachedValue ?? "(formula; no cached value)" : sourceCellValue(row.sheet, cell.ref, cell.value)}</span>{fill && <span aria-label={`Source fill ${fill}`} title={`Source fill ${fill}`} className="ml-1 inline-block h-2.5 w-2.5 border border-foreground/40 align-middle" style={{ backgroundColor: safeIpColor(fill) }} />}</div>; })}</div></article>)}
        </div>
      ) : !error && <p className="p-5 font-body text-sm text-secondary">No populated rows on this page.</p>}
      <div className="flex items-center justify-between border-t-2 border-foreground px-4 py-3">
        <Button type="button" variant="ghost" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous rows</Button>
        <span className="font-label text-xs text-secondary">{total ? `${offset + 1}–${Math.min(total, offset + pageSize)} of ${total}` : "0 rows"}</span>
        <Button type="button" variant="ghost" disabled={loading || offset + pageSize >= total} onClick={() => setOffset(offset + pageSize)}>Next rows</Button>
      </div>
    </section>
  );
}
