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
  await page.getByRole("button", { name: /^Example Guest · Example Company/ }).click();
  await expect(page.getByRole("article", { name: "Research brief" })).toBeVisible();
}

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
