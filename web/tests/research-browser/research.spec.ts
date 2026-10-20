import { expect, test, type Page } from "@playwright/test";
import type { ResearchBrief } from "../../lib/research";
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
  await page.getByRole("button", { name: /Example Guest · Example Company/ }).click();
  await expect(page.getByRole("article", { name: "Research brief" })).toBeVisible();
}

test("saved report precedes collapsed editor; citations open nested evidence with keyboard focus", async ({ page }) => {
  await open(page);
  await expect(page.getByText("1 retained source", { exact: true })).toBeVisible();
  const editor = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Edit brief$/ }) });
  await expect(editor).not.toHaveAttribute("open", "");
  const citation = page.getByRole("link", { name: /View source: Example News/ }).first();
  await expect(citation).toContainText("Example News");
  await expect(page.getByText("Review against sources:", { exact: false }).first()).toBeVisible();
  const sources = page.getByLabel("Research sources", { exact: true });
  await expect(sources).not.toHaveAttribute("open", "");
  await citation.focus(); await page.keyboard.press("Enter");
  await expect(sources).toHaveAttribute("open", "");
  await expect(sources.locator("li details")).toHaveAttribute("open", "");
  await expect(sources.locator("li summary")).toBeFocused();
  await expect(page.getByText("Retained evidence", { exact: true })).toBeVisible();
  await expect(page.getByText(/Search snippet/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Regenerate/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const position = await page.evaluate(() => {
    const report = document.querySelector('[aria-label="Source channel coverage"]')!;
    const edit = [...document.querySelectorAll("summary")].find(el => el.textContent === "Edit brief")!;
    return !!(report.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(position).toBe(true);
});

test("found coverage can have no retained sources without implying no search results", async ({ page }) => {
  await open(page, { ...saved, coverage: [{ channel: "web", status: "found", sourceCount: 0, method: "web_search" }] });
  const coverage = page.getByRole("region", { name: "Source channel coverage" });
  await expect(coverage.getByText("Found", { exact: true })).toBeVisible();
  await expect(coverage.getByText("0 retained sources", { exact: true })).toBeVisible();
  await expect(coverage.getByText("No results", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("clarification is primary with no empty sections and only one continuation", async ({ page }) => {
  await open(page, { ...saved, status: "clarification", sections: [], sources: [], clarification: "Which Example Guest do you mean?" });
  await expect(page.getByRole("heading", { name: "Clarification needed" })).toBeVisible();
  await expect(page.getByText("No findings yet.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Research again", exact: true })).toHaveCount(0);
  await page.getByLabel("Your clarification", { exact: true }).fill("The film director");
  let sent: unknown;
  await page.route("**/rb_fixture/run", async route => { sent = route.request().postDataJSON(); await route.fulfill({ json: { brief: { ...saved, status: "running", progress: ["Searching public sources"] } } }); });
  await page.getByRole("button", { name: "Continue research", exact: true }).click();
  await expect(page.getByText("Your report is cooking")).toBeVisible();
  await expect(page.getByLabel("Research in progress").getByText("Searching public sources", { exact: true })).toBeVisible();
  await expect(page.getByText(/Elapsed in this view:/)).toBeVisible();
  expect(sent).toEqual({ revision: 2, clarification: "The film director" });
});

test("new structured inputs submit once with consent and visible starting feedback", async ({ page }) => {
  await open(page);
  const form = page.getByRole("form", { name: "New research" });
  await form.getByLabel("Guest name", { exact: true }).fill("  New Guest  ");
  await form.getByLabel("Company name", { exact: true }).fill("New Company");
  await form.getByLabel("Industry", { exact: true }).fill("Electric vehicles");
  await form.locator("summary").click();
  await form.getByLabel("Private notes", { exact: true }).fill("Private angle");
  await expect(form.getByRole("button", { name: "Start new research" })).toBeDisabled();
  await form.getByRole("checkbox").check();
  let resolve!: () => void;
  const hold = new Promise<void>(r => { resolve = r; });
  const requests: unknown[] = [];
  await page.route("**/beta/api/research", async route => { requests.push(route.request().postDataJSON()); await hold; await route.fulfill({ json: { brief: { ...saved, status: "draft" } } }); });
  await form.getByRole("button", { name: "Start new research" }).click();
  await expect(form.getByRole("button", { name: "Starting…" })).toBeDisabled();
  expect(requests).toEqual([{ schemaVersion: 2, researchInput: { guestName: "New Guest", companyName: "New Company", industry: "Electric vehicles", audienceCountry: "IN" }, notes: "Private angle", notesApproved: true }]);
  resolve();
});

test("structured edits persist, full rerun has no section, saved report remains visible while saving", async ({ page }) => {
  await open(page);
  await page.getByText("Edit brief", { exact: true }).click();
  await page.getByLabel("Company name", { exact: true }).last().fill("Changed Company");
  let resolve!: () => void; const hold = new Promise<void>(r => { resolve = r; });
  let patch: Record<string, unknown> = {};
  await page.route("**/beta/api/research/rb_fixture", async route => {
    if (route.request().method() === "PATCH") { patch = route.request().postDataJSON(); await hold; }
    await route.fulfill({ json: { brief: { ...saved, ...patch, revision: 3 } } });
  });
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Saving changes…")).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
  expect(patch.researchInput).toEqual({ ...input, companyName: "Changed Company" });
  resolve();
  await expect(page.getByRole("button", { name: "Research again", exact: true })).toBeEnabled();
  let run: unknown;
  await page.route("**/rb_fixture/run", async route => { run = route.request().postDataJSON(); await route.fulfill({ json: { brief: { ...saved, status: "running", revision: 4 } } }); });
  await page.getByRole("button", { name: "Research again", exact: true }).click();
  await expect(page.getByText("Your report is cooking")).toBeVisible();
  expect(run).toEqual({ revision: 3 });
});

test("poll completion updates the saved report while keeping unsaved draft fields and base revision", async ({ page }) => {
  await open(page, { ...saved, status: "running", progress: ["Writing guest profile"] });
  await page.getByText("Edit brief", { exact: true }).click();
  await page.getByLabel("Company name", { exact: true }).last().fill("Unsaved Company");
  await page.route("**/beta/api/research/rb_fixture", route => route.fulfill({ json: { brief: { ...saved, revision: 3, sections: [{ ...saved.sections[0], content: "Fresh server findings [src_one]." }] }, versions: [{ revision: 3, createdAt: saved.updatedAt }] } }));
  await expect(page.getByText("Fresh server findings", { exact: false })).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel("Company name", { exact: true }).last()).toHaveValue("Unsaved Company");
  await expect(page.getByText(/A newer revision is available/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Research again", exact: true })).toBeDisabled();
});

test("deleting the last character of a section does not hide its editor", async ({ page }) => {
  await open(page);
  await page.getByText("Edit brief", { exact: true }).click();
  await page.getByText("Edit Guest profile", { exact: true }).click();
  const field = page.getByRole("textbox", { name: "Guest profile content", exact: true });
  await field.fill("");
  await expect(field).toBeVisible();
  await field.fill("Replacement draft");
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
});

test("saved versions retain separate citation targets and model identity without invented cost", async ({ page }) => {
  await open(page);
  await page.getByText("Run details and limitations", { exact: true }).click();
  await expect(page.getByText(/Requested route: research-route/)).toBeVisible();
  await expect(page.getByText("Cost not reported by provider", { exact: true })).toBeVisible();
  await expect(page.getByText(/Upstream model not reported/)).toBeVisible();
  await page.getByText("Version history · 1 report", { exact: true }).click();
  await page.route("**/rb_fixture/versions/2", route => route.fulfill({ json: { brief: { ...saved, sections: [{ ...saved.sections[0], content: "Older findings [src_one]." }] } } }));
  await page.getByRole("button", { name: /^Saved / }).click();
  await page.getByRole("link", { name: /View source: Example News/ }).last().click();
  await expect(page.locator("#research-preview-2-source-src_one summary")).toBeFocused();
  await expect(page.locator("#research-current-source-src_one details")).not.toHaveAttribute("open", "");
});

test("a pending cancellation is never displayed as cancelled; content survives a failed deletion", async ({ page }) => {
  await open(page, { ...saved, status: "running" });
  await page.route("**/rb_fixture/cancel", route => route.fulfill({ status: 409, json: { error: "research_cancel_pending" } }));
  await page.getByRole("button", { name: "Cancel research", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry cancellation", exact: true })).toBeVisible();
  await expect(page.getByText(/Cancellation is not yet confirmed/)).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
  await page.getByRole("button", { name: "Delete research", exact: true }).click();
  let release!: () => void; const hold = new Promise<void>(r => { release = r; });
  await page.route("**/beta/api/research/rb_fixture", async route => {
    if (route.request().method() === "DELETE") { await hold; await route.abort(); }
    else await route.fulfill({ json: { brief: saved, versions: [] } });
  });
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(page.getByText("Deleting research…", { exact: true })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
  release();
  await expect(page.getByRole("button", { name: "Retry deletion", exact: true })).toBeVisible();
  await expect(page.getByText(/Deletion could not be confirmed/)).toBeVisible();
});

test("late responses after navigating to another brief cannot replace the selected report", async ({ page }) => {
  await open(page);
  const other = { ...saved, id: "rb_other", title: "Another guest report" };
  await page.route("**/beta/api/research", route => route.fulfill({ json: { configured: true, briefs: [saved, other] } }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.route("**/beta/api/research/rb_other", route => route.fulfill({ json: { brief: other, versions: [] } }));
  let release!: () => void; const hold = new Promise<void>(r => { release = r; });
  await page.route("**/rb_fixture/run", async route => { await hold; await route.fulfill({ json: { brief: { ...saved, status: "running" } } }).catch(() => {}); });
  await page.getByRole("button", { name: "Research again", exact: true }).click();
  await expect(page.getByText("Starting research…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Another guest report/ }).click();
  await expect(page.getByRole("heading", { name: "Another guest report", exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Another guest report", exact: true })).toBeVisible();
  await expect(page.getByText("Your report is cooking")).toHaveCount(0);
});

test("legacy briefs remain readable and rerunnable without guessing structured inputs", async ({ page }) => {
  const legacy = { ...saved }; delete legacy.schemaVersion; delete legacy.researchInput; delete legacy.modelInfo; delete legacy.coverage;
  await open(page, legacy);
  await expect(page.getByRole("link", { name: /View source: Example News/ })).toBeVisible();
  await page.getByText("Edit brief", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(saved.title);
  await expect(page.getByRole("textbox", { name: "Guest name", exact: true })).toHaveCount(1);
  await page.getByText("Run details and limitations", { exact: true }).click();
  await expect(page.getByText("Model identity was not retained for this run.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Research again", exact: true })).toBeEnabled();
});

test("duplicate publishers navigate to the exact cited document and tables scroll within mobile width", async ({ page }) => {
  await open(page, { ...saved, sections: [{ ...saved.sections[0], content: saved.sections[0].content + "\n\nAnother finding [src_two]." }], sources: [...saved.sources, { ...saved.sources[0], id: "src_two", title: "Second article", url: "https://example.com/second", excerpt: "Second source evidence" }] });
  const table = page.getByRole("region", { name: "Research evidence table", exact: true });
  if (page.viewportSize()!.width <= 320) {
    expect(await table.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    expect((await table.locator("th").first().boundingBox())!.width).toBeGreaterThanOrEqual(100);
    const box = await table.boundingBox(); expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
  await page.getByRole("link", { name: "View source: Example News — Second article", exact: true }).click();
  await expect(page.locator("#research-current-source-src_two summary")).toBeFocused();
  await expect(page.locator("#research-current-source-src_one details")).not.toHaveAttribute("open", "");
  await expect(page.getByText("Second source evidence", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const sidebar = page.getByRole("complementary", { name: "Saved research briefs" });
  expect(await sidebar.evaluate(el => getComputedStyle(el).position)).toBe(page.viewportSize()!.width >= 1024 ? "sticky" : "static");
  expect(await page.getByRole("form", { name: "New research" }).evaluate(el => getComputedStyle(el).position)).toBe("static");
  await page.screenshot({ path: `/tmp/research-report-${page.viewportSize()!.width}.png`, fullPage: true });
});

test("partial reports expose a retained section failure even when no document failure was recorded", async ({ page }) => {
  await open(page, { ...saved, status: "partial", sections: [...saved.sections, { key: "desserts", title: "Interview preparation", status: "failed", content: "", failure: { stage: "desserts", code: "output_truncated", retryable: true } }] });
  await expect(page.getByText("This report is incomplete", { exact: true })).toBeVisible();
  await expect(page.getByText(/model output was truncated/).first()).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
  await expect(page.getByText("No findings yet.")).toHaveCount(0);
});

test("scope changes retain labelled previous findings, block follow-up, and allow a full rerun", async ({ page }) => {
  await open(page, { ...saved, needsResearch: true });
  await expect(page.getByRole("heading", { name: "Previous report no longer matches the edited inputs", exact: true })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
  const question = page.getByRole("textbox", { name: "Question", exact: true });
  await expect(question).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ask follow-up", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: /View source: Example News/ }).click();
  await expect(page.getByText("Retained evidence", { exact: true })).toBeVisible();
  await expect(page.getByText("Version history · 1 report", { exact: true })).toBeVisible();
  let run: unknown;
  await page.route("**/rb_fixture/run", async route => { run = route.request().postDataJSON(); await route.fulfill({ json: { brief: { ...saved, revision: 3, status: "running", needsResearch: true } } }); });
  await page.getByRole("button", { name: "Research again", exact: true }).click();
  await expect(page.getByText("Your report is cooking")).toBeVisible();
  expect(run).toEqual({ revision: 2 });
  await page.route("**/beta/api/research/rb_fixture", route => route.fulfill({ json: { brief: { ...saved, revision: 4, needsResearch: false }, versions: [] } }));
  await expect(question).toBeEnabled({ timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Previous report no longer matches the edited inputs", exact: true })).toHaveCount(0);
  await question.fill("What changed?");
  await expect(page.getByRole("button", { name: "Ask follow-up", exact: true })).toBeEnabled();
});

test("blank completed sections disable Save with an explanation while retaining the editable draft", async ({ page }) => {
  await open(page);
  await page.getByText("Edit brief", { exact: true }).click();
  await page.getByText("Edit Guest profile", { exact: true }).click();
  const field = page.getByRole("textbox", { name: "Guest profile content", exact: true });
  await field.fill("  ");
  await expect(field).toBeEditable();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
  await expect(page.getByText("Completed sections cannot be blank. Add content before saving.", { exact: true })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "A reported finding" })).toBeVisible();
  await field.fill("Updated draft");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
});

for (const status of ["queued", "running", "cancel_pending"] as const) {
  test(`hides costs while ${status} without hiding model identity`, async ({ page }) => {
    await open(page, { ...saved, status, cost: { toolMicro: 5000, modelUsd: 0 } });
    await page.getByText("Run details and limitations", { exact: true }).click();
    await expect(page.getByText(/Requested route: research-route/)).toBeVisible();
    await expect(page.getByText(/Model cost:/)).toHaveCount(0);
    await expect(page.getByText(/Tool cost \(recorded or reserved\):/)).toHaveCount(0);
    await expect(page.getByText("Costs will be shown after the run stops.", { exact: true })).toBeVisible();
  });
}
