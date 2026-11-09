import { test, expect } from "@playwright/test";
import type { ProductionSnapshot } from "@/lib/ops/production-data";

const empty = (): ProductionSnapshot => ({
  ips: [{ id: "wtf-is", name: "WTF", parent: null, color: "#F3B72B", active: true, targetCount: null, targetPlus: false }],
  items: [], events: [], guests: [], itemGuests: [], dubbing: [], permissions: [], blockers: [], sourceChecks: [], sourceSheets: [], sourceSummary: null, canEdit: true, canManage: true,
});

test("calendar and header share a dated popup with safe save, failure and cancel", async ({ page }) => {
  const snapshot = empty();
  let attempts = 0;
  await page.route("**/beta/api/production", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: snapshot });
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, json: { error: "temporarily_unavailable" } });
    const { action, data } = route.request().postDataJSON();
    expect(action).toBe("create_item");
    expect(data.initialEvent).toEqual({ kind: "shoot", day: "2026-11-17", dateState: "planned" });
    expect(data.trackDubbing).toBeUndefined();
    snapshot.items.push({ ...data, id: "pitem_test", sourceRef: null });
    snapshot.events.push({ ...data.initialEvent, id: "pevt_test", itemId: "pitem_test", owner: null, notes: "", sourceRef: null });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 201, json: { ok: true, id: "pitem_test" } });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Workbook reference", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dubbing", exact: true })).toHaveCount(0);
  await page.getByLabel("Jump to month").fill("2026-11");
  const date = page.getByRole("button", { name: "Add episode on 2026-11-17, 0 production events", exact: true });
  await date.click();
  const dialog = page.getByRole("dialog", { name: "Create new episode" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("First date (optional)")).toHaveValue("2026-11-17");
  await dialog.getByLabel("Title", { exact: true }).fill("Popup episode");
  await dialog.getByRole("combobox", { name: "IP", exact: true }).selectOption("wtf-is");
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: test.info().outputPath("episode-popup.png") });
  await dialog.getByRole("button", { name: "Create episode", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue("Popup episode");
  await dialog.getByRole("button", { name: "Create episode", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toBe(2);
  const mark = page.getByRole("button", { name: "🎥 Main episode shot: Popup episode", exact: true });
  await expect(mark).toBeVisible();
  await mark.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("summary").filter({ hasText: /^Restricted/ })).toBeVisible();
  await expect(page.getByLabel("Dubbing progress")).toHaveCount(0);
  const add = page.getByRole("button", { name: "Add new episode", exact: true });
  await add.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
  expect(attempts).toBe(2);
});

test("read-only users select dates without a create action", async ({ page }) => {
  await page.route("**/beta/api/production", (route) => route.fulfill({ json: { ...empty(), canEdit: false } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Workbook reference", exact: true })).toHaveCount(0);
  await page.getByLabel("Jump to month").fill("2026-11");
  await page.getByRole("button", { name: "2026-11-17, 0 production events", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add new episode", exact: true })).toHaveCount(0);
});
