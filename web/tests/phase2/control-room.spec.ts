import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page, role: "admin" | "editor" = "admin") {
  const payload = Buffer.from(JSON.stringify({
    operatorId: 1,
    role,
    environment: "local",
    correlationId: `phase2-e2e-${role}`,
    exp: Date.now() + 60_000,
  })).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": proof });
}

async function openOperationsControlsIfCompact(page: Page) {
  if ((page.viewportSize()?.width ?? 1024) < 1024) {
    await page.getByRole("button", { name: "controls", exact: true }).click();
    return page.getByRole("dialog", { name: "workspace controls" });
  }
  return null;
}

test("truthful role-projected Control Room shell shows only activated administration navigation", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "control room" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "the room is open" })).toBeVisible();
  await expect(page.getByText("production records are live. ingest, seats, and access gates are not. missing evidence stays unnamed.")).toBeVisible();
  await expect(page.getByText("all systems operational")).toHaveCount(0);
  await expect(page.locator("[data-primary-action]")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "open production" })).toBeVisible();
  await expect(page.getByRole("button", { name: "refresh status" })).toBeVisible();
  const promoted = page.locator("[data-promoted=true]");
  await expect(promoted).toHaveCount(1);
  await expect(promoted).toContainText("do this next");
  await expect(promoted).toHaveAttribute("href", "/ops/production");
  await expect(promoted).not.toHaveClass(/bg-attention/);
  const controls = await openOperationsControlsIfCompact(page);
  if (controls) {
    await expect(controls.getByRole("button", { name: "open operators" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "open audit" })).toBeVisible();
  } else {
    const navigation = page.getByRole("navigation", { name: "operations", exact: true });
    await expect(navigation.getByRole("link", { name: "operators" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "audit" })).toBeVisible();
  }
});

test("editor role exposes only the activated Control Room destination", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "open production" })).toBeVisible();
  await expect(page.getByText("audit ledger")).toHaveCount(0);
  const promoted = page.locator("[data-promoted=true]");
  await expect(promoted).toHaveCount(1);
  await expect(promoted).toContainText("production");
  await expect(promoted).toHaveAttribute("href", "/ops/production");
  const controls = await openOperationsControlsIfCompact(page);
  if (controls) {
    await expect(controls.getByRole("button", { name: "open control room" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "open operators" })).toHaveCount(0);
    await expect(controls.getByRole("button", { name: "open audit" })).toHaveCount(0);
  } else {
    const navigation = page.getByRole("navigation", { name: "operations", exact: true });
    await expect(navigation.getByRole("link", { name: "control room" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "operators" })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "audit" })).toHaveCount(0);
  }
});

test("responsive shell has no horizontal overflow", async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  const menu = page.getByRole("button", { name: "controls", exact: true });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "workspace controls" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
