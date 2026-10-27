import { figureDate, validateFigureSlots, figureCoverage, type ResearchFigure, type FigureSlot, type FigureItem } from "../../shared/research-figures";
export { validateFigureSlots, figureCoverage };
export type { ResearchFigure, FigureSlot };

const escape = (s: string) => s.replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
// Fixed, portable palette for exported figures; matches the report reference's orange/blue contrasts.
const palette = ["#e99545", "#587ee5", "#249c8e", "#8e67bb", "#ca6573"];
function wrap(text: string, width: number, font = 18) {
  const result: string[] = []; let line = "";
  const measure = (s: string) => Array.from(s).reduce((n, c) => n + font * (/[^\x20-\x7e]/u.test(c) ? 1 : /[MW@%]/u.test(c) ? .95 : c === " " ? .33 : .6), 0);
  for (const word of text.trim().split(/\s+/u)) {
    if (line && measure(line + " " + word) <= width) { line += " " + word; continue; }
    if (line) { result.push(line); line = ""; }
    for (const char of word) {
      if (measure(line + char) > width) { result.push(line); line = ""; }
      line += char;
    }
  }
  if (line.trim()) result.push(line.trim());
  return result;
}
const words = (s: string, x: number, y: number, width: number, size = 18, bold = false, fill = "#242424") => wrap(s, width, size).map((line, i) => `<text x="${x}" y="${y + i * (size + 6)}" font-size="${size}" fill="${fill}"${bold ? ' font-weight="700"' : ""}>${escape(line)}</text>`).join("");
const box = (x: number, y: number, width: number, height: number, color = "#f5f6f9", border = "#dce1eb") => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${color}" stroke="${border}"/>`;
const lineHeight = (s: string, width: number, font = 18) => wrap(s, width, font).length * (font + 6);
export const FIGURE_REASONS: Record<string, string> = {
  missing_evidence: "More supporting evidence is needed for this figure.",
  invalid_output: "The figure did not pass evidence or structure validation.",
  budget_exhausted: "The visual allowance was reached before this figure was ready.",
  provider_unavailable: "The figure service could not complete this request.",
  image_unavailable: "A relevant image with explicit reuse permission was not available.",
};

