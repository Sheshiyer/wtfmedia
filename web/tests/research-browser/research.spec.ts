import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import type { ResearchBrief } from "../../lib/research";
import { figureSource, processFigure } from "../fixtures/research-figure-fixtures";
import type { ResearchFigure } from "../../lib/research-figures";
const input = { guestName: "Example Guest", companyName: "Example Company", industry: "Film production", audienceCountry: "IN" as const };
const saved: ResearchBrief = {
  id: "rb_fixture", title: "Example Guest · Example Company", revision: 2, status: "completed", updatedAt: "2026-10-20T10:00:00Z",
  schemaVersion: 2, researchInput: input, notes: "", notesApproved: false, episodeId: null, shared: false, canEdit: true,
  sections: [{ key: "snacks", title: "Guest profile", content: "Unverified synthesis: A reported finding [src_one].\n\n| Metric | Context |\n| --- | --- |\n| Revenue | " + "Wide evidence ".repeat(40) + " |", status: "completed" }],
  sources: [{ id: "src_one", title: "Public interview", publisher: "Example News", url: "https://example.com/interview", excerpt: "Retained evidence", retrievedAt: "2026-10-20", platform: "web", evidenceType: "search_snippet" }],
  messages: [], progress: [], warnings: [], clarification: null, cost: { toolMicro: 20, modelUsd: null },
  modelInfo: { service: "omniroute", requestedModel: "research-route" },
  coverage: [{ channel: "web", status: "found", sourceCount: 1, method: "web_search" }, { channel: "reddit", status: "unavailable", sourceCount: 0, method: "web_search" }],
};
async function open(page: Page, brief = saved) {
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("**/beta/api/research", route => route.fulfill({ json: { configured: true, briefs: [brief] } }));
  await page.route("**/beta/api/research/rb_fixture", route => route.fulfill({ json: { brief, versions: [{ revision: 2, createdAt: brief.updatedAt }] } }));
  await page.goto("/");
  await page.getByRole("button", { name: /^Example Guest · Example Company/ }).click();
  await expect(page.getByRole("article", { name: "Research brief" })).toBeVisible();
}

