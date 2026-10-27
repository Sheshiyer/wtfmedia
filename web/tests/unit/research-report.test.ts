import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResearchContent } from "@/components/domain/beta/ResearchContent";
import { parseResearchMarkdown, prepareResearchSection } from "@/lib/research-report";
import type { ResearchBrief, ResearchSource } from "@/lib/research";
import { figureDateSupported, figureNumbers, validateFigure, type ResearchFigure } from "../../../shared/research-figures";
import { figureAccessibleText, renderFigure } from "@/lib/research-figures";

const sources: ResearchSource[] = ["src_a", "src_b", "alpha_c"].map(id => ({ id, title: id, url: `https://example.org/${id}`, excerpt: "Evidence", retrievedAt: "2026-10-21" }));

it("normalizes figure formatting without accepting unsupported signs, units or date precision", () => {
  expect(figureNumbers("pre-2012; 3–4; 90%; 1,000")).toEqual(figureNumbers("2012; 3 or 4; 90 percent; 1000"));
  expect(figureNumbers("-4")).not.toEqual(figureNumbers("4"));
  expect(figureNumbers("4%")).not.toEqual(figureNumbers("4"));
  expect(figureDateSupported("2020-03", "March 2020")).toBe(true);
  expect(figureDateSupported("2020-03", "In 2020")).toBe(false);
  expect(figureDateSupported("2020-02-30", "2020-02-30")).toBe(false);
});

it("accepts grounded undated context without inventing chronology or relaxing date evidence", () => {
  const quote = "The company started in March 2020 and expanded in June 2021. Capacity is 3 or 4 orders.";
  const evidence = [{ ...sources[0], evidenceType: "page_extract" as const, excerpt: quote }];
  const figure: ResearchFigure = { version: 2, kind: "timeline", title: "Company milestones", takeaway: "Recorded milestones.", caveat: "",
    evidence: [{ sourceId: "src_a", quote }], items: ["2020-03", "2021-06", ""].map((date, index) => ({
      id: `event_${index}`, label: "Company milestone", detail: index === 2 ? "Capacity is 3–4 orders." : "Recorded event.",
      evidence: [0], group: "", value: null, displayValue: "", date, cells: [],
    })), edges: [], columns: [], metric: { unit: "", period: "", geography: "", definition: "" } };
  expect(validateFigure(figure, evidence)).toEqual(figure);
  const rendered = renderFigure(figure);
  expect(rendered.svg).toContain("chronology not established");
  expect(rendered.svg).not.toMatch(/NaN|Infinity/);
  expect(figureAccessibleText(figure)).toContain("Undated context:");
  figure.items[0].date = "2019";
  expect(validateFigure(figure, evidence)).toBeNull();
});

describe("shared research section preparation", () => {
  it.each(["[src_a, src_b]", "[[src_a], [src_b]]", "[[src_a](https://example.org/a), [src_b](https://example.org/b)]", "[src_a, src_b](https://example.org)", "[src_a]; [src_b]", "src_a src_b"])("removes recognized citations without wrapper debris: %s", citation => {
    const result = prepareResearchSection(`Finding ${citation}. Again [src_a].`, sources);
    expect(result.markdown).toBe("Finding. Again.");
    expect(result.citedSources.map(source => source.id)).toEqual(["src_a", "src_b"]);
  });

  it("does not relabel code or rewrite a mixed linked citation's unknown target", () => {
    const content = "[src_a, src_unknown](https://example.org/unknown)\n\n```text\nUnverified: literal [src_a]\n```";
    expect(prepareResearchSection(content, sources).markdown).toBe(content.replace("src_a, ", ""));
  });

  it("preserves unknown references including their linked destinations", () => {
    const result = prepareResearchSection("A [src_a, src_unknown]. B [[src_b](https://example.org), [src_other](https://example.org/other)]. C [alpha_c].", sources);
    expect(result.markdown).toBe("A [src_unknown]. B [[src_other](https://example.org/other)]. C.");
    expect(result.citedSources.map(source => source.id)).toEqual(["src_a", "src_b", "alpha_c"]);
  });

  it.each(["", "[]", "[src_a, src_unknown]"])("preserves mixed reference-link destinations after citation cleanup: %s", suffix => {
    const result = prepareResearchSection(`[src_a, src_unknown]${suffix}\n\n[src_a, src_unknown]: https://example.org/unknown`, sources);
    expect(result.markdown).toBe("[src_unknown][src_a, src_unknown]\n\n[src_a, src_unknown]: https://example.org/unknown");
    expect(parseResearchMarkdown(result.markdown).children[0]).toMatchObject({ type: "paragraph", children: [{ type: "linkReference", identifier: "src_a, src_unknown", children: [{ value: "src_unknown" }] }] });
  });

  it("leaves brackets, code, escaped characters, normal links and unknown IDs intact", () => {
    const content = "[1, 2] [a–z] [literal] [, ] `src_a [src_b]` \\[src_a\\] src_unknown\n\n```text\n[src_a]\n```\n\n[read src_a](https://example.org/src_a) ![src_a](https://example.org/image)";
    expect(prepareResearchSection(content, sources)).toEqual({ markdown: content, citedSources: [], derivedVisual: false });
  });

  it("keeps GFM structure and normalizes legacy labels identically for the reader/export", () => {
    const result = prepareResearchSection("Unverified synthesis: Unverified: disputed [src_a].\n\n## Findings\n\n- **Bold** and *italic* [src_a]\n\n| Value | Evidence |\n| --- | --- |\n| ₹10 ~approx~ | [src_b] |\n\n[unsafe](javascript:alert)", sources);
    expect(result.markdown).toContain("Not independently confirmed: disputed.");
    expect(result.markdown).toContain("- **Bold** and *italic*");
    expect(result.markdown).toContain("| ₹10 ~approx~ | [Source 2](#research-source-src_b) |");
    expect(result.markdown).toContain("[unsafe](javascript:alert)");
    expect(result.citedSources).toHaveLength(2);
  });

  it("omits skipped sections and uses the prepared body and deduplicated references in the UI", () => {
    const brief = { revision: 1, status: "completed", sources, sections: [
      { key: "snacks", status: "skipped", content: "Do not show this stale content" },
      { key: "main", status: "completed", content: "Finding [src_a, src_b]. Again [src_a]." },
    ] } as ResearchBrief;
    const html = renderToStaticMarkup(createElement(ResearchContent, { brief }));
    expect(html).not.toContain("stale content");
    expect(html).not.toContain("Guest profile");
    expect(html).toContain("Finding. Again.");
    expect(html).toContain("2 sources");
    expect(html).not.toContain("[, ]");
  });
});

