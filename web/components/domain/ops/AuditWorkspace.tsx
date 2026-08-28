"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { dayBoundsToIso } from "@/lib/ops/production";
import { AuditExportDialog } from "./AuditExportDialog";
import { AuditLedger, type AuditLedgerRow } from "./AuditLedger";

const endpoint = "/api/ops/audit";
const actions = [
  "",
  "auth_allowed",
  "auth_denied",
  "protected_view",
  "operator_invite",
  "operator_role_change",
  "operator_deactivate",
  "super_admin_handoff",
  "audit_export",
];
const outcomes = ["", "allowed", "denied", "succeeded", "failed"];
const roles = ["", "super_admin", "admin", "editor"];
const environments = ["", "local", "staging", "production"];
const filterOptions: ReadonlyArray<
  readonly ["action" | "outcome" | "role" | "environment", readonly string[]]
> = [
  ["action", actions],
  ["outcome", outcomes],
  ["role", roles],
  ["environment", environments],
];
const field =
  "min-h-11 rounded-control border-2 border-foreground bg-canvas px-3 font-body text-body";
const secondary =
  "min-h-11 self-end rounded-control border-2 border-foreground bg-canvas px-4 py-3 font-label text-sm font-bold";

function validRows(value: unknown): value is { records: AuditLedgerRow[] } {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { records?: unknown }).records) &&
    (value as { records: unknown[] }).records.every(
      (row) =>
        !!row &&
        typeof row === "object" &&
        [
          "timestamp",
          "subject",
          "role",
          "action",
          "entityType",
          "entityId",
          "outcome",
          "environment",
          "correlationId",
        ].every((key) => typeof (row as Record<string, unknown>)[key] === "string"),
    )
  );
}

export function AuditWorkspace() {
  const [filters, setFilters] = useState({
    action: "",
    outcome: "",
    role: "",
    environment: "",
    after: "",
    before: "",
  });
  const [range, setRange] = useState({ after: "", before: "" });
  const [rows, setRows] = useState<AuditLedgerRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "measured-zero">("loading");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [filters]);

  const setBound = (edge: "after" | "before", value: string) => {
    setRange((current) => ({ ...current, [edge]: value }));
    setFilters((current) => ({
      ...current,
      [edge]: value ? dayBoundsToIso(value, edge === "after" ? "start" : "end") : "",
    }));
  };

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`${endpoint}${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok || !validRows(data)) throw new Error("audit_unavailable");
      setRows(data.records);
      setState(data.records.length ? "ready" : "measured-zero");
    } catch {
      setRows([]);
      setState("unavailable");
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filterSummary = query || "none";
  const exportRecords = async () => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "export", filters }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("export_unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "wtfmedia-audit-ledger.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("allowlisted audit export prepared.");
      return true;
    } catch {
      setNotice("audit export is unavailable right now. retry or cancel.");
      return false;
    }
  };

  return (
    <>
      <div
        className="flex flex-wrap gap-3 rounded-panel border-2 border-foreground bg-surface-raised p-4"
        aria-label="audit filters"
      >
        {filterOptions.map(([key, values]) => (
          <label key={key} className="grid min-w-[10rem] flex-1 gap-1">
            <span className="font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
              {key}
            </span>
            <select
              value={filters[key]}
              onChange={(event) =>
                setFilters((current) => ({ ...current, [key]: event.target.value }))
              }
              className={field}
            >
              {values.map((value) => (
                <option key={value} value={value}>
                  {value || `all ${key}s`}
                </option>
              ))}
            </select>
          </label>
        ))}
        <DatePicker
          id="audit-after"
          label="after"
          value={range.after}
          onChange={(value) => setBound("after", value)}
        />
        <DatePicker
          id="audit-before"
          label="before"
          value={range.before}
          onChange={(value) => setBound("before", value)}
        />
        <button type="button" onClick={() => void refresh()} className={secondary}>
          refresh records
        </button>
        <button
          type="button"
          onClick={() => setExporting(true)}
          disabled={state === "loading" || state === "unavailable"}
          className={secondary}
        >
          export audit records
        </button>
      </div>
      <div aria-live="polite" className="sr-only">
        {notice}
      </div>
      <AuditLedger rows={rows} state={state} />
      {exporting && (
        <AuditExportDialog
          filters={filterSummary}
          onClose={() => setExporting(false)}
          onConfirm={exportRecords}
        />
      )}
    </>
  );
}