/** Deterministic SVG, never model-authored markup or remote fonts. */
export function renderFigure(f: ResearchFigure): { svg: string; width: number; height: number; breaks: number[] } {
  const width = 1120; const left = 40; const inner = width - 80;
  const breaks: number[] = [];
  let y = 58 + lineHeight(f.title, inner, 32);
  let content = words(f.title, left, 58, inner, 32, true);
  content += words(f.takeaway, left, y, inner, 19); y += lineHeight(f.takeaway, inner, 19) + 28;
  content += `<path d="M40 ${y} H1080" stroke="#dce1eb"/>`; y += 30;
  const itemCaption = (item: FigureItem) => item.group;
  if (f.kind === "bar") {
    const values = f.items.map(i => i.value!); const min = Math.min(0, ...values); const max = Math.max(0, ...values);
    const span = max - min || 1, x0 = 320, chartWidth = 580;
    const pos = (v: number) => x0 + (v - min) / span * chartWidth;
    content += words(`${f.metric.definition} · ${f.metric.unit} · ${f.metric.geography} · ${f.metric.period}`, left, y, inner, 16); y += lineHeight(Object.values(f.metric).join(" · "), inner, 16) + 20;
    for (const [index, item] of f.items.entries()) {
      const rowHeight = Math.max(75, lineHeight(item.label, 250) + lineHeight(itemCaption(item), 250, 14) + 25);
      content += words(item.label, left, y + 22, 250, 18, true) + words(itemCaption(item), left, y + 26 + lineHeight(item.label, 250), 250, 14);
      content += `<path d="M${pos(0)} ${y} v${rowHeight}" stroke="#697386"/>`;
      content += `<rect x="${Math.min(pos(0), pos(item.value!))}" y="${y + 8}" width="${Math.abs(pos(item.value!) - pos(0))}" height="28" rx="4" fill="${palette[index % palette.length]}"/>`;
      content += words(`${item.displayValue} ${f.metric.unit}`, 924, y + 29, 150, 17, true);
      y += rowHeight; breaks.push(y);
    }
  } else if (f.kind === "line") {
    const values = f.items.map(i => i.value!); const min = Math.min(0, ...values), max = Math.max(0, ...values), span = max - min || 1;
    const metricLabel = `${f.metric.definition} · ${f.metric.unit} · ${f.metric.geography} · ${f.metric.period}`;
    content += words(metricLabel, left, y, inner, 16); y += lineHeight(metricLabel, inner, 16) + 24;
    const h = 280, start = y;
    const dates = f.items.map(i => figureDate(i.date)!);
    const points = f.items.map((item, i) => ({ x: 160 + (dates[i] - dates[0]) * 850 / (dates.at(-1)! - dates[0]), y: start + h - (item.value! - min) / span * h, item }));
    for (let n = 0; n <= 4; n++) {
      const at = start + n * h / 4;
      content += `<path d="M150 ${at} H1040" stroke="#e4e7ed"/>` + words(Number((max - span * n / 4).toPrecision(4)).toLocaleString("en"), 40, at + 6, 100, 15);
    }
    content += `<polyline points="${points.map(p => `${p.x},${p.y}`).join(" ")}" stroke="${palette[0]}" stroke-width="4" fill="none"/>`;
    points.forEach(p => { content += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${palette[0]}"/>`; });
    content += words(f.items[0].date, 150, start + h + 26, 160, 15) + words(f.items.at(-1)!.date, 920, start + h + 26, 160, 15);
    y = start + h + 65;
    // A full-width key keeps dense dates and point values readable instead of colliding on the axis.
    points.forEach(p => { content += words(`${p.item.date} · ${p.item.label}: ${p.item.displayValue} ${f.metric.unit}`, left, y, inner, 17); y += lineHeight(`${p.item.date} · ${p.item.label}: ${p.item.displayValue} ${f.metric.unit}`, inner, 17) + 8; breaks.push(y); });
  } else if (f.kind === "stacked") {
    const total = f.items.reduce((n, i) => n + i.value!, 0); let x = left;
    const metricLabel = `${f.metric.definition} · ${f.metric.unit} · ${f.metric.geography} · ${f.metric.period}`;
    content += words(metricLabel, left, y, inner, 16); y += lineHeight(metricLabel, inner, 16) + 24;
    f.items.forEach((i, index) => { const w = i.value! / total * inner; content += `<rect x="${x}" y="${y}" width="${w}" height="64" fill="${palette[index % palette.length]}"/>`; x += w; });
    y += 105;
    f.items.forEach((i, index) => {
      content += `<circle cx="52" cy="${y - 6}" r="7" fill="${palette[index % palette.length]}"/>`;
      const label = `${i.label}: ${i.displayValue} ${f.metric.unit}`;
      content += words(label, 75, y, inner - 40, 20, true); y += lineHeight(label, inner - 40, 20) + 15; breaks.push(y);
    });
  } else if (f.kind === "comparison") {
    const widths = [220, ...f.columns.map(() => (inner - 220) / f.columns.length)];
    const headers = ["", ...f.columns];
    const headerHeight = Math.max(60, ...headers.map((h, n) => lineHeight(h, widths[n] - 24, 18) + 30));
    content += box(left, y, inner, headerHeight); let x = left;
    headers.forEach((h, n) => { content += words(h, x + 12, y + 28, widths[n] - 24, 18, true); x += widths[n]; }); y += headerHeight;
    for (const i of f.items) {
      const cells = [i.label, ...i.cells];
      const rh = Math.max(70, ...cells.map((c, n) => lineHeight(c, widths[n] - 24, 17) + 32)); x = left;
      cells.forEach((c, n) => { content += words(c || "Not available", x + 12, y + 27, widths[n] - 24, 17, n === 0); x += widths[n]; });
      y += rh; breaks.push(y); content += `<path d="M40 ${y} H1080" stroke="#dce1eb"/>`;
    }
    y += 25;
  } else if (f.kind === "timeline") {
    for (const [index, i] of f.items.filter(i => i.date).entries()) {
      const h = 50 + lineHeight(i.label, 800, 23) + lineHeight(i.detail, 800) + lineHeight(itemCaption(i), 800, 14);
      content += `<path d="M190 ${y - 8} v${h + 22}" stroke="#cbd5e1" stroke-width="3"/><circle cx="190" cy="${y + 9}" r="9" fill="${palette[index % 2]}"/>`;
      content += words(i.date, left, y + 16, 130, 23, true, palette[index % 2]);
      content += words(i.label, 225, y + 17, 800, 23, true) + words(i.detail, 225, y + 24 + lineHeight(i.label, 800, 23), 800);
      content += words(itemCaption(i), 225, y + h - 12, 800, 14); y += h + 22; breaks.push(y);
    }
    const undated = f.items.filter(i => !i.date);
    if (undated.length) {
      y += 20;
      content += words("Undated context · chronology not established", left, y, inner, 20, true);
      y += 40;
      for (const i of undated) {
        const h = 38 + lineHeight(i.label, inner - 32, 21) + lineHeight(i.detail, inner - 32, 18) + lineHeight(itemCaption(i), inner - 32, 14);
        content += box(left, y, inner, h);
        content += words(i.label, left + 16, y + 27, inner - 32, 21, true);
        content += words(i.detail, left + 16, y + 32 + lineHeight(i.label, inner - 32, 21), inner - 32, 18);
        content += words(itemCaption(i), left + 16, y + h - 12, inner - 32, 14);
        y += h + 16; breaks.push(y);
      }
    }
  } else if (f.kind === "flow" || f.kind === "ecosystem") {
    // Explicit adjacency with independent right-side routing lanes also handles cycles and back edges.
    // Labels live in the connection key, never over another node or arrow.
    const placements: { y: number; h: number }[] = [];
    f.items.forEach((i, index) => {
      const h = 52 + lineHeight(i.label, 620, 23) + lineHeight(i.detail, 620, 18) + lineHeight(itemCaption(i), 620, 14);
      placements.push({ y, h });
      content += box(left, y, 680, h, index % 2 ? "#f0f4ff" : "#fff5e9", palette[index % 2]);
      content += words(i.label, 62, y + 32, 620, 23, true) + words(i.detail, 62, y + 40 + lineHeight(i.label, 620, 23), 620);
      content += words(itemCaption(i), 62, y + h - 16, 620, 14); y += h + 26; breaks.push(y);
    });
    f.edges.forEach((e, index) => {
      const a = placements[f.items.findIndex(i => i.id === e.from)], b = placements[f.items.findIndex(i => i.id === e.to)];
      const x = 750 + index * 21, ay = a.y + a.h * .35, by = b.y + b.h * .65;
      content += `<path d="M720 ${ay} H${x} V${by} H728" fill="none" stroke="${palette[index % palette.length]}" stroke-width="2" marker-end="url(#arrow${index % palette.length})"/>`;
    });
    content += words("Connections", left, y + 15, inner, 21, true); y += 48;
    f.edges.forEach(e => {
      const from = f.items.find(i => i.id === e.from)!, to = f.items.find(i => i.id === e.to)!;
      const label = `${from.label} → ${to.label}: ${e.label}`;
      content += words(label, left, y, inner, 18); y += lineHeight(label, inner) + 12; breaks.push(y);
    });
  } else if (f.kind === "image" && f.asset) {
    const scale = Math.min(inner / f.asset.width, 620 / f.asset.height, 1);
    const w = f.asset.width * scale, h = f.asset.height * scale;
    content += `<image href="${escape(f.asset.dataUrl)}" x="${(width - w) / 2}" y="${y}" width="${w}" height="${h}"/>`; y += h + 32;
    content += words(`${f.asset.attribution} · ${f.asset.license}`, left, y, inner, 16); y += lineHeight(`${f.asset.attribution} · ${f.asset.license}`, inner, 16) + 20;
  } else {
    const cw = 508;
    for (let n = 0; n < f.items.length; n += 2) {
      const pair = f.items.slice(n, n + 2);
      const heights = pair.map(i => 95 + lineHeight(i.label, cw - 44, 22) + lineHeight(i.detail, cw - 44) + lineHeight(itemCaption(i), cw - 44, 14) + (i.value === null ? 0 : lineHeight(i.displayValue, cw - 44, 38)));
      const h = Math.max(...heights);
      pair.forEach((i, col) => {
        const x = left + col * (cw + 24); let at = y + 34;
        content += box(x, y, cw, h, col ? "#f0f4ff" : "#fff5e9", palette[col]);
        content += words(i.label, x + 22, at, cw - 44, 22, true); at += lineHeight(i.label, cw - 44, 22) + 12;
        if (i.value !== null) { content += words(i.displayValue, x + 22, at + 20, cw - 44, 38, true, palette[col]); at += lineHeight(i.displayValue, cw - 44, 38) + 26; }
        content += words(i.detail, x + 22, at, cw - 44) + words(itemCaption(i), x + 22, y + h - 18, cw - 44, 14);
      }); y += h + 24; breaks.push(y);
    }
  }
  if (f.caveat) { content += words(f.caveat, left, y + 15, inner, 16); y += lineHeight(f.caveat, inner, 16) + 30; }
  content += `<path d="M40 ${y} H1080" stroke="#dce1eb"/>`; y += 26;
  content += words("Supporting sources and excerpts accompany this figure.", left, y, inner, 14);
  const height = Math.ceil(y + 30);
  const defs = palette.map((color, i) => `<marker id="arrow${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="${color}"/></marker>`).join("");
  return { width, height, breaks: [...breaks, height], svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escape(f.title)}</title><desc>${escape(f.takeaway)}</desc><defs>${defs}</defs><rect width="${width}" height="${height}" fill="#ffffff"/><g font-family="Arial,sans-serif" fill="#242424">${content}</g></svg>` };
}

export function figureDataUrl(f: ResearchFigure) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderFigure(f).svg)}`; }
/** Split tall figures at complete rows, keeping print labels readable at full page width. */
export async function figurePngPages(f: ResearchFigure) {
  const rendered = renderFigure(f); const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("A report figure could not render. Retry the Word download.")); image.src = figureDataUrl(f); });
  const pages: { data: Uint8Array; width: number; height: number }[] = [];
  let start = 0;
  while (start < rendered.height) {
    const available = rendered.breaks.filter(b => b > start && b <= start + 1120);
    const end = Math.min(rendered.height, available.at(-1) ?? rendered.breaks.find(b => b > start) ?? rendered.height);
    const header = start ? 75 : 0;
    const height = end - start + header;
    const canvas = document.createElement("canvas"); canvas.width = rendered.width * 2; canvas.height = height * 2;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Figure export is unavailable in this browser.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (start) { ctx.fillStyle = "#242424"; ctx.font = "bold 36px Arial"; ctx.fillText(f.title + " (continued)", 80, 70, canvas.width - 160); }
    ctx.drawImage(image, 0, start, rendered.width, end - start, 0, header * 2, rendered.width * 2, (end - start) * 2);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not encode report figure.")), "image/png"));
    const scale = 600 / rendered.width;
    pages.push({ data: new Uint8Array(await blob.arrayBuffer()), width: 600, height: Math.round(height * scale) });
    start = end;
  }
  return pages;
}

