import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResearchContent, ResearchMarkdown, ResearchSources } from "@/components/domain/beta/ResearchContent";
import { ResearchCoverageSummary } from "@/components/domain/beta/ResearchSourceBadge";
import { parseResearchBrief, parseResearchInput, researchDraft, researchMarkdown, researchTitle, type ResearchBrief } from "@/lib/research";

const legacy: ResearchBrief = {
  id: "rb_contract", title: "Guest research", status: "completed", revision: 1,
  updatedAt: "2026-10-20T10:00:00Z", notes: "Private", episodeId: null, shared: false, canEdit: true,
  sections: [{ key: "snacks", title: "Guest", content: "Unverified synthesis: A disputed claim [src_one].", status: "completed" }],
  sources: [{ id: "src_one", title: "Public interview", publisher: "Example News", url: "https://example.com/interview", excerpt: "A claim", retrievedAt: "2026-10-20" }],
  messages: [], progress: [], warnings: [], clarification: null, cost: { toolMicro: 12, modelUsd: null },
};
const researchInput = { guestName: "  दीपा मेहता  ", companyName: "Example Company", industry: "Film production", audienceCountry: "IN" };
const v2 = { ...legacy, schemaVersion: 2, researchInput,
  coverage: [{ channel: "web", status: "found", sourceCount: 1, method: "web_search" }],
  modelInfo: { service: "omniroute", requestedModel: "research-route" },
  failure: { stage: "desserts", code: "output_truncated", retryable: true },
};

it("does not split an emoji at the derived title's UTF-16 length limit", () => {
  const input = parseResearchInput({ guestName: "G".repeat(120), companyName: `${"C".repeat(76)}😀`, industry: "Media", audienceCountry: "IN" });
  const title = researchTitle(input);
  expect(title).toBe(`${"G".repeat(120)} · ${"C".repeat(76)}`);
  expect(title.length).toBe(199);
  expect(researchTitle({ ...input, companyName: `${"C".repeat(75)}😀` })).toBe(`${"G".repeat(120)} · ${"C".repeat(75)}😀`);
});

describe("bounded research metadata", () => {
  it("retains legacy briefs and persists trimmed structured fields in editable drafts", () => {
    expect(parseResearchBrief(legacy)).toEqual(legacy);
    const parsed = parseResearchBrief(v2);
    expect(researchDraft(parsed)).toMatchObject({ researchInput: { ...researchInput, guestName: "दीपा मेहता" } });
  });
  it.each([
    { schemaVersion: 3 }, { researchInput: { ...researchInput, guestName: " " } },
    { researchInput: { ...researchInput, companyName: "x".repeat(121) } },
    { researchInput: { ...researchInput, industry: "x" } },
    { researchInput: { ...researchInput, audienceCountry: "US" } },
    { researchInput: null }, { researchInput: { guestName: "Guest" } },
    { coverage: Array(7).fill(v2.coverage[0]) },
    { coverage: [{ ...v2.coverage[0], sourceCount: Number.MAX_SAFE_INTEGER + 1 }] },
    { coverage: [{ ...v2.coverage[0], sourceCount: -1 }] },
    { coverage: [{ ...v2.coverage[0], sourceCount: 0.1 }] },
    { coverage: [{ ...v2.coverage[0], channel: "private" }] },
    { coverage: [{ ...v2.coverage[0], status: "complete" }] },
    { coverage: [{ ...v2.coverage[0], method: "scrape" }] },
    { modelInfo: { service: "guessed", requestedModel: "model" } },
    { modelInfo: { service: "omniroute", requestedModel: "x".repeat(121) } },
    { modelInfo: { service: "openrouter", requestedModel: "route", reportedModel: 42 } },
    { failure: { stage: "secret-detail", code: "timeout", retryable: true } },
    { failure: { stage: "main", code: "raw-error", retryable: true } },
    { failure: { stage: "main", code: "timeout", retryable: "yes" } },
    { sections: [{ ...legacy.sections[0], failure: { stage: "snacks", code: "secret", retryable: false } }] },
    { sources: [{ ...legacy.sources[0], platform: "unknown" }] },
    { sources: [{ ...legacy.sources[0], retrievedVia: "platform.publish" }] },
    { sources: [{ ...legacy.sources[0], evidenceType: "guess" }] },
  ])("rejects malformed optional metadata without replacing an editable draft: %j", patch => {
    expect(() => parseResearchBrief({ ...legacy, ...patch })).toThrow("Your edits have been kept");
  });
  it("exports audience, model route and readable citation attribution without guessing billing or stripping uncertainty", () => {
    const exported = researchMarkdown(parseResearchBrief(v2));
    expect(exported).toContain("Audience context: India");
    expect(exported).toContain("research-route");
    expect(exported).toContain("Cost not reported by provider");
    expect(exported).toContain("[Example News](https://example.com/interview)");
    expect(exported).toContain("Unverified synthesis:");
    expect(exported).not.toContain("Private");
  });
});

