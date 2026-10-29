import { expect, it } from "vitest";
import { renderFigure, figureAccessibleText, type ResearchFigure } from "../../lib/research-figures";
import { processFigure } from "../fixtures/research-figure-fixtures";

function nodes(svg: string) {
  return [...svg.matchAll(/<g data-node="([^"]+)"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/gu)]
    .map(([, id, x, y, width, height]) => ({ id, x: +x, y: +y, width: +width, height: +height }));
}

it("lays out a shuffled process in evidence order without inventing connections", () => {
  const input = { ...processFigure, items: [...processFigure.items].reverse() };
  const before = JSON.stringify(input), rendered = renderFigure(input), boxes = nodes(rendered.svg);
  expect(boxes.map(n => n.id)).toEqual(processFigure.items.map(i => i.id));
  expect(new Set(boxes.map(n => n.y)).size).toBe(1);
  expect(rendered.svg.match(/data-from=/gu)).toHaveLength(3);
  expect(rendered.height).toBeLessThan(850);
  expect(JSON.stringify(input)).toBe(before);
});

it("lays out branches in separate columns and preserves a shortcut edge", () => {
  const figure: ResearchFigure = { ...processFigure, kind: "ecosystem", edges: [
    { from: "customer", to: "merchant", label: "branch", evidence: [0] },
    { from: "customer", to: "network", label: "other branch", evidence: [0] },
    { from: "merchant", to: "bank", label: "arrives", evidence: [0] },
    { from: "network", to: "bank", label: "arrives", evidence: [0] },
    { from: "customer", to: "bank", label: "direct path", evidence: [0] },
  ] };
  const rendered = renderFigure(figure), boxes = nodes(rendered.svg);
  expect(new Set(boxes.map(n => n.x)).size).toBe(3);
  expect(boxes.find(n => n.id === "merchant")!.x).toBe(boxes.find(n => n.id === "network")!.x);
  expect(rendered.svg.match(/data-from=/gu)).toHaveLength(5);
  expect(figureAccessibleText(figure)).toContain("Customer → Issuing bank: direct path");
});

it("preserves cycles and fits maximum text without clipping cards or splitting connectors across pages", () => {
  const figure: ResearchFigure = { ...processFigure, items: Array.from({ length: 10 }, (_, i) => ({
    ...processFigure.items[0], id: `item_${i}`, label: "Long label ".repeat(6).trim(), detail: "Detailed explanation ".repeat(8).trim(), group: "A qualified description of the participating group",
  })), edges: Array.from({ length: 10 }, (_, i) => ({ from: `item_${i}`, to: `item_${(i + 1) % 10}`, label: "documented relationship", evidence: [0] })) };
  const rendered = renderFigure(figure), boxes = nodes(rendered.svg);
  expect(rendered.svg).toContain('data-diagram-layout="relationships"');
  for (const n of boxes) {
    expect(n.x + n.width).toBeLessThanOrEqual(rendered.width);
    expect(n.y + n.height).toBeLessThan(rendered.height);
    expect(rendered.breaks.some(b => b > boxes[0].y && b < boxes.at(-1)!.y + boxes.at(-1)!.height)).toBe(false);
  }
  expect(rendered.svg).not.toMatch(/NaN|Infinity/);
  expect(rendered.svg.match(/data-from=/gu)).toHaveLength(10);
});

it("wraps long processes into a connected serpentine layout and escapes hostile visible text", () => {
  const figure: ResearchFigure = { ...processFigure,
    items: Array.from({ length: 8 }, (_, i) => ({ ...processFigure.items[0], id: `item_${i}`, label: i ? `Participant ${i}` : '<script>alert("x")</script>' })),
    edges: Array.from({ length: 7 }, (_, i) => ({ from: `item_${i}`, to: `item_${i + 1}`, label: "passes to", evidence: [0] })),
  };
  const rendered = renderFigure(figure), boxes = nodes(rendered.svg);
  expect(new Set(boxes.map(n => n.y)).size).toBe(3);
  expect(boxes[2].x).toBe(boxes[3].x);
  expect(boxes[5].x).toBe(boxes[6].x);
  expect(rendered.svg).not.toContain("<script>");
  expect(rendered.svg.match(/data-from=/gu)).toHaveLength(7);
});
