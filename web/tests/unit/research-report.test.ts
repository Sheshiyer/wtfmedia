import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResearchContent } from "@/components/domain/beta/ResearchContent";
import { parseResearchMarkdown, prepareResearchSection } from "@/lib/research-report";
import type { ResearchBrief, ResearchSource } from "@/lib/research";

const sources: ResearchSource[] = ["src_a", "src_b", "alpha_c"].map(id => ({ id, title: id, url: `https://example.org/${id}`, excerpt: "Evidence", retrievedAt: "2026-10-21" }));

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
    expect(prepareResearchSection(content, sources)).toEqual({ markdown: content, citedSources: [] });
  });

  it("keeps GFM structure and normalizes legacy labels identically for the reader/export", () => {
    const result = prepareResearchSection("Unverified synthesis: Unverified: disputed [src_a].\n\n## Findings\n\n- **Bold** and *italic* [src_a]\n\n| Value | Evidence |\n| --- | --- |\n| ₹10 ~approx~ | [src_b] |\n\n[unsafe](javascript:alert)", sources);
    expect(result.markdown).toContain("Not independently confirmed: disputed.");
    expect(result.markdown).toContain("- **Bold** and *italic*");
    expect(result.markdown).toContain("| ₹10 ~approx~ | |");
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