it("keeps source-only and source-plus-caveat cells linked without damaging a table", () => {
  const content = "| Event | Source / caveat |\n| --- | --- |\n| Event | [src_a] |\n| Estimate | [src_a, src_b]; includes taxes |";
  const result = prepareResearchSection(content, sources, {sourceHref: source => `#report-${source.id}`});
  expect(result.markdown).toContain("| Event | [Source 1](#report-src_a) |");
  expect(result.markdown).toContain("[Source 1](#report-src_a), [Source 2](#report-src_b); includes taxes");
  const tree = parseResearchMarkdown(result.markdown);
  expect(tree.children[0]).toMatchObject({type: "table", children: [{}, {}, {children: [{}, {children: [
    {type: "link", url: "#report-src_a"}, {type: "text", value: ", "},
    {type: "link", url: "#report-src_b"}, {type: "text", value: "; includes taxes"},
  ]}]}]});
  const brief: ResearchBrief = {id: "report", title: "Report", updatedAt: "2026-10-26", shared: false, canEdit: true,
    notes: "", episodeId: null, messages: [], progress: [], clarification: null, cost: {toolMicro: 0, modelUsd: 0},
    revision: 1, status: "completed", sources, warnings: [], sections: [
      {key: "snacks", title: "Guest profile", status: "completed", content},
    ]};
  const html = renderToStaticMarkup(createElement(ResearchContent, {brief, sourcePrefix: "report-"}));
  expect(html).toContain('href="#report-src_a"');
  expect(html).toContain('aria-label="View source:');
  expect(html).toContain("includes taxes");
});

it("uses Word source bookmarks for citations inside table cells", () => {
  const result = prepareResearchSection("| Claim | Source |\n| --- | --- |\n| Observation | [src_b] |", sources,
    {sourceHref: source => `#source_${sources.indexOf(source)}`});
  expect(result.markdown).toContain("[Source 2](#source_1)");
});


it("adds an attributed evidence map to a saved report without changing its body or inventing flow", () => {
  const retained: ResearchSource[] = sources.slice(0, 2).map((source, index) => ({ ...source,
    evidenceType: "page_extract", excerpt: index === 0
      ? "The platform receives a booking and sends the confirmed reservation to the hotel."
      : "The hotel confirms availability before accepting the reservation." }));
  const content = "Booking findings [src_a, src_b].";
  const result = prepareResearchSection(content, retained, { evidenceMap: true });
  expect(result.derivedVisual).toBe(true);
  expect(result.markdown).toContain('"kind":"evidence"');
  expect(result.markdown).toContain("not independently verified facts or an ordered process");
  expect(result.markdown).toContain(retained[0].excerpt);
  expect(content).toBe("Booking findings [src_a, src_b].");
  expect(prepareResearchSection(content, sources, { evidenceMap: true }).derivedVisual).toBe(false);
  expect(prepareResearchSection(result.markdown, retained, { evidenceMap: true }).derivedVisual).toBe(false);
});
