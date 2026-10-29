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

// Layout uses only the supplied edges. Position never creates a new relationship.
function diagramLayout(f: ResearchFigure, top: number, heightFor: (i: FigureItem, width: number) => number) {
  const incoming = new Map(f.items.map(i => [i.id, f.edges.filter(e => e.to === i.id).length]));
  const outgoing = new Map(f.items.map(i => [i.id, f.edges.filter(e => e.from === i.id)]));
  const degrees = new Map(incoming), ranks = new Map(f.items.map(i => [i.id, 0]));
  const queue = f.items.filter(i => !degrees.get(i.id)).map(i => i.id), order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!; order.push(id);
    for (const edge of outgoing.get(id)!) {
      ranks.set(edge.to, Math.max(ranks.get(edge.to)!, ranks.get(id)! + 1));
      degrees.set(edge.to, degrees.get(edge.to)! - 1);
      if (!degrees.get(edge.to)) queue.push(edge.to);
    }
  }
  const chain = order.length === f.items.length && f.edges.length === f.items.length - 1 && f.items.every(i => incoming.get(i.id)! <= 1 && outgoing.get(i.id)!.length <= 1);
  const layers = Math.max(...ranks.values()) + 1;
  const branched = !chain && order.length === f.items.length && layers <= 3;
  const columns = chain ? Math.min(f.items.length, f.items.length === 4 ? 4 : 3) : branched ? layers : 1;
  const nodeWidth = columns === 1 ? 760 : (1040 - (columns - 1) * 72) / columns;
  const nodes: { item: FigureItem; x: number; y: number; width: number; height: number }[] = [];
  let bottom = top;
  if (chain) {
    for (let start = 0; start < order.length; start += columns) {
      const row = order.slice(start, start + columns).map(id => f.items.find(i => i.id === id)!);
      const height = Math.max(...row.map(i => heightFor(i, nodeWidth)));
      row.forEach((item, col) => nodes.push({ item, x: 40 + (Math.floor(start / columns) % 2 ? columns - 1 - col : col) * (nodeWidth + 72), y: bottom, width: nodeWidth, height }));
      bottom += height + 72;
    }
  } else if (branched) {
    // Reserve space above nodes for relationships that skip an intermediate layer.
    const headroom = f.edges.some(e => ranks.get(e.to)! - ranks.get(e.from)! > 1) ? 32 + f.edges.length * 12 : 0;
    const heights = Array.from({ length: layers }, (_, rank) => f.items.filter(i => ranks.get(i.id) === rank).reduce((h, i) => h + heightFor(i, nodeWidth) + 24, -24));
    const graphHeight = Math.max(...heights);
    for (let rank = 0; rank < layers; rank++) {
      let y = top + headroom + (graphHeight - heights[rank]) / 2;
      for (const item of f.items.filter(i => ranks.get(i.id) === rank)) {
        const height = heightFor(item, nodeWidth);
        nodes.push({ item, x: 40 + rank * (nodeWidth + 72), y, width: nodeWidth, height }); y += height + 24;
      }
    }
    bottom = top + headroom + graphHeight + 36;
  } else {
    // Cycles and dense graphs keep distinct outer routing lanes, never false chains.
    for (const item of f.items) {
      const height = heightFor(item, nodeWidth);
      nodes.push({ item, x: 40, y: bottom, width: nodeWidth, height }); bottom += height + 24;
    }
  }
  const routes = f.edges.map((edge, index) => {
    const a = nodes.find(n => n.item.id === edge.from)!, b = nodes.find(n => n.item.id === edge.to)!;
    const fromEdges = f.edges.filter(e => e.from === edge.from), toEdges = f.edges.filter(e => e.to === edge.to);
    const ay = a.y + a.height * (fromEdges.indexOf(edge) + 1) / (fromEdges.length + 1);
    const by = b.y + b.height * (toEdges.indexOf(edge) + 1) / (toEdges.length + 1);
    let path: string;
    if (chain && a.y === b.y) {
      const forward = a.x < b.x;
      path = `M${forward ? a.x + a.width : a.x} ${ay} H${forward ? b.x - 7 : b.x + b.width + 7}`;
    } else if (chain) path = `M${a.x + a.width / 2} ${a.y + a.height} V${b.y - 7}`;
    else if (branched && ranks.get(edge.to)! - ranks.get(edge.from)! === 1) {
      const ax = a.x + a.width, bx = b.x - 7, middle = (ax + bx) / 2;
      path = `M${ax} ${ay} C${middle} ${ay} ${middle} ${by} ${bx} ${by}`;
    } else if (branched) {
      const lane = top + 12 + index * 12;
      path = `M${a.x + a.width} ${ay} H${a.x + a.width + 18} V${lane} H${b.x - 18} V${by} H${b.x - 7}`;
    } else {
      const lane = 840 + index * 16;
      path = `M${a.x + a.width} ${ay} H${lane} V${by} H${b.x + b.width + 7}`;
    }
    return { edge, path };
  });
  return { nodes, routes, bottom, kind: chain ? "process" : branched ? "map" : "relationships" };
}

