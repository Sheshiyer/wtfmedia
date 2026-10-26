import type { ResearchSource } from "./research";

export type ResearchVisual = {
  version: 1;
  kind: "flow" | "comparison";
  title: string;
  explanation: string;
  items: Array<{ label: string; detail: string; sourceId: string; quote: string }>;
};

const normalize = (value: string) => value.trim().replace(/\s+/gu, " ").toLowerCase();
const text = (value: unknown, limit: number): value is string => typeof value === "string" && !!value.trim() && value.length <= limit && !/[\u0000-\u001f\u007f]|```/u.test(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const numbersSupported = (value: string, quote: string) => {
  const tokens = new Set(quote.match(/[+-]?\d+(?:[,.]\d+)*%?/gu) ?? []);
  return (value.match(/[+-]?\d+(?:[,.]\d+)*%?/gu) ?? []).every(number => tokens.has(number));
};

/** Revalidate persisted/model content at both display and export boundaries. */
export function parseResearchVisual(raw: string, sources: ResearchSource[]): ResearchVisual | null {
  if (raw.length > 8000) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!object(value) || !keys(value, ["version", "kind", "title", "explanation", "items"]) || value.version !== 1 || (value.kind !== "flow" && value.kind !== "comparison") || !text(value.title, 120) || !text(value.explanation, 500) || !Array.isArray(value.items) || value.items.length < 2 || value.items.length > 4) return null;
  const items: ResearchVisual["items"] = [];
  for (const item of value.items) {
    if (!object(item) || !keys(item, ["label", "detail", "sourceId", "quote"]) || !text(item.label, 70) || !text(item.detail, 180) || !text(item.sourceId, 100) || !text(item.quote, 600)) return null;
    const source = sources.find(source => source.id === item.sourceId);
    const quote = normalize(item.quote);
    if (!source || source.kind === "alpha_reference" || !["page_extract", "transcript", "post"].includes(source.evidenceType ?? "") || quote.length < 30 || !normalize(source.excerpt).includes(quote) || !numbersSupported(`${item.label} ${item.detail}`, quote)) return null;
    items.push({ label: item.label, detail: item.detail, sourceId: item.sourceId, quote: item.quote });
  }
  if (!numbersSupported(`${value.title} ${value.explanation}`, items.map(item => normalize(item.quote)).join(" "))) return null;
  return { version: 1, kind: value.kind, title: value.title, explanation: value.explanation, items };
}

const XML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const escapeXml = (value: string) => value.replace(/[&<>"']/gu, character => XML_ENTITIES[character]);

function wrap(value: string, width: number, fontSize: number): string[] {
  // Conservative glyph widths keep wide capitals and non-Latin labels inside cards.
  const measure = (text: string) => Array.from(text).reduce((sum, char) => sum + fontSize * (char === " " ? 0.35 : /[MW@#%&]/u.test(char) ? 1 : /[\u0020-\u007e]/u.test(char) ? 0.66 : 1.1), 0);
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/u)) {
    // Break very long tokens too; never clip a claim or its units.
    const points = Array.from(word);
    while (points.length) {
      let part = points.shift()!;
      while (points.length && measure(part + points[0]) <= width) part += points.shift()!;
      if (line && measure(line + " " + part) > width) { lines.push(line); line = ""; }
      line += (line ? " " : "") + part;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Only fixed drawing primitives and escaped text; no model SVG, HTML, URLs or fonts. */
export function renderResearchVisual(visual: ResearchVisual): { svg: string; width: number; height: number } {
  const width = 960;
  const flow = visual.kind === "flow";
  const cardWidth = flow ? 864 : 420;
  const titleLines = wrap(visual.title, 864, 30);
  const startY = 66 + titleLines.length * 36;
  const cards = visual.items.map(item => {
    const label = wrap(item.label, cardWidth - 48, 26);
    const detail = wrap(item.detail, cardWidth - 48, 22);
    return { label, detail, height: 64 + label.length * 31 + detail.length * 28 };
  });
  const placements: Array<{ x: number; y: number; height: number }> = [];
  let y = startY;
  if (flow) {
    cards.forEach(card => { placements.push({ x: 48, y, height: card.height }); y += card.height + 38; });
  } else {
    for (let index = 0; index < cards.length; index += 2) {
      const height = Math.max(cards[index].height, cards[index + 1]?.height ?? 0);
      placements.push({ x: 48, y, height });
      if (cards[index + 1]) placements.push({ x: 492, y, height });
      y += height + 24;
    }
  }
  const height = y + 36;
  const lines = (values: string[], x: number, y: number, size: number, step: number, bold = false) => values.map((line, index) => `<text x="${x}" y="${y + index * step}" font-size="${size}"${bold ? ' font-weight="700"' : ""}>${escapeXml(line)}</text>`).join("");
  const nodes = cards.map((card, index) => {
    const p = placements[index];
    const detailY = p.y + 38 + card.label.length * 31;
    return `<rect x="${p.x}" y="${p.y}" width="${cardWidth}" height="${p.height}" rx="14" fill="${index % 2 ? "#f0ecfa" : "#fff4cf"}" stroke="#25221f" stroke-width="2"/>`
      + lines(card.label, p.x + 24, p.y + 38, 26, 31, true)
      + lines(card.detail, p.x + 24, detailY, 22, 28)
      + `<text x="${p.x + 24}" y="${p.y + p.height - 16}" font-size="17" fill="#56504b">Evidence ${index + 1}</text>`
      + (flow && index < cards.length - 1 ? `<path d="M480 ${p.y + p.height + 5} v22 m-7 -7 l7 7 l7 -7" stroke="#67539c" stroke-width="3" fill="none"/>` : "");
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeXml(visual.title)}</title><desc>${escapeXml(visual.explanation)}</desc><rect width="${width}" height="${height}" fill="#fffaf0"/><g font-family="Arial, sans-serif" fill="#25221f"><text x="48" y="34" font-size="16" fill="#67539c">EDITORIAL ${flow ? "PROCESS DIAGRAM" : "COMPARISON"}</text>${lines(titleLines, 48, 74, 30, 36, true)}${nodes}<text x="48" y="${height - 18}" font-size="16" fill="#56504b">Schematic · Supporting extracts accompany this figure</text></g></svg>`;
  return { svg, width, height };
}

export function researchVisualDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Runs only on a browser Word download; no source URL or third-party image fetch. */
export async function researchVisualPng(visual: ResearchVisual): Promise<{ data: Uint8Array; width: number; height: number }> {
  const rendered = renderResearchVisual(visual);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not render a research diagram. Please retry the Word download."));
    image.src = researchVisualDataUrl(rendered.svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = rendered.width * 2;
  canvas.height = rendered.height * 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not encode a research diagram.")), "image/png"));
  const scale = Math.min(600 / rendered.width, 650 / rendered.height);
  return { data: new Uint8Array(await blob.arrayBuffer()), width: Math.round(rendered.width * scale), height: Math.round(rendered.height * scale) };
}