it("hides empty report shells while clarification is needed", () => {
  const html = renderToStaticMarkup(createElement(ResearchContent, { brief: { ...legacy, status: "clarification", sections: [], sources: [], clarification: "Which person?" } }));
  expect(html).not.toContain("No findings yet");
  expect(html).not.toContain("Guest profile");
  expect(html).not.toContain("Sources · 0");
});
it("uses readable citations and preserves uncertainty in old prose", () => {
  const html = renderToStaticMarkup(createElement(ResearchMarkdown, { sources: legacy.sources, content: legacy.sections[0].content }));
  expect(html).toContain("Example News");
  expect(html).toContain("Review against sources: A disputed claim");
  expect(html).not.toContain("Unverified synthesis:");
  expect(legacy.sections[0].content).toBe("Unverified synthesis: A disputed claim [src_one].");
  expect(html).not.toContain(">1</a>");
});
it("groups only each section's cited sources into a collapsed icon row", () => {
  const brief: ResearchBrief = { ...legacy, sources: [
    ...legacy.sources,
    { ...legacy.sources[0], id: "src_two", title: "Public discussion", publisher: "Reddit", url: "https://reddit.com/r/example" },
    { ...legacy.sources[0], id: "src_unused", title: "Uncited source" },
  ], sections: [
    { ...legacy.sections[0], content: "Background [src_one].\n\nCareer [src_one] [src_two]. Unknown [src_missing]." },
    { key: "desserts", title: "Takeaways", status: "completed", content: "Outlook [src_two]." },
  ] };
  const html = renderToStaticMarkup(createElement(ResearchContent, { brief }));
  const sections = html.split('<section ').slice(2);
  const guest = sections[0].split("</section>")[0];
  const takeaways = sections[1].split("</section>")[0];
  expect(guest).toContain("<p>Background.</p>");
  expect(guest).toContain("Unknown [src_missing].");
  expect(guest).toContain('aria-label="Guest profile sources"');
  expect(guest).toContain("2 sources");
  expect(guest).toContain('aria-label="Web"');
  expect(guest).toContain('aria-label="Reddit"');
  expect((guest.match(/href="#research-version-1-source-src_one"/gu) ?? []).length).toBe(1);
  expect((guest.match(/href="#research-version-1-source-src_two"/gu) ?? []).length).toBe(1);
  expect(guest).not.toContain("src_unused");
  expect(guest).not.toContain('open="');
  expect(takeaways).toContain("1 source");
  expect(takeaways).not.toContain("src_one");
  expect(brief.sections[0].content).toContain("[src_one]");
});

it("omits the section citation row when no known sources are cited", () => {
  const html = renderToStaticMarkup(createElement(ResearchContent, { brief: {
    ...legacy, sections: [{ ...legacy.sections[0], content: "No cited evidence [src_missing]." }],
  } }));
  expect(html).not.toContain('aria-label="Guest profile sources"');
  expect(html).toContain("[src_missing]");
});

it("labels snippet evidence and keeps nested sources collapsed", () => {
  const b = parseResearchBrief({ ...legacy, sources: [{ ...legacy.sources[0], platform: "reddit", evidenceType: "search_snippet", retrievedVia: "perplexity.web.search" }] });
  const html = renderToStaticMarkup(createElement(ResearchSources, { sources: b.sources }));
  expect(html).toContain("Search snippet"); expect(html).toContain("Reddit");
  expect(html).not.toContain('open="');
});