// Fixed decorative pictograms; source text never supplies executable SVG markup.
function pictogram(label: string, x: number, y: number, color: string) {
  const text = label.toLowerCase();
  const shape = /customer|consumer|person|guest|founder|user|team/u.test(text) ? '<circle cx="16" cy="9" r="5"/><path d="M5 29c0-15 22-15 22 0"/>'
    : /bank|fund|invest|capital/u.test(text) ? '<path d="M2 11L16 3l14 8H2zm4 4v11m10-11v11m10-11v11M2 30h28"/>'
    : /merchant|shop|store|retail/u.test(text) ? '<path d="M4 13h24v17H4zM2 13l4-9h20l4 9M12 30V20h8v10"/>'
    : /delivery|transport|logistic|truck/u.test(text) ? '<path d="M2 7h18v17H2zm18 7h6l4 6v4H20"/><circle cx="8" cy="26" r="3"/><circle cx="25" cy="26" r="3"/>'
    : /network|platform|global|market/u.test(text) ? '<circle cx="16" cy="16" r="13"/><ellipse cx="16" cy="16" rx="6" ry="13"/><path d="M3 16h26"/>'
    : /manufactur|factory|production/u.test(text) ? '<path d="M3 29V14l9-6v9l9-6v9h8v9H3zM5 5h5v7M8 23h3m5 0h3m5 0h3"/>'
    : '<rect x="4" y="4" width="24" height="24" rx="5"/><path d="M9 11h14M9 16h14M9 21h8"/>';
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</g>`;
}

/** Deterministic SVG, never model-authored markup or remote fonts. */
export function renderFigure(f: ResearchFigure): { svg: string; width: number; height: number; breaks: number[] } {
  const width = 1120; const left = 40; const inner = width - 80;
  const breaks: number[] = [];
  let y = 58 + lineHeight(f.title, inner, 32);
  let content = words(f.title, left, 58, inner, 32, true);
  y += 12;
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
  } else if (f.kind === "comparison" && f.items.length <= 3) {
    const gap = 24, cardWidth = (inner - gap * (f.items.length - 1)) / f.items.length;
    const headingHeight = Math.max(...f.items.map(i => lineHeight(i.label, cardWidth - 40, 24))) + 42;
    const rowHeights = f.columns.map((heading, n) => 36 + lineHeight(heading, cardWidth - 40, 16) + Math.max(...f.items.map(i => lineHeight(i.cells[n], cardWidth - 40, 19))));
    const height = headingHeight + rowHeights.reduce((a, b) => a + b, 0) + 16;
    f.items.forEach((item, index) => {
      const x = left + index * (cardWidth + gap), color = palette[index % palette.length];
      content += `<g data-comparison="${escape(item.id)}">` + box(x, y, cardWidth, height, index % 2 ? "#f0f4ff" : "#fff5e9", color);
      content += `<rect x="${x + 20}" y="${y + 16}" width="40" height="5" rx="2" fill="${color}"/>`;
      content += words(item.label, x + 20, y + 52, cardWidth - 40, 24, true);
      let at = y + headingHeight + 24;
      f.columns.forEach((heading, n) => {
        content += words(heading, x + 20, at, cardWidth - 40, 16, true, "#596579");
        content += words(item.cells[n], x + 20, at + lineHeight(heading, cardWidth - 40, 16) + 8, cardWidth - 40, 19);
        at += rowHeights[n];
      });
      content += "</g>";
    }); y += height + 28; breaks.push(y);
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
    const graph = diagramLayout(f, y, (i, w) => 100 + lineHeight(i.label, w - 40, 22) + lineHeight(i.detail, w - 40, 18) + lineHeight(i.group, w - 40, 14));
    content += `<g data-diagram-layout="${graph.kind}">`;
    // Connectors go behind cards; no line can obscure a card's text.
    graph.routes.forEach(({ edge, path }, index) => {
      content += `<path d="${path}" data-from="${escape(edge.from)}" data-to="${escape(edge.to)}" fill="none" stroke="${palette[index % palette.length]}" stroke-width="3" marker-end="url(#arrow${index % palette.length})"><title>${escape(edge.label)}</title></path>`;
    });
    graph.nodes.forEach(({ item, x, y: top, width: w, height: h }, index) => {
      const color = palette[index % palette.length];
      content += `<g data-node="${escape(item.id)}">` + box(x, top, w, h, "#ffffff", color);
      content += pictogram(item.label + " " + item.group, x + 20, top + 16, color);
      let at = top + 74;
      content += words(item.label, x + 20, at, w - 40, 22, true); at += lineHeight(item.label, w - 40, 22) + 12;
      content += words(item.detail, x + 20, at, w - 40, 18);
      content += words(item.group, x + 20, top + h - lineHeight(item.group, w - 40, 14), w - 40, 14, false, "#596579");
      content += "</g>";
    });
    content += "</g>"; y = graph.bottom; breaks.push(y);
    content += words("How the parts connect", left, y + 15, inner, 21, true); y += 48;
    // A compact key keeps exact relationship labels legible, including back edges.
    for (let n = 0; n < f.edges.length; n += 2) {
      let rowHeight = 0;
      f.edges.slice(n, n + 2).forEach((e, col) => {
        const from = f.items.find(i => i.id === e.from)!, to = f.items.find(i => i.id === e.to)!;
        const label = `${from.label} → ${to.label}: ${e.label}`, x = left + col * 532;
        content += `<circle cx="${x + 5}" cy="${y - 6}" r="4" fill="${palette[(n + col) % palette.length]}"/>`;
        content += words(label, x + 18, y, 490, 16);
        rowHeight = Math.max(rowHeight, lineHeight(label, 490, 16));
      });
      y += rowHeight + 16; breaks.push(y);
    }
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
  const takeawayHeight = lineHeight(f.takeaway, inner - 44, 21) + 36;
  content += box(left, y + 8, inner, takeawayHeight, "#fff5e9", "#e99545");
  content += words(f.takeaway, left + 22, y + 38, inner - 44, 21, true);
  y += takeawayHeight + 36; breaks.push(y);
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
    const scale = Math.min(600 / rendered.width, 660 / height);
    pages.push({ data: new Uint8Array(await blob.arrayBuffer()), width: Math.round(rendered.width * scale), height: Math.round(height * scale) });
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