test("editorial figure fits the page, enlarges accessibly and exports an intact PNG", async ({ page }, testInfo) => {
  const brief: ResearchBrief = { ...saved, sources: [figureSource],
    sections: [{ key: "snacks", title: "Payment process", content: "An illustrative process.", status: "completed" }],
    figures: [{ id: "fig_snacks_1", section: "snacks", goal: "Explain the payment request", preferredKind: "flow", status: "ready", attempts: 1, figure: processFigure }],
  };
  await open(page, brief);
  const figure = page.locator("#fig_snacks_1"), image = figure.locator("img").first();
  await expect(image).toBeVisible();
  expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await figure.screenshot({ path: testInfo.outputPath("editorial-process.png") });
  const enlarge = figure.getByRole("button", { name: "Enlarge visual" });
  await enlarge.click();
  const dialog = page.getByRole("dialog", { name: processFigure.title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close visual" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(enlarge).toBeFocused();
  await figure.getByText("Read explanation and sources", { exact: true }).click();
  await expect(figure.getByRole("link", { name: figureSource.title })).toBeVisible();
  // Exercise the actual browser canvas export, without fetching evidence or invoking a model.
  const moduleUrl = `/@fs/${process.cwd()}/lib/research-figures.ts`;
  const pages = await page.evaluate(async ({ moduleUrl, figure }) => {
    const { figurePngPages } = await import(/* @vite-ignore */ moduleUrl);
    const output: { data: Uint8Array; width: number; height: number }[] = await figurePngPages(figure);
    return output.map(p => ({ width: p.width, height: p.height, magic: Array.from(p.data.slice(0, 8)) }));
  }, { moduleUrl, figure: processFigure });
  expect(pages).toHaveLength(1);
  expect(pages[0].magic).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(pages[0].width).toBeLessThanOrEqual(600);
  expect(pages[0].height).toBeLessThanOrEqual(660);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word", exact: true }).click();
  const download = await downloading;
  const archive = await JSZip.loadAsync(await readFile((await download.path())!));
  const documentXml = await archive.file("word/document.xml")!.async("string");
  expect(documentXml).toContain(processFigure.title);
  expect(Object.keys(archive.files).some(name => /^word\/media\/.+\.png$/u.test(name))).toBe(true);
  for (const [, width, height] of documentXml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/gu)) {
    expect(Number(width)).toBeLessThanOrEqual(600 * 9525);
    expect(Number(height)).toBeLessThanOrEqual(660 * 9525);
  }
});

test("editorial figure layouts keep long labels inside cards and preserve complete print diagrams", async ({ page }, testInfo) => {
  await open(page);
  const comparison: ResearchFigure = { ...processFigure, kind: "comparison", title: "Compare responsibilities", edges: [], columns: ["Responsibility", "Boundary"],
    items: processFigure.items.slice(1, 3).map(i => ({ ...i, cells: [i.detail, "Authorization only; settlement is outside this example."] })),
  };
  const map: ResearchFigure = { ...processFigure, kind: "ecosystem", title: "A branching relationship map", edges: [
    { from: "customer", to: "merchant", label: "one path", evidence: [0] },
    { from: "customer", to: "network", label: "another path", evidence: [0] },
    { from: "merchant", to: "bank", label: "connects", evidence: [0] },
    { from: "network", to: "bank", label: "connects", evidence: [0] },
  ] };
  const long: ResearchFigure = { ...processFigure, title: "Long labels remain complete", items: Array.from({ length: 10 }, (_, i) => ({
    ...processFigure.items[0], id: `item_${i}`, label: "A long qualified participant label that must remain readable",
    detail: "A detailed explanation of the documented relationship, including qualifications and limitations that must remain visible rather than being clipped or silently removed.",
    group: "Documented participant in the illustrative example",
  })), edges: Array.from({ length: 10 }, (_, i) => ({ from: `item_${i}`, to: `item_${(i + 1) % 10}`, label: "documented relationship", evidence: [0] })) };
  const moduleUrl = `/@fs/${process.cwd()}/lib/research-figures.ts`;
  const result = await page.evaluate(async ({ moduleUrl, figures }) => {
    const { renderFigure, figurePngPages } = await import(/* @vite-ignore */ moduleUrl);
    const failures: string[] = [], pages: { width: number; height: number }[] = [];
    const gallery = document.createElement("div"); gallery.id = "figure-qa-gallery"; gallery.style.cssText = "position:absolute;top:0;left:0;background:white;width:1120px;z-index:100"; document.body.append(gallery);
    for (const figure of figures) {
      const rendered = renderFigure(figure);
      const svg = new DOMParser().parseFromString(rendered.svg, "image/svg+xml").documentElement as unknown as SVGSVGElement;
      gallery.append(svg);
      for (const text of svg.querySelectorAll("text")) {
        const b = text.getBBox();
        if (b.x < 0 || b.y < 0 || b.x + b.width > rendered.width || b.y + b.height > rendered.height) failures.push(`${figure.title}: page overflow`);
      }
      for (const card of svg.querySelectorAll("[data-node], [data-comparison]")) {
        const rect = card.querySelector("rect")!.getBBox();
        const texts = Array.from(card.querySelectorAll("text")).map(t => t.getBBox());
        for (const b of texts) if (b.x < rect.x || b.y < rect.y || b.x + b.width > rect.x + rect.width || b.y + b.height > rect.y + rect.height) failures.push(`${figure.title}: card overflow`);
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) failures.push(`${figure.title}: overlapping text`);
        }
      }
      const exported = await figurePngPages(figure);
      pages.push(...exported.map((p: { width: number; height: number }) => ({ width: p.width, height: p.height })));
    }
    return { failures, pages };
  }, { moduleUrl, figures: [map, comparison, long] });
  expect(result.failures).toEqual([]);
  expect(result.pages.length).toBeGreaterThanOrEqual(3);
  for (const p of result.pages) { expect(p.width).toBeLessThanOrEqual(600); expect(p.height).toBeLessThanOrEqual(660); }
  await page.locator("#figure-qa-gallery svg").nth(0).screenshot({ path: testInfo.outputPath("editorial-map.png") });
  await page.locator("#figure-qa-gallery svg").nth(1).screenshot({ path: testInfo.outputPath("editorial-comparison.png") });
});