it.each(["anyapi.linkedin.search.posts", "youtube.youtube.search.videos", "anyapi.instagram.hashtag.posts", "scrapecreators.reddit.search.posts", "anyapi.x.search.posts", "perplexity.web.search", "exa.web.contents.get"])("accepts catalogued read-only retrieval tool %s", retrievedVia => {
  const value = { ...legacy, sources: [{ ...legacy.sources[0], retrievedVia }] };
  expect(parseResearchBrief(value).sources[0]).toHaveProperty("retrievedVia", retrievedVia);
});
it("shows recorded coverage outcomes without inventing legacy channel searches", () => {
  const html = renderToStaticMarkup(createElement(ResearchContent, { brief: parseResearchBrief({ ...v2, coverage: [
    ...v2.coverage, { channel: "reddit", status: "budget_limited", sourceCount: 0, method: "web_search" },
  ] }) }));
  expect(html).toContain("Budget limited"); expect(html).toContain("Not recorded");
  expect(html).toContain("Web search"); expect(html).toContain("1 retained source");
});
it.each([0, 1, 2])("labels %i retained sources independently of the recorded found status", sourceCount => {
  const coverage = [{ channel: "web", status: "found", sourceCount, method: "web_search" }] as const;
  const html = renderToStaticMarkup(createElement(ResearchCoverageSummary, { coverage: [...coverage] }));
  const count = `${sourceCount} retained ${sourceCount === 1 ? "source" : "sources"}`;
  expect(html).toContain(count);
  expect(html).toContain(sourceCount ? ">Found<" : ">Results found; none retained<");
  expect(html).not.toContain("No results");
  expect(researchMarkdown({ ...legacy, coverage: [...coverage] })).toContain(`Web: found · ${count}`);
});
it.each([
  ["https://www.youtube.com/watch?v=example", "YouTube"],
  ["https://youtube.com.example.org/a", "Web"],
  ["https://example.org/?site=reddit.com", "Web"],
  ["https://www.linkedin.com/posts/a", "LinkedIn"],
])("infers legacy source platform from host boundaries: %s", (url, label) => {
  const html = renderToStaticMarkup(createElement(ResearchSources, { sources: [{ ...legacy.sources[0], url }] }));
  expect(html).toContain(`aria-label="${label}"`);
});
it("does not add empty coverage panels to a clarification-only document", () => {
  const html = renderToStaticMarkup(createElement(ResearchContent, { brief: { ...legacy, status: "clarification", sections: [], sources: [], clarification: "Which person?" } }));
  expect(html).not.toContain("Source coverage");
});
it("rejects non-string optional publisher metadata before rendering source labels", () => {
  expect(() => parseResearchBrief({ ...legacy, sources: [{ ...legacy.sources[0], publisher: {} }] })).toThrow("Your edits have been kept");
});

it("does not relabel caution inside source excerpts or change their links", () => {
  const sources = [{ ...legacy.sources[0], excerpt: "Unverified synthesis: quoted source wording" }];
  const html = renderToStaticMarkup(createElement(ResearchSources, { sources }));
  expect(html).toContain("Unverified synthesis: quoted source wording");
  expect(html).toContain('href="https://example.com/interview"');
});

it.each([null, "true", 1, {}])("rejects malformed server-controlled needsResearch: %j", needsResearch => {
  expect(() => parseResearchBrief({ ...legacy, needsResearch })).toThrow("Your edits have been kept");
});
it.each([true, false])("reads needsResearch=%s without including it in editable payloads", needsResearch => {
  const receipt = parseResearchBrief({ ...legacy, needsResearch });
  expect(receipt).toHaveProperty("needsResearch", needsResearch);
  expect(researchDraft(receipt)).not.toHaveProperty("needsResearch");
});
it("labels an exported stale report without changing its retained claims or sources", () => {
  const exported = researchMarkdown(parseResearchBrief({ ...legacy, needsResearch: true }));
  expect(exported).toContain("Previous report no longer matches the edited inputs");
  expect(exported).toContain("Unverified synthesis: A disputed claim");
  expect(exported).toContain("https://example.com/interview");
});
it.each([
  ["https://www.youtube-nocookie.com/embed/example", "YouTube"],
  ["https://www.youtube.com./watch?v=example", "YouTube"],
  ["https://redd.it./abc123", "Reddit"],
  ["https://youtube-nocookie.com.example.org/a", "Web"],
])("matches Edge legacy platform classification: %s", (url, label) => {
  const html = renderToStaticMarkup(createElement(ResearchSources, { sources: [{ ...legacy.sources[0], url }] }));
  expect(html).toContain(`aria-label="${label}"`);
});
it.each(["queued", "running", "cancel_pending"] as const)("does not export stale costs during %s", status => {
  const exported = researchMarkdown({ ...legacy, status, cost: { toolMicro: 5000, modelUsd: 0 } });
  expect(exported).not.toContain("Model cost: $0");
  expect(exported).not.toContain("Tool cost (recorded or reserved):");
  expect(exported).toContain("Costs will be shown after the run stops.");
});


it("loads every retained source and explains precise failure metadata", () => {
  const sources = Array.from({ length: 125 }, (_, i) => ({ ...legacy.sources[0], id: `s${i}`, url: `https://example.com/${i}` }));
  const brief = parseResearchBrief({ ...v2, sources, coverage: [{ channel: "web", status: "found", sourceCount: 125, method: "web_search" }],
    failure: { stage: "main", code: "provider_unavailable", retryable: true, reason: "http_error", provider: "omniroute", operation: "model", httpStatus: 503 } });
  expect(brief.sources).toHaveLength(125);
  expect(researchMarkdown(brief)).toContain("HTTP 503 (omniroute / model)");
  expect(() => parseResearchBrief({ ...brief, failure: { ...brief.failure, reason: "PRIVATE" } })).toThrow();
});
