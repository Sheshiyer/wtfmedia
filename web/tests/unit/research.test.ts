import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResearchMarkdown, ResearchSources } from "@/components/domain/beta/ResearchContent";
import { capabilityForPath, principalCanAccess, type PrincipalContext } from "@/lib/beta/principal";
import { betaDestinationForPath } from "@/lib/beta/navigation";
import {
  applyResearchReceipt, researchDraft, researchIsRunning, researchMarkdown,
  readResearchImport, safeResearchUrl, researchRequest, parseResearchBrief, researchDraftChanged, type ResearchBrief,
} from "@/lib/research";

export const brief: ResearchBrief = {
  id: "rb_example", title: "Guest research", status: "draft", revision: 1,
  updatedAt: "2026-10-13T10:00:00Z", notes: "", episodeId: null, shared: false, canEdit: true,
  sections: [{ key: "snacks", title: "Snacks", content: "Background", status: "completed" }],
  sources: [{ id: "s1", title: "Interview", url: "https://example.com/interview", excerpt: "Evidence", retrievedAt: "2026-10-13" }],
  messages: [], progress: [], warnings: [], clarification: null, cost: { toolMicro: 1234, modelUsd: null },
};

describe("Research frontend", () => {
  it("times out a stalled read even if session acquisition ignores abort", async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | null | undefined;
      const pending = researchRequest((_input, init) => {
        signal = init?.signal;
        return new Promise<Response>(() => {});
      }, "/example");
      const assertion = expect(pending).rejects.toThrow("Loading research took too long");
      await vi.advanceTimersByTimeAsync(30000);
      await assertion;
      expect(signal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it("maps research to server-granted capabilities for both principal kinds", () => {
    expect(betaDestinationForPath("/beta/research")?.capability).toBe("research:read");
    expect(capabilityForPath("/beta/research")).toBe("research:read");
    for (const role of ["member", "editor", "admin", "super_admin"] as const) {
      const principal: PrincipalContext = { kind: role === "member" ? "member" : "operator", role, email: "person@example.test", canonicalLanding: "/beta/chat", capabilities: ["research:read"], environment: "local" };
      expect(principalCanAccess(principal, "/beta/research")).toBe(true);
      expect(principalCanAccess({ ...principal, capabilities: [] }, "/beta/research")).toBe(false);
      expect(principalCanAccess(principal, "/beta/research-other")).toBe(false);
    }
  });

  it("preserves unsaved edits and their base revision during polling", () => {
    const draft = { ...researchDraft(brief), title: "Unsaved title", notes: "Private notes" };
    const receipt = { ...brief, revision: 2, status: "running" as const };
    const next = applyResearchReceipt({ brief, draft }, receipt);
    expect(next.brief).toEqual(receipt);
    expect(next.draft).toEqual(draft);
    expect(next.draft.revision).toBe(1);
  });

  it("updates untouched drafts, ignores old receipts and rejects cross-brief data", () => {
    const state = { brief, draft: researchDraft(brief) };
    const next = applyResearchReceipt(state, { ...brief, revision: 2, title: "Updated" });
    expect(next.draft.title).toBe("Updated");
    expect(applyResearchReceipt(next, brief)).toBe(next);
    expect(applyResearchReceipt(state, { ...brief, id: "someone-else" })).toBe(state);
  });

  it("polls only active jobs", () => {
    for (const status of ["draft", "completed", "partial", "failed", "cancelled", "clarification", "deleting", "cancel_pending"] as const) expect(researchIsRunning(status)).toBe(false);
    expect(researchIsRunning("queued")).toBe(true);
    expect(researchIsRunning("running")).toBe(true);
  });

  it("only permits absolute http(s) evidence links", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,test", "//evil.test", "/beta", "file:///tmp/test"]) expect(safeResearchUrl(url)).toBeNull();
    expect(safeResearchUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("bounds note imports by bytes and characters and rejects binary content", async () => {
    const file = (name: string, text: string, size = text.length) => ({ name, size, text: async () => text });
    expect(await readResearchImport(file("notes.md", "# Notes"))).toBe("# Notes");
    await expect(readResearchImport(file("notes.pdf", "text"))).rejects.toThrow(".txt or .md");
    await expect(readResearchImport(file("notes.txt", "text", 65537))).rejects.toThrow("64 KB");
    await expect(readResearchImport(file("notes.txt", "a".repeat(12001)))).rejects.toThrow("12,000");
    await expect(readResearchImport(file("notes.txt", "a\u0000b"))).rejects.toThrow("plain text");
  });

  it("exports sources and warnings without including private notes", () => {
    const text = researchMarkdown({ ...brief, notes: "SECRET NOTE", warnings: ["One track failed"], sources: [...brief.sources, { ...brief.sources[0], id: "bad", url: "javascript:evil" }] });
    expect(text).toContain("Background"); expect(text).toContain("https://example.com/interview");
    expect(text).toContain("One track failed"); expect(text).not.toContain("SECRET NOTE"); expect(text).not.toContain("javascript:");
  });

  it("sends mutations once and translates unavailable and revision errors", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "research_not_configured" }), { status: 503 }));
    await expect(researchRequest(fetcher, "", { method: "POST", body: { title: "Guest" } })).rejects.toThrow("Research is currently unavailable");
    expect(fetcher).toHaveBeenCalledOnce();
    fetcher.mockResolvedValue(new Response(JSON.stringify({ error: "revision_conflict" }), { status: 409 }));
    await expect(researchRequest(fetcher, "/rb_example", { method: "PATCH", body: { revision: 1 } })).rejects.toThrow("Your edits have been kept");
  });

  it("keeps consent in the editable revision and respects persisted consent", () => {
    const draft = researchDraft(brief);
    expect(draft.notesApproved).toBe(false);
    expect(researchDraftChanged({ ...draft, notesApproved: true }, brief)).toBe(true);
    expect(researchDraft({ ...brief, notesApproved: true }).notesApproved).toBe(true);
  });

  it.each([
    ["research_chat_limit", "This brief has reached its follow-up limit."],
    ["research_deletion_pending", "Deletion is pending. Editing and research are disabled; retry deletion to finish removing this brief."],
    ["research_running", "Research is already running. Wait for it to finish or cancel the run before making changes."],
    ["research_not_ready", "This brief is not ready for follow-up questions. Wait for research to finish and return findings."],
    ["research_conflict", "This brief changed since you opened it. Your edits have been kept. Review the latest saved version before saving again."],
    ["revision_conflict", "This brief changed since you opened it. Your edits have been kept. Review the latest saved version before saving again."],
    ["unknown_conflict", "Research could not complete that request. Please try again."],
  ])("explains %s without misclassifying it as a revision conflict", async (code, message) => {
    const fetcher = async () => Response.json({ error: code }, { status: 409 });
    await expect(researchRequest(fetcher, "/rbrief_example", { method: "PATCH", body: { revision: 1 } }))
      .rejects.toMatchObject({ message, status: 409, code });
  });

  it("serializes four maximum-length astral Unicode sections without truncation", async () => {
    const content = "\u{1F30D}".repeat(12000);
    expect(content.length).toBe(24000);
    const sections = (["snacks", "appetizers", "main", "desserts"] as const).map(key => ({ key, title: key, content, status: "completed" }));
    const body = { ...researchDraft(brief), sections };
    let sent = "";
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => { sent = String(init?.body); return Response.json({ brief }); };
    await researchRequest(fetcher, "/rbrief_example", { method: "PATCH", body });
    expect(new TextEncoder().encode(sent).length).toBeGreaterThan(150000);
    expect(JSON.parse(sent)).toEqual(body);
  });

  it("sends JSON for every mutation including empty cancel and DELETE requests", async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => { calls.push({ path: String(input), init }); return Response.json({ deleted: true }); };
    for (const [suffix, method] of [["/cancel", "POST"], ["", "DELETE"], ["", "PATCH"], ["/restore", "POST"]]) await researchRequest(fetcher, `/rbrief_example${suffix}`, { method });
    expect(calls.map(call => call.path)).toEqual(["/beta/api/research/rbrief_example/cancel", "/beta/api/research/rbrief_example", "/beta/api/research/rbrief_example", "/beta/api/research/rbrief_example/restore"]);
    for (const call of calls) { expect(new Headers(call.init?.headers).get("content-type")).toBe("application/json"); expect(call.init?.body).toBe("{}"); }
  });

  it("preserves creation context and optimistic revisions through the caller", async () => {
    let sent: unknown;
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => { sent = JSON.parse(String(init?.body)); return Response.json({ brief }); };
    const context = { title: "Guest", notes: "Approved notes", notesApproved: true, episodeId: "abcdefghijk" };
    await researchRequest(fetcher, "", { method: "POST", body: context }); expect(sent).toEqual(context);
    await researchRequest(fetcher, "/rbrief_example/restore", { method: "POST", body: { revision: 4, version: 2 } }); expect(sent).toEqual({ revision: 4, version: 2 });
  });

  it("anchors only actual source identifiers and never fabricates source links", () => {
    const sources = [{ ...brief.sources[0], id: "src_a" }, { ...brief.sources[0], id: "alpha_b" }];
    const html = renderToStaticMarkup(createElement(ResearchMarkdown, { content: "Evidence [src_a] and [alpha_b]; unavailable [src_missing]. [unsafe](javascript:alert).", sources }));
    expect(html).toContain('href="#research-source-src_a"'); expect(html).toContain('href="#research-source-alpha_b"');
    expect(html).not.toContain('href="#research-source-src_missing"'); expect(html).not.toContain("javascript:");
    const list = renderToStaticMarkup(createElement(ResearchSources, { sources }));
    expect(list).toContain('<details aria-label="Research sources"');
    expect(list).toContain("Sources · 2</summary>");
    expect((list.match(/<details[ >]/gu) ?? []).length).toBe(3);
    expect(list).toContain("Open original source");
    expect(list).not.toContain('open="');
    expect(list).toContain('id="research-source-src_a"'); expect(list).toContain('id="research-source-alpha_b"');
  });

  it("renders readable citations and scrollable evidence inside an expandable audit", () => {
    const sources = [{ ...brief.sources[0], id: "src_a" }];
    const html = renderToStaticMarkup(createElement(ResearchMarkdown, { sources,
      content: "Finding [src_a].\n\n**Numeric evidence comparisons**\n\n| Source | Value |\n| --- | --- |\n| src_a | 12 |" }));
    expect(html).toContain("Check numeric evidence");
    expect(html).toContain("<details");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain('aria-label="Research evidence table"');
    expect(html).not.toContain(">src_a<");
    expect(html).toContain("View source: Interview");
    expect(html).not.toContain(">1</a>");
  });

  it("relabels legacy caution without removing specific uncertainty", () => {
    const html = renderToStaticMarkup(createElement(ResearchMarkdown, { sources: [], content: "Unverified synthesis: # Background\n\nUnverified synthesis: Unverified: sources disagree." }));
    expect(html).toContain("Review against sources:");
    expect(html).not.toContain("Unverified synthesis:");
    expect(html).toContain("Not independently confirmed: sources disagree.");
    expect(html).toContain("Background");
  });

  it("labels Alpha references without inventing transcript excerpts or timestamps", () => {
    const source = { ...brief.sources[0], kind: "alpha_reference", excerpt: "" };
    const html = renderToStaticMarkup(createElement(ResearchSources, { sources: [source] }));
    expect(html).toContain("Episode reference, transcript excerpt unavailable."); expect(html).not.toContain("Source timestamp:");
    const timed = renderToStaticMarkup(createElement(ResearchSources, { sources: [{ ...source, timestampSeconds: 65 }] })); expect(timed).toContain("1:05");
  });

  it("rejects incomplete receipts without trusting them as saved edits", () => {
    expect(() => parseResearchBrief({ ...brief, sections: null })).toThrow("Your edits have been kept");
    expect(parseResearchBrief({ ...brief, status: "deleting" }).status).toBe("deleting");
    expect(parseResearchBrief({ ...brief, status: "cancel_pending" }).status).toBe("cancel_pending");
    expect(parseResearchBrief({ ...brief, canEdit: false }).canEdit).toBe(false);
  });
});
