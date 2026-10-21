import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { buildResearchDocx } from "@/lib/research-docx";
import { RESEARCH_CHANNELS, type ResearchBrief } from "@/lib/research";

const brief: ResearchBrief = {
  id: "example", title: "भारत · ₹100 — a long research title ".repeat(8), status: "partial", revision: 99,
  updatedAt: "2026-10-21", shared: false, canEdit: true, episodeId: null, notes: "PRIVATE_NOTE_MARKER", notesApproved: false,
  messages: [{ role: "user", content: "CHAT_MARKER" }], progress: ["PROGRESS_MARKER"], warnings: ["DIAGNOSTIC_MARKER"],
  clarification: null, cost: { toolMicro: 123, modelUsd: 0.1 },
  researchInput: { guestName: "", companyName: "Example", industry: "", audienceCountry: "IN" },
  sections: [
    { key: "snacks", title: "Guest profile", status: "skipped", content: "SKIPPED_CONTENT" },
    { key: "main", title: "Industry positioning and opportunities", status: "completed", content: "## Findings\n\nUnverified: **Bold** *italic* ~~withdrawn~~ ₹100 ~estimate~ [src_web, src_youtube].\n\n3. First\n4. Second\n   - Nested\n\n| Name | Value |\n| --- | ---: |\n| A | ₹100 |\n| B | **₹200** |\n\n[Read](https://example.org/report?a=1&b=2) and [unsafe](javascript:alert).\n\n[Reference][ref]\n\n[ref]: https://example.org/reference\n\n`[src_web]`\n\n![Remote image](https://remote.example/tracker.png)" },
    { key: "desserts", title: "Takeaways and interview preparation", status: "failed", content: "Only partial findings [src_web]." },
  ],
  sources: RESEARCH_CHANNELS.map(platform => ({ id: `src_${platform}`, title: `${platform} evidence`, platform,
    url: platform === "x" ? "javascript:bad" : `https://example.org/${platform}?q=${"long".repeat(100)}`,
    excerpt: `${platform} retained excerpt`, retrievedAt: "2026-10-21", evidenceType: "page_extract" })),
  coverage: [{ channel: "web", status: "found", sourceCount: 0, method: "web_search" }, { channel: "youtube", status: "unavailable", sourceCount: 0, method: "dedicated_tool" }],
};

async function documentParts(value = brief) {
  const blob = await buildResearchDocx(value);
  expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect([...bytes.slice(0, 4)]).toEqual([80, 75, 3, 4]);
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")!.async("string");
  const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
  return { zip, xml, rels };
}

describe("real research Word export", () => {
  it("writes a genuine OOXML package with matching formatting, links, source references and local colored icons", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Export must stay local"));
    try {
      const { zip, xml, rels } = await documentParts();
      expect(xml).toContain(brief.title);
      for (const text of ["Status: partial", "Report incomplete", "Audience context: India", "Source coverage", "Results found; none retained", "Unavailable", "Not recorded", "Not independently confirmed:", "₹100", "~estimate~", "Section sources", "Sources", "web retained excerpt", "Remote image", "[src_web]"]) expect(xml).toContain(text);
      for (const text of ["SKIPPED_CONTENT", "Guest profile", "PRIVATE_NOTE_MARKER", "CHAT_MARKER", "PROGRESS_MARKER", "DIAGNOSTIC_MARKER", "Revision 99", "Run details", "Download Word", "[, ]"]) expect(xml).not.toContain(text);
      for (const tag of ["w:tbl", "w:tblHeader", "w:numPr", "w:b", "w:i", "w:strike", "w:drawing", "w:bookmarkStart", "w:hyperlink"]) expect(xml).toContain(`<${tag}`);
      expect(xml).toContain('w:anchor="source_0"');
      expect(xml.indexOf("Findings")).toBeLessThan(xml.indexOf("Takeaways and interview preparation"));
      expect(xml.indexOf("Takeaways and interview preparation")).toBeLessThan(xml.indexOf("web retained excerpt"));
      expect(rels).toContain("https://example.org/report?a=1&amp;b=2");
      expect(rels).toContain("https://example.org/reference");
      expect(rels).not.toContain("javascript:");
      expect(rels).not.toContain("remote.example");
      expect(Object.keys(zip.files).filter(path => /^word\/media\/.+\.png$/u.test(path))).toHaveLength(6);
      const numbering = await zip.file("word/numbering.xml")!.async("string");
      expect(numbering).toContain('w:start w:val="3"');
      expect(numbering).toContain('w:numFmt w:val="bullet"');
      expect(fetcher).not.toHaveBeenCalled();
    } finally { fetcher.mockRestore(); }
  });

  it("keeps completed applicable scope complete and preserves a large table", async () => {
    const rows = Array.from({ length: 150 }, (_, i) => `| Row ${i} | Value ${i} |`).join("\n");
    const value = { ...brief, status: "completed" as const, sections: [brief.sections[0], { ...brief.sections[1], content: `| Name | Value |\n| --- | --- |\n${rows}` }] };
    const before = JSON.stringify(value);
    const { xml } = await documentParts(value);
    expect(xml).not.toContain("Report incomplete");
    expect(xml).not.toContain("skipped");
    expect(xml).toContain("Value 149");
    expect((xml.match(/<w:tr>/gu) ?? []).length).toBeGreaterThanOrEqual(151);
    expect(JSON.stringify(value)).toBe(before);
  });
});
