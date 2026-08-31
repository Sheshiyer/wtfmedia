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

async function openOperationsNav(page: Page) {
  const toggle = page.locator("[data-navigation-toggle]");
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  const operationsNavigation = page.locator('nav[aria-label="Operations"]:visible').first();
  await expect(operationsNavigation).toBeVisible();
  return operationsNavigation;
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
  await expect(page.getByRole("button", { name: "refresh status" })).toHaveCount(0);
  const promoted = page.locator("[data-promoted=true]");
  await expect(promoted).toHaveCount(1);
  await expect(promoted).toContainText("do this next");
  await expect(promoted).toHaveAttribute("href", "/ops/production");
  await expect(promoted).not.toHaveClass(/bg-attention/);
  const operationsNavigation = await openOperationsNav(page);
  await expect(operationsNavigation.getByRole("link", { name: "settings" })).toBeVisible();
  await expect(operationsNavigation.getByRole("link", { name: "operators" })).toHaveCount(0);
  await expect(operationsNavigation.getByRole("link", { name: "audit" })).toHaveCount(0);
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
  const operationsNavigation = await openOperationsNav(page);
  await expect(operationsNavigation.getByRole("link", { name: "control room" })).toBeVisible();
  await expect(operationsNavigation.getByRole("link", { name: "episode map" })).toBeVisible();
  await expect(operationsNavigation.getByRole("link", { name: "settings" })).toBeVisible();
  await expect(operationsNavigation.getByRole("link", { name: "operators" })).toHaveCount(0);
  await expect(operationsNavigation.getByRole("link", { name: "audit" })).toHaveCount(0);
});

test("responsive shell has no horizontal overflow", async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-navigation-toggle]")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace", exact: true })).toBeVisible();
  await openOperationsNav(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