export function figureAccessibleText(f: ResearchFigure) {
  return [f.takeaway, ...f.items.map(i => `${i.date ? i.date + ": " : f.kind === "timeline" ? "Undated context: " : ""}${i.label}: ${i.displayValue} ${i.detail} ${i.cells.join("; ")}`),
    ...f.edges.map(e => `${f.items.find(i => i.id === e.from)?.label} → ${f.items.find(i => i.id === e.to)?.label}: ${e.label}`), f.caveat].filter(Boolean).join("\n");
}

/** Same subsection placement in web and Word; no mutation of saved report prose. */
export function placeFigures(markdown: string, slots: FigureSlot[]) {
  if (slots.length) markdown = markdown.replace(/^```research-visual\s*\n[\s\S]*?^```\s*$/gmu, "");
  const blocks: { markdown: string; figures: FigureSlot[] }[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/u.test(line)) fenced = !fenced;
    if (!blocks.length || !fenced && /^#{1,4}\s/u.test(line)) blocks.push({ markdown: "", figures: [] });
    blocks[blocks.length - 1].markdown += line + "\n";
  }
  if (!blocks.length) blocks.push({ markdown: "", figures: [] });
  const terms = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/gu) ?? []).filter(t => !["this", "that", "with", "from", "their", "source", "report", "explain", "documented", "evidence"].includes(t)));
  for (const slot of slots) {
    const target = terms(slot.goal + " " + (slot.figure?.title ?? ""));
    const ranked = blocks.map((b, i) => ({ i, score: [...terms(b.markdown.slice(0, 1200))].filter(t => target.has(t)).length - b.figures.length * 2 }));
    ranked.sort((a, b) => b.score - a.score || a.i - b.i);
    blocks[ranked[0].i].figures.push(slot);
  }
  return blocks;
}
