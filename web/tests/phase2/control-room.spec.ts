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

async function openOperationsNavIfCompact(page: Page) {
  if ((page.viewportSize()?.width ?? 1024) < 1024) {
    await page.getByRole("button", { name: "open operations navigation", exact: true }).click();
  }
}

test("truthful role-projected Control Room shell shows only activated administration navigation", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "control room" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "the room is open" })).toBeVisible();
  await expect(page.getByText("your access is verified. workflow systems will appear here when they are activated.")).toBeVisible();
  await expect(page.getByText("all systems operational")).toHaveCount(0);
  await expect(page.locator("[data-primary-action]")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "review operator access" })).toBeVisible();
  const promoted = page.locator("[data-promoted=true]");
  await expect(promoted).toHaveCount(1);
  await expect(promoted).toContainText("do this next");
  await expect(promoted).toHaveAttribute("href", "/ops/operators");
  await expect(promoted).not.toHaveClass(/bg-attention/);
  await openOperationsNavIfCompact(page);
  const navigation = page.getByRole("navigation", { name: "operations", exact: true });
  await expect(navigation.getByRole("link", { name: "operators" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "audit" })).toBeVisible();
});

test("editor role exposes only the activated Control Room destination", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "open Ask WTF" })).toBeVisible();
  await expect(page.getByText("audit ledger")).toHaveCount(0);
  const promoted = page.locator("[data-promoted=true]");
  await expect(promoted).toHaveCount(1);
  await expect(promoted).toContainText("ask wtf");
  await expect(promoted).toHaveAttribute("href", "/chat");
  await openOperationsNavIfCompact(page);
  const navigation = page.getByRole("navigation", { name: "operations", exact: true });
  await expect(navigation.getByRole("link", { name: "control room" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "operators" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "audit" })).toHaveCount(0);
});

test("responsive shell has no horizontal overflow", async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  const menu = page.getByRole("button", { name: "open operations navigation", exact: true });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "operations navigation" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