test("reader has Word export and section sources without removed controls", async ({ page }) => {
  await open(page);
  for (const label of ["Research again", "Reload saved brief", "Delete research", "Download Markdown", "Edit brief", "Version history", "Run details and limitations"]) await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download Word", exact: true })).toBeVisible();
  await page.getByLabel("Guest profile sources", { exact: true }).locator("summary").click();
  const citation = page.getByRole("link", { name: /View source: Example News/ }).first();
  await citation.focus(); await page.keyboard.press("Enter");
  const sources = page.getByLabel("Research sources", { exact: true });
  await expect(sources).toHaveAttribute("open", "");
  await expect(sources.locator("li details")).toHaveAttribute("open", "");
  await expect(sources.locator("li summary")).toBeFocused();
  await expect(page.getByText("Retained evidence", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const field of ["Guest name", "Company name", "Industry"]) {
  test(`starts with only ${field} and uses Additional info without checkbox`, async ({ page }) => {
    await open(page);
    const form = page.getByRole("form", { name: "New research" });
    await form.getByLabel(field, { exact: true }).fill("  Selected subject  ");
    await form.locator("summary").click();
    await form.getByLabel("Additional info", { exact: true }).fill("Focus on jobs; exclude investments.");
    await expect(form.getByRole("checkbox")).toHaveCount(0);
    let release!: () => void; const hold = new Promise<void>(r => { release = r; });
    const requests: Record<string, unknown>[] = [];
    await page.route("**/beta/api/research", async route => { requests.push(route.request().postDataJSON()); await hold; await route.fulfill({ json: { brief: { ...saved, status: "queued" } } }); });
    await form.getByRole("button", { name: "Start new research" }).click();
    await expect(form.getByRole("button", { name: "Starting…" })).toBeDisabled();
    expect(requests).toHaveLength(1);
    const key = field === "Guest name" ? "guestName" : field === "Company name" ? "companyName" : "industry";
    expect(requests[0]).toEqual({ schemaVersion: 2, researchInput: { guestName: "", companyName: "", industry: "", audienceCountry: "IN", [key]: "Selected subject" }, notes: "Focus on jobs; exclude investments.", notesApproved: true });
    release();
  });
}

test("optional clarification can be skipped without filling the answer", async ({ page }) => {
  await open(page, { ...saved, status: "clarification", sections: [], sources: [], clarification: "Any company to prioritize?" });
  let sent: unknown;
  await page.route("**/rb_fixture/run", async route => { sent = route.request().postDataJSON(); await route.fulfill({ json: { brief: { ...saved, status: "running", skipClarification: true, sections: [], progress: ["Searching public sources"] } } }); });
  await page.getByRole("button", { name: "Skip and continue", exact: true }).click();
  await expect(page.getByText("Your report is cooking")).toBeVisible();
  expect(sent).toEqual({ revision: 2, skipClarification: true });
});

test("explicit clarification continues the same brief", async ({ page }) => {
  await open(page, { ...saved, status: "clarification", sections: [], sources: [], clarification: "Which person?" });
  await page.getByLabel("Your clarification", { exact: true }).fill("The film director");
  let sent: unknown;
  await page.route("**/rb_fixture/run", async route => { sent = route.request().postDataJSON(); await route.fulfill({ json: { brief: { ...saved, status: "running", sections: [] } } }); });
  await page.getByRole("button", { name: "Continue research", exact: true }).click();
  await expect(page.getByText("Your report is cooking")).toBeVisible();
  expect(sent).toEqual({ revision: 2, clarification: "The film director" });
});

test("stale clarification reloads the current revision and preserves the answer", async ({ page }) => {
  const brief: ResearchBrief = { ...saved, status: "clarification", sections: [], sources: [], clarification: "Which person?" };
  await open(page, brief);
  await page.getByLabel("Your clarification", { exact: true }).fill("The film director");
  await page.route("**/beta/api/research/rb_fixture", route => route.fulfill({ json: { brief: { ...brief, revision: 3 } } }));
  const sent: unknown[] = [];
  await page.route("**/rb_fixture/run", async route => {
    sent.push(route.request().postDataJSON());
    await route.fulfill(sent.length === 1 ? { status: 409, json: { error: "research_conflict" } } : { json: { brief: { ...brief, revision: 4, status: "running" } } });
  });
  await page.getByRole("button", { name: "Continue research", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your clarification", exact: true })).toHaveValue("The film director");
  await expect(page.getByRole("button", { name: "Continue research", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Continue research", exact: true }).click();
  await expect(page.getByText("Your report is cooking")).toBeVisible();
  expect(sent).toEqual([{ revision: 2, clarification: "The film director" }, { revision: 3, clarification: "The film director" }]);
});

test("sidebar deletion confirms, shows pending, and removes the selected report once", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: `Delete ${saved.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Keep brief", exact: true }).click();
  await expect(page.getByRole("article", { name: "Research brief" })).toBeVisible();
  let release!: () => void; const hold = new Promise<void>(r => { release = r; }); let deletes = 0;
  await page.route("**/beta/api/research/rb_fixture", async route => {
    if (route.request().method() === "DELETE") { deletes++; await hold; await route.fulfill({ json: { deleted: true } }); }
    else await route.fulfill({ json: { brief: saved } });
  });
  await page.getByRole("button", { name: `Delete ${saved.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page.getByText("Deleting research…", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Delete ${saved.title}`, exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("article", { name: "Research brief" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Delete ${saved.title}`, exact: true })).toHaveCount(0);
  expect(deletes).toBe(1);
});

test("failed deletion keeps report content and allows a bin retry", async ({ page }) => {
  await open(page);
  await page.route("**/beta/api/research/rb_fixture", route => route.fulfill({ status: 503, json: { error: "research_deletion_pending" } }));
  await page.getByRole("button", { name: `Delete ${saved.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page.getByText(/Use the bin beside the brief to retry deletion/)).toBeVisible();
  await expect(page.getByRole("button", { name: `Delete ${saved.title}`, exact: true })).toBeEnabled();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
});

test("deleting an unselected brief leaves the selected report in place", async ({ page }) => {
  await open(page);
  const other = { ...saved, id: "rb_other", title: "Another report" };
  await page.route("**/beta/api/research", route => route.fulfill({ json: { configured: true, briefs: [saved, other] } }));
  await page.route("**/beta/api/research/rb_other", route => route.fulfill({ json: { deleted: true } }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByRole("button", { name: "Delete Another report", exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page.getByRole("button", { name: "Delete Another report", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: saved.title, exact: true })).toBeVisible();
});

test("shared read-only report does not offer deletion or follow-up", async ({ page }) => {
  await open(page, { ...saved, canEdit: false, shared: true });
  await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ask follow-up", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download Word", exact: true })).toBeEnabled();
});

test("poll completion clears a transient failure without a manual reload button", async ({ page }) => {
  await open(page, { ...saved, status: "running" });
  let polls = 0;
  await page.route("**/beta/api/research/rb_fixture", async route => {
    polls++;
    await route.fulfill(polls === 1 ? { status: 503, json: { error: "unavailable" } } : { json: { brief: saved } });
  });
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByText("Your report is cooking")).toHaveCount(0);
});

test("pending cancellation is truthful and can be retried", async ({ page }) => {
  await open(page, { ...saved, status: "running" });
  await page.route("**/rb_fixture/cancel", route => route.fulfill({ status: 503, json: { error: "research_cancel_pending" } }));
  await page.getByRole("button", { name: "Cancel research", exact: true }).click();
  await expect(page.getByText(/Cancellation is not yet confirmed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry cancellation", exact: true })).toBeEnabled();
});

test("follow-up states saved-evidence scope and ignores late answers after selecting another brief", async ({ page }) => {
  await open(page);
  const other = { ...saved, id: "rb_other", title: "Another guest report" };
  await page.route("**/beta/api/research", route => route.fulfill({ json: { configured: true, briefs: [saved, other] } }));
  await page.route("**/beta/api/research/rb_other", route => route.fulfill({ json: { brief: other } }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText(/Follow-ups do not search for new information/)).toBeVisible();
  let release!: () => void; const hold = new Promise<void>(r => { release = r; });
  await page.route("**/rb_fixture/chat", async route => { await hold; await route.fulfill({ json: { brief: { ...saved, revision: 3, messages: [{ role: "assistant", content: "Late answer" }] } } }).catch(() => {}); });
  await page.getByLabel("Question", { exact: true }).fill("Explain the findings");
  await page.getByRole("button", { name: "Ask follow-up", exact: true }).click();
  await expect(page.getByText("Preparing your answer…")).toBeVisible();
  await page.getByRole("button", { name: /^Another guest report/ }).click();
  release();
  await expect(page.getByRole("heading", { name: other.title, exact: true })).toBeVisible();
  await expect(page.getByText("Late answer", { exact: true })).toHaveCount(0);
});

test("legacy and partial reports remain readable without diagnostics panels", async ({ page }) => {
  const legacy = { ...saved, status: "partial" as const, sections: [...saved.sections, { key: "desserts" as const, title: "Questions", status: "failed", content: "", failure: { stage: "desserts" as const, code: "output_truncated" as const, retryable: true } }] };
  delete legacy.schemaVersion; delete legacy.researchInput; delete legacy.modelInfo;
  await open(page, legacy);
  await expect(page.getByText("This report is incomplete", { exact: true })).toBeVisible();
  await expect(page.getByText(/model output was truncated/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Download Word", exact: true })).toBeEnabled();
  await expect(page.getByText("Run details and limitations", { exact: true })).toHaveCount(0);
});

test("skipped sections are omitted and citation wrappers do not leak", async ({ page }) => {
  await open(page, { ...saved, sections: [{ ...saved.sections[0], content: "Finding [src_one, src_one]." }, { key: "main", title: "Industry", status: "skipped", content: "" }] });
  await expect(page.getByText("Finding.", { exact: true })).toBeVisible();
  await expect(page.getByText("[, ]", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Industry positioning and opportunities", exact: true })).toHaveCount(0);
});

test("Word download is a real docx and tables stay within the viewport", async ({ page }) => {
  await open(page);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Word", exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/\.docx$/);
  await file.saveAs(`/tmp/research-export-${page.viewportSize()!.width}.docx`);
  const table = page.getByRole("region", { name: "Research evidence table", exact: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (page.viewportSize()!.width <= 320) expect(await table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const sidebar = page.getByRole("complementary", { name: "Saved research briefs" });
  expect(await sidebar.evaluate(el => getComputedStyle(el).position)).toBe(page.viewportSize()!.width >= 1024 ? "sticky" : "static");
  await page.screenshot({ path: `/tmp/research-updated-${page.viewportSize()!.width}.png`, fullPage: true });
});

test("multiple subject rows submit one combined brief and retain additional info beneath its title", async ({ page }) => {
  await open(page);
  const form = page.getByRole("form", { name: "New research" });
  for (const [label, add, first, second] of [["Guest name", "guest", "Ada Guest", "Bea Guest"], ["Company name", "company", "Example, Inc.", "Other Co"], ["Industry", "industry", "Payments", "Hospitality"]]) {
    await form.getByLabel(label, { exact: true }).fill(first);
    await form.getByRole("button", { name: `Add ${add}`, exact: true }).click();
    await form.getByLabel(`${label} 2`, { exact: true }).fill(second);
  }
  await form.getByRole("button", { name: "Remove industry 2", exact: true }).click();
  await form.getByRole("button", { name: "Add industry", exact: true }).click();
  await form.getByLabel("Industry 2", { exact: true }).fill("Hospitality");
  await form.locator("summary").click();
  await form.getByLabel("Additional info", { exact: true }).fill("Compare operations for an Indian audience.");
  let sent: Record<string, unknown> | undefined;
  let combined = { ...saved, id: "rb_combined", title: "Combined research", status: "draft" as const };
  await page.route("**/beta/api/research/rb_combined", route => route.fulfill({json: {brief: combined}}));
  await page.route("**/beta/api/research", async route => {
    sent = route.request().postDataJSON();
    combined = { ...combined, ...sent };
    await route.fulfill({ json: { brief: combined } });
  });
  await form.getByRole("button", { name: "Start new research", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Combined research", exact: true })).toBeVisible();
  expect(sent).toMatchObject({schemaVersion: 2, researchInput: {guestName: "Ada Guest\nBea Guest", companyName: "Example, Inc.\nOther Co", industry: "Payments\nHospitality", audienceCountry: "IN"}});
  const header = page.getByRole("article", { name: "Research brief" }).locator("header");
  await expect(header).toContainText("Additional info: Compare operations for an Indian audience.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("saved report and Word export omit editorial checklist and include approved additional info", async ({ page }) => {
  const brief: ResearchBrief = { ...saved, notes: "Focus on payment operations.", notesApproved: true,
    sections: [{key: "main", title: "Industry", status: "completed", content: "# Industry\n\nA finding.\n\n## Unresolved research gaps\n\nA metric remains unverified.\n\n## Editorial verification checklist\n\n- [ ] CHECKLIST_TASK_REMOVE\n\n## Conclusion\n\nKeep this conclusion."}] };
  await open(page, brief);
  await expect(page.getByText("Additional info: Focus on payment operations.", {exact: true})).toBeVisible();
  await expect(page.getByText("CHECKLIST_TASK_REMOVE")).toHaveCount(0);
  await expect(page.getByText("A metric remains unverified.", {exact: true})).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download Word", exact: true}).click();
  const download = await downloading;
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  const xml = await zip.file("word/document.xml")!.async("string");
  expect(xml).toContain("Focus on payment operations.");
  expect(xml).toContain("A metric remains unverified.");
  expect(xml).not.toContain("CHECKLIST_TASK_REMOVE");
  expect(xml).not.toContain("Editorial verification checklist");
});

test("company-only reports display all four sections and explain a discovery stop", async ({page}) => {
  const notice = "Evidence coverage: Further searches stopped at the research allowance. Some questions remain unverified.";
  const brief: ResearchBrief = {...saved, researchInput: {guestName: "", companyName: "Example Company", industry: "", audienceCountry: "IN"}, warnings: [notice],
    sections: (["snacks", "appetizers", "main", "desserts"] as const).map(key => ({key, title: key, status: "completed", content: `## ${key} findings\n\nSupported research [src_one].`}))};
  await open(page, brief);
  for (const title of ["People and leadership", "Company and industry", "Industry positioning and opportunities", "Takeaways and interview preparation"])
    await expect(page.getByRole("heading", {name: title, exact: true})).toBeVisible();
  await expect(page.getByText(notice, {exact: true})).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download Word", exact: true}).click();
  const zip = await JSZip.loadAsync(await readFile((await (await downloading).path())!));
  const xml = await zip.file("word/document.xml")!.async("string");
  expect(xml).toContain("People and leadership");
  expect(xml).toContain(notice);
  expect(xml).not.toContain("Guest profile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
