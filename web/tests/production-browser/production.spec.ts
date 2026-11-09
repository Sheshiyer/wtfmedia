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

test("app episode deletion confirms, handles failure, and clears calendar and board", async ({ page }) => {
  const snapshot = empty();
  snapshot.items.push({ id: "manual", ipId: "wtf-is", title: "App episode", format: "episode", stage: "planned", owner: null, notes: "", shootLocation: null, sourceStatus: "manual", sourceRef: null, canDelete: true },
    { id: "sheet", ipId: "wtf-is", title: "Sheet episode", format: "episode", stage: "planned", owner: null, notes: "", shootLocation: null, sourceStatus: "verified", sourceRef: "Production Tracker Podcast!A1", canDelete: false });
  snapshot.events.push({ id: "date", itemId: "manual", kind: "shoot", day: "2026-11-17", dateState: "planned", owner: null, notes: "", sourceRef: null });
  let attempts = 0;
  await page.route("**/beta/api/production", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: snapshot });
    expect(route.request().postDataJSON()).toEqual({ action: "delete_item", data: { id: "manual", confirm: true } });
    attempts++;
    await new Promise(resolve=>setTimeout(resolve,150));
    if (attempts === 1) return route.fulfill({ status: 503, json: { error: "temporarily_unavailable" } });
    snapshot.items = snapshot.items.filter(i=>i.id!=="manual"); snapshot.events=[];
    return route.fulfill({ json: { ok: true, id: "manual" } });
  });
  await page.goto("/");
  await page.getByLabel("Jump to month").fill("2026-11");
  await page.getByRole("button", { name: "🎥 Main episode shot: App episode", exact: true }).click();
  await page.getByRole("button", { name: "Delete episode", exact: true }).click();
  const dialog=page.getByRole("dialog", { name: "Delete episode?", exact: true });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(attempts).toBe(0);
  await page.getByRole("button", { name: "Board", exact:true }).click();
  await expect(page.getByRole("button", { name: "Delete episode Sheet episode", exact:true })).toHaveCount(0);
  await page.getByRole("button", { name: "Delete episode App episode", exact:true }).click();
  const bounds=await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({path:test.info().outputPath("delete-confirmation.png")});
  await dialog.getByRole("button", { name: "Delete episode", exact:true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete episode", exact:true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Episode deleted.");
  await expect(page.getByRole("button", { name:"Delete episode App episode", exact:true })).toHaveCount(0);
  await expect(page.getByRole("button", { name:"Add new episode", exact:true })).toBeFocused();
  await page.getByRole("button", { name:"Calendar", exact:true }).click();
  await expect(page.getByRole("button", { name:"🎥 Main episode shot: App episode", exact:true })).toHaveCount(0);
  expect(attempts).toBe(2);
});
