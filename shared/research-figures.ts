/** Versioned research figures. Shared by Edge admission, reader and Word export. */
export const FIGURE_KINDS = ["flow", "ecosystem", "timeline", "comparison", "bar", "line", "stacked", "metrics", "image"] as const;
export type FigureKind = typeof FIGURE_KINDS[number];
export type FigureEvidence = { sourceId: string; quote: string };
export type FigureItem = { id: string; label: string; detail: string; evidence: number[]; group: string;
  value: number | null; displayValue: string; date: string; cells: string[];
  calculation?: { operation: "ratio" | "percentage" | "difference" | "sum"; inputs: string[] } };
export type ResearchFigure = {
  version: 2; kind: FigureKind; title: string; takeaway: string; caveat: string;
  evidence: FigureEvidence[]; items: FigureItem[];
  edges: { from: string; to: string; label: string; evidence: number[] }[];
  columns: string[]; metric: { unit: string; period: string; geography: string; definition: string };
  asset?: { dataUrl: string; width: number; height: number; originalUrl: string; sourceUrl: string;
    attribution: string; license: string; licenseQuote: string; sourceId: string };
};
export type FigureSlot = { id: string; section: "snacks" | "appetizers" | "main" | "desserts";
  goal: string; preferredKind: FigureKind; status: "planned" | "generating" | "ready" | "failed";
  attempts: number; reason?: "missing_evidence" | "invalid_output" | "budget_exhausted" | "provider_unavailable" | "image_unavailable";
  checks?: ("schema" | "evidence" | "numbers" | "dates" | "comparison" | "scope" | "values" | "relationships" | "text" | "response" | "structure")[];
  figure?: ResearchFigure };
