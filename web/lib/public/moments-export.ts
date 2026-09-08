/**
 * Excel export of an answer's moments — one row per moment, mirroring the
 * editor's "Stitch'd Timestamp" sheet. SheetJS is heavy, so it loads only
 * when the user actually clicks download.
 */

import type { PublicMoment, PublicMomentsPayload } from "@/lib/provenance/public-moment-header";

export interface MomentExportRow {
  Guest: string;
  "Clean Cut": string;
  "Link to EP": string;
  "Name of EP": string;
  Start: string;
  End: string;
  Duration: string;
  Theme: string;
  Topic: string;
  Summary: string;
  "Why Relevant": string;
  "Strength★": number | "";
}

export function formatClock(seconds: number | null): string {
  if (seconds == null) return "";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function momentExportRows(payload: PublicMomentsPayload): MomentExportRow[] {
  return payload.moments
    .filter((moment) => moment.withinBudget)
    .map((moment) => ({
      Guest: moment.guest ?? "",
      "Clean Cut": "",
      "Link to EP": `${moment.url}${moment.url.includes("?") ? "&" : "?"}t=${Math.round(moment.startSec)}`,
      "Name of EP": moment.title,
      Start: formatClock(moment.startSec),
      End: formatClock(moment.endSec),
      Duration: formatClock(moment.durationSec),
      Theme: moment.theme ?? "",
      Topic: moment.topic ?? "",
      Summary: moment.summary ?? "",
      "Why Relevant": moment.whyRelevant ?? "",
      "Strength★": moment.strength ?? "",
    }));
}

export async function downloadMomentsXlsx(payload: PublicMomentsPayload, question: string): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = momentExportRows(payload);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 18 }, { wch: 10 }, { wch: 46 }, { wch: 34 },
    { wch: 8 }, { wch: 8 }, { wch: 9 },
    { wch: 16 }, { wch: 24 }, { wch: 50 }, { wch: 40 }, { wch: 9 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Moments");
  const slug = question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "moments";
  XLSX.writeFile(book, `ask-wtf-${slug}.xlsx`);
}
