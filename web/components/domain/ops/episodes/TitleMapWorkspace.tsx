"use client";

import { useMemo, useState } from "react";
import type { TitleMapRow, TitleMapStatus, TitleMapTable, UncutPointer } from "@/lib/catalogue/excel-title-map";

export type { TitleMapTable };

const FAIL_CLOSED = "No episode data is shown.";

export function TitleMapWorkspace({ table }: { table: TitleMapTable | null }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TitleMapStatus>("all");
  const [uncutFilter, setUncutFilter] = useState<"all" | UncutPointer>("all");

  const filteredRows = useMemo(() => {
    const rows = table?.rows ?? [];
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (uncutFilter !== "all" && row.uncutPointer !== uncutFilter) return false;
      if (!query) return true;
      return (
        row.title.toLowerCase().includes(query) ||
        row.internal?.sheet.toLowerCase().includes(query) === true ||
        row.transcript?.sheet.toLowerCase().includes(query) === true ||
        row.internal?.rowHash.toLowerCase().includes(query) === true ||
        row.transcript?.rowHash.toLowerCase().includes(query) === true
      );
    });
  }, [table, searchQuery, statusFilter, uncutFilter]);

  if (!table) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="rounded-panel border-2 border-foreground bg-surface-raised p-5 text-sm leading-relaxed text-secondary"
      >
        the title map is unavailable. {FAIL_CLOSED}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <dl className="grid gap-3 rounded-panel border-2 border-foreground bg-surface-raised p-4 font-label text-sm sm:grid-cols-4">
        <Count label="mapped" value={table.mappedCount} />
        <Count label="quarantined" value={table.quarantinedCount} />
        <Count label="missing source" value={table.missingSourceCount} />
        <Count label="snapshot" value={table.snapshotAt} />
      </dl>

      <p className="max-w-[65ch] font-body text-sm text-secondary">
        this is a title map, not a live catalogue. uncut pointers stay candidate and not activated.
        quarantined titles are listed only so they stay excluded.
      </p>

      <div className="grid gap-3 rounded-panel border-2 border-foreground bg-surface-raised p-4 sm:grid-cols-[1fr_160px_160px] items-end">
        <label className="grid gap-1">
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
            search titles
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="title or sheet"
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground focus-visible:outline-attention"
          />
        </label>
        <label className="grid gap-1">
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
            status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | TitleMapStatus)}
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-2 text-xs font-semibold uppercase text-foreground focus-visible:outline-attention"
          >
            <option value="all">all statuses</option>
            <option value="mapped">mapped</option>
            <option value="quarantined">quarantined</option>
            <option value="missing-source">missing source</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-secondary">
            uncut pointer
          </span>
          <select
            value={uncutFilter}
            onChange={(event) => setUncutFilter(event.target.value as "all" | UncutPointer)}
            className="min-h-10 rounded-control border-2 border-foreground bg-canvas px-2 text-xs font-semibold uppercase text-foreground focus-visible:outline-attention"
          >
            <option value="all">all pointers</option>
            <option value="candidate">candidate</option>
            <option value="absent">absent</option>
          </select>
        </label>
      </div>

      {filteredRows.length === 0 ? (
        <section
          role="status"
          aria-live="polite"
          className="rounded-panel border-2 border-foreground bg-surface-raised p-5 text-sm leading-relaxed text-secondary"
        >
          no mapped rows match these filters. {FAIL_CLOSED}
        </section>
      ) : (
        <div className="overflow-x-auto rounded-panel border-2 border-foreground bg-surface-raised">
          <table className="w-full border-collapse text-left font-body text-xs">
            <thead>
              <tr className="border-b-2 border-foreground bg-surface-subtle font-label text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="p-3">title</th>
                <th className="p-3">status</th>
                <th className="p-3">uncut</th>
                <th className="p-3">internal</th>
                <th className="p-3">transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-foreground/20">
              {filteredRows.map((row) => (
                <TitleMapRowView key={`${row.status}:${row.title}`} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-secondary">{label}</dt>
      <dd className="mt-1 font-bold lowercase text-foreground">{value}</dd>
    </div>
  );
}

function TitleMapRowView({ row }: { row: TitleMapRow }) {
  const excluded = row.status === "quarantined";
  return (
    <tr className={excluded ? "bg-surface-subtle/60" : "hover:bg-canvas/50"}>
      <td className="p-3 font-body text-xs font-bold text-foreground">{row.title}</td>
      <td className="p-3">
        <span className="rounded border border-foreground/30 bg-canvas px-2 py-0.5 font-label text-[10px] font-bold uppercase">
          {row.status}
        </span>
      </td>
      <td className="p-3 lowercase text-secondary">
        {row.uncutPointer} · {row.uncutActivation}
      </td>
      <td className="p-3 font-mono text-[10px] text-secondary">
        {row.internal ? `${row.internal.sheet} · ${row.internal.sourceRow}` : "—"}
      </td>
      <td className="p-3 font-mono text-[10px] text-secondary">
        {row.transcript ? `${row.transcript.sheet} · ${row.transcript.sourceRow}` : "—"}
      </td>
    </tr>
  );
}