export type FigureSource = { id: string; excerpt: string; url: string; kind?: string; evidenceType?: string };
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const txt = (v: unknown, n: number, empty = false): v is string => typeof v === "string" && v.length <= n && (empty || !!v.trim()) && !/[\x00-\x1f\x7f]|```/u.test(v);
const norm = (v: string) => v.replace(/\s+/gu, " ").trim().toLowerCase();
// Format equivalence only: retain negative signs and percentages, never infer values or units.
export const figureNumbers = (input: string): string[] => {
  const text = input.replace(/−/gu, "-");
  return Array.from(text.matchAll(/[+-]?\d+(?:[,.]\d+)*(?:\s*(?:%|percent\b|per cent\b))?/giu), match => {
    let token = match[0];
    if (/^[+-]/u.test(token) && match.index! > 0 && /[A-Za-z0-9_]/u.test(text[match.index! - 1])) token = token.slice(1);
    const percent = /(?:%|percent|per cent)$/iu.test(token);
    token = token.replace(/\s*(?:%|percent|per cent)$/iu, "");
    if (token.includes(",") && /^(?:[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?|[+-]?\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d+)?)$/u.test(token)) token = token.replaceAll(",", "");
    if (!token.includes(",")) {
      const negative = token.startsWith("-");
      const [whole, fraction = ""] = token.replace(/^[+-]/u, "").split(".");
      const tail = fraction.replace(/0+$/u, "");
      token = (whole.replace(/^0+/u, "") || "0") + (tail ? "." + tail : "");
      if (negative && token !== "0") token = "-" + token;
    }
    return token + (percent ? "%" : "");
  });
};
const nums = figureNumbers;
const numeric = (v: string, quote: string) => nums(v).every(n => nums(quote).includes(n));
export function figureDateSupported(value: string, quote: string): boolean {
  if (figureDate(value) === null) return false;
  if (new RegExp("(?<!\\d)" + value + "(?!\\d)", "u").test(quote)) return true;
  const parts = value.split("-");
  if (parts.length < 2) return false;
  const name = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"][Number(parts[1]) - 1];
  const month = "(?:" + name + "|" + name.slice(0, 3) + "\\.?)";
  const day = parts.length === 3 ? String(Number(parts[2])) : "\\d{1,2}";
  const suffix = "(?:st|nd|rd|th)?";
  const middle = parts.length === 3 ? "\\s+" + day + suffix + ",?" : "(?:\\s+" + day + suffix + ",?)?";
  return ["\\b" + month + middle + "\\s+" + parts[0] + "\\b", "\\b" + day + suffix + "\\s+" + month + ",?\\s+" + parts[0] + "\\b"].some(pattern => new RegExp(pattern, "iu").test(quote));
}

const exact = (v: Record<string, unknown>, names: string[], optional: string[] = []) => names.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => names.includes(k) || optional.includes(k));
export function figureDate(value: string): number | null {
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/u.test(value)) return null;
  const full = value.length === 4 ? value + "-01-01" : value.length === 7 ? value + "-01" : value;
  const time = Date.parse(full + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === full ? time : null;
}
const eligible = (s: FigureSource) => s.kind !== "alpha_reference" && ["page_extract", "transcript", "post"].includes(s.evidenceType ?? "");
export function publicImageUrl(v: unknown): v is string {
  if (!txt(v, 2048)) return false;
  try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password && !u.port &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/u.test(u.hostname) && !/\.(local|localhost|internal|test|invalid)$/u.test(u.hostname) &&
    !/[\\\s]/u.test(v) && ![...u.searchParams.keys()].some(k => /token|secret|password|signature|credential|api.?key|authorization/iu.test(k)); } catch { return false; }
}
export function validateFigure(value: unknown, sources: FigureSource[]): ResearchFigure | null {
  if (!obj(value) || !exact(value, ["version", "kind", "title", "takeaway", "caveat", "evidence", "items", "edges", "columns", "metric"], ["asset"]) || value.version !== 2 || !FIGURE_KINDS.includes(value.kind) || !txt(value.title, 100) || !txt(value.takeaway, 350) || !txt(value.caveat, 350, true)) return null;
  if (!Array.isArray(value.evidence) || !value.evidence.length || value.evidence.length > 24) return null;
  for (const ref of value.evidence) {
    if (!obj(ref) || !exact(ref, ["sourceId", "quote"]) || !txt(ref.sourceId, 100) || !txt(ref.quote, 900) || norm(ref.quote).length < 20) return null;
    const source = sources.find(s => s.id === ref.sourceId);
    if (!source || !eligible(source) || !norm(source.excerpt).includes(norm(ref.quote))) return null;
  }
  const quoteFor = (refs: unknown) => Array.isArray(refs) && refs.length > 0 && refs.length <= 6 && refs.every(n => Number.isInteger(n) && n >= 0 && n < value.evidence.length) ? refs.map(n => value.evidence[n].quote).join(" ") : null;
  const allQuotes = value.evidence.map((r: FigureEvidence) => r.quote).join(" ");
  if (!obj(value.metric) || !exact(value.metric, ["unit", "period", "geography", "definition"]) || !Object.values(value.metric).every(v => txt(v, 140, true))) return null;
  if (!Array.isArray(value.columns) || value.columns.length > 4 || !value.columns.every((s: unknown) => txt(s, 60)) || !numeric(value.columns.join(" "), allQuotes)) return null;
  if (!Array.isArray(value.items) || !value.items.every((item: unknown): boolean => obj(item)) || value.items.length > 10 || value.items.length < (value.kind === "image" ? 0 : 2) || new Set(value.items.map((i: FigureItem) => i?.id)).size !== value.items.length) return null;
  for (const i of value.items) {
    if (!obj(i) || !exact(i, ["id", "label", "detail", "evidence", "group", "value", "displayValue", "date", "cells"], ["calculation"]) || !txt(i.id, 30) || !/^[a-zA-Z0-9_-]+$/u.test(i.id) || !txt(i.label, 70) || !txt(i.detail, 180, true) || !txt(i.group, 60, true) || !txt(i.displayValue, 40, true) || !txt(i.date, 10, true) || !Array.isArray(i.cells) || i.cells.length > 4 || !i.cells.every((c: unknown) => txt(c, 140, true))) return null;
    const q = quoteFor(i.evidence);
    if (!q || !numeric([i.label, i.detail, i.group, ...i.cells].join(" "), q) || !(i.value === null || typeof i.value === "number" && Number.isFinite(i.value) && Math.abs(i.value) <= 1e15)) return null;
    if (i.calculation) {
      const c = i.calculation;
      if (!obj(c) || !exact(c, ["operation", "inputs"]) || !["ratio", "percentage", "difference", "sum"].includes(c.operation) || !Array.isArray(c.inputs) || c.inputs.length < 2 || c.inputs.length > 4) return null;
      const inputs = c.inputs.map((id: string) => value.items.find((p: FigureItem) => p.id === id));
      if (inputs.some((p: FigureItem) => !p || p.id === i.id || p.calculation || p.value === null) || (c.operation !== "sum" && inputs.length !== 2)) return null;
      const [a, b] = inputs.map((p: FigureItem) => p.value!);
      const calculated = c.operation === "sum" ? inputs.reduce((n: number, p: FigureItem) => n + p.value!, 0) : c.operation === "difference" ? a - b : a / b * (c.operation === "percentage" ? 100 : 1);
      if (i.value === null || !Number.isFinite(calculated) || Math.abs(i.value - calculated) > Math.max(1, Math.abs(calculated)) * 1e-6 || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(i.displayValue) || Number(i.displayValue) !== Number(calculated.toPrecision(6))) return null;
    } else if (!numeric(i.displayValue, q) || i.value !== null && !nums(q).some(n => Number(n.replace(/[, %]/gu, "")) === i.value)) return null;
    if (i.value !== null && (!i.displayValue || !nums(i.displayValue).some(n => Number(n.replace(/[, %]/gu, "")) === i.value)) && !i.calculation) return null;
    if (value.kind === "timeline" && i.date !== "" && (figureDate(i.date) === null || !figureDateSupported(i.date, q))) return null;
    if (value.kind === "comparison" && (value.columns.length < 2 || i.cells.length !== value.columns.length)) return null;
    if (value.kind === "comparison" && i.cells.every((cell: string) => cell.trim().toLowerCase() === "not available")) return null;
  }
  if (value.kind === "line" && value.metric.period !== `${value.items[0].date}–${value.items.at(-1)!.date}`) return null;
  if (value.kind === "metrics" && value.items.some((i: FigureItem) => i.value === null)) return null;
  if (["bar", "line", "stacked"].includes(value.kind)) {
    if (Object.values(value.metric).some(v => !txt(v, 140)) || value.items.some((i: FigureItem) => i.value === null || i.calculation)) return null;
    for (const i of value.items) {
      const q = norm(quoteFor(i.evidence)!);
      if (Object.entries(value.metric).some(([k, v]) => !(value.kind === "line" && k === "period") && !q.includes(norm(v as string)))) return null;
    }
    if (value.kind === "stacked" && value.items.some((i: FigureItem) => i.value! < 0) || value.kind === "stacked" && value.items.reduce((n: number, i: FigureItem) => n + i.value!, 0) <= 0) return null;
    if (value.kind === "line" && value.items.some((i: FigureItem, index: number) => figureDate(i.date) === null || !figureDateSupported(i.date, quoteFor(i.evidence)!) || index > 0 && figureDate(i.date)! <= figureDate(value.items[index - 1].date)!)) return null;
  }
  if (value.kind === "timeline") {
    const dated = value.items.filter((i: FigureItem) => i.date !== "");
    if (dated.length < 2 || dated.some((i: FigureItem, index: number) => index > 0 && figureDate(i.date)! < figureDate(dated[index - 1].date)!)) return null;
  }
  if (!Array.isArray(value.edges) || value.edges.length > 14) return null;
  for (const e of value.edges) {
    if (!obj(e) || !exact(e, ["from", "to", "label", "evidence"]) || !txt(e.label, 90) || e.from === e.to || ![e.from, e.to].every(id => value.items.some((i: FigureItem) => i.id === id))) return null;
    const q = quoteFor(e.evidence); if (!q || !numeric(e.label, q)) return null;
  }
  if (["flow", "ecosystem"].includes(value.kind) && !value.edges.length) return null;
  if (!["flow", "ecosystem"].includes(value.kind) && value.edges.length) return null;
  if (value.kind === "image") {
    const a = value.asset;
    if (!obj(a) || !exact(a, ["dataUrl", "width", "height", "originalUrl", "sourceUrl", "attribution", "license", "licenseQuote", "sourceId"]) || !txt(a.dataUrl, 90000) || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/u.test(a.dataUrl) || ![a.width, a.height].every(n => Number.isInteger(n) && n >= 1 && n <= 1200) || !publicImageUrl(a.originalUrl) || !publicImageUrl(a.sourceUrl) || !txt(a.attribution, 250) || !["CC0", "CC BY", "CC BY-SA", "Public domain"].includes(a.license) || !txt(a.licenseQuote, 500)) return null;
    const source = sources.find(s => s.id === a.sourceId);
    if (!source || source.url !== a.sourceUrl || !source.excerpt.includes(a.originalUrl) || !norm(source.excerpt).includes(norm(a.licenseQuote)) || !norm(a.licenseQuote).includes(norm(a.license))) return null;
    try {
      const bytes = Uint8Array.from(atob(a.dataUrl.split(",")[1]), c => c.charCodeAt(0));
      if (bytes.length < 33 || bytes.length > 65000) return null;
      const header = new DataView(bytes.buffer);
      if (header.getUint32(16) !== a.width || header.getUint32(20) !== a.height || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
    } catch { return null; }
    if (value.items.length || value.edges.length) return null;
  } else if (value.asset !== undefined) return null;
  const derivedValues = value.items.filter((i: FigureItem) => i.calculation).map((i: FigureItem) => i.displayValue).join(" ");
  if (!numeric(value.title + " " + value.takeaway + " " + value.caveat, allQuotes + " " + derivedValues)) return null;
  if (JSON.stringify(Object.fromEntries(Object.entries(value).filter(([k]) => k !== "asset"))).length > 24000) return null;
  return value as ResearchFigure;
}
export function validateFigureSlots(raw: unknown, sources: FigureSource[]): FigureSlot[] | null {
  if (!Array.isArray(raw) || raw.length > 8 || JSON.stringify(raw).length > 340000) return null;
  if (raw.filter(s => s?.preferredKind === "image" || s?.figure?.kind === "image").length > 2) return null;
  const ids = new Set<string>();
  for (const s of raw) {
    if (!obj(s) || !exact(s, ["id", "section", "goal", "preferredKind", "status", "attempts"], ["reason", "figure", "checks"]) || !/^fig_(snacks|appetizers|main|desserts)_[12]$/u.test(s.id) || ids.has(s.id) || !["snacks", "appetizers", "main", "desserts"].includes(s.section) || !s.id.startsWith(`fig_${s.section}_`) || !txt(s.goal, 250) || !FIGURE_KINDS.includes(s.preferredKind) || !["planned", "generating", "ready", "failed"].includes(s.status) || !Number.isInteger(s.attempts) || s.attempts < 0 || s.attempts > 2 || s.reason !== undefined && !["missing_evidence", "invalid_output", "budget_exhausted", "provider_unavailable", "image_unavailable"].includes(s.reason)) return null;
    if (s.checks !== undefined && (!Array.isArray(s.checks) || s.checks.length > 11 || new Set(s.checks).size !== s.checks.length || s.checks.some((check: unknown) => !["schema", "evidence", "numbers", "dates", "comparison", "scope", "values", "relationships", "text", "response", "structure"].includes(check as string)) || s.status === "ready")) return null;
    if (s.status === "ready" ? !validateFigure(s.figure, sources) || s.reason !== undefined : s.figure !== undefined) return null;
    ids.add(s.id);
  }
  return raw as FigureSlot[];
}
export function figureCoverage(slots: FigureSlot[] | undefined, sections: { key: string; status: string }[]) {
  const keys = sections.filter(s => s.status !== "skipped").map(s => s.key);
  const required = slots?.filter(s => keys.includes(s.section)) ?? [];
  const ready = required.filter(s => s.status === "ready").length;
  const missingSections = keys.filter(key => !required.some(s => s.section === key)).length;
  const total = required.length + missingSections;
  return { ready, total, complete: total > 0 && ready === total, legacy: slots === undefined };
}
