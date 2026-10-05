import type { Page } from "@playwright/test";
import { test, expect, authenticate } from "./fixtures";

async function openNavigation(page: Page) {
  const toggle = page.locator("[data-navigation-toggle]");
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  const nav = page.locator("[data-navigation-disclosure]");
  await expect(nav).toBeVisible();
  return nav.locator("[data-navigation-links]");
}

test("verified operator uses the canonical workspace and current menu", async ({ page }) => {
  await authenticate(page);
  await page.goto("/beta/workspace");
  await expect(page.getByRole("heading", { name: "control room", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "open production" })).toHaveAttribute("href", "/beta/workspace/production");
  const nav = await openNavigation(page);
  for (const name of ["ask wtf", "connections", "youtube analytics", "settings"]) await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "episodes", exact: true })).toHaveCount(0);
});

test("editor navigation cannot grant access to admin destinations", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/beta/workspace");
  const nav = await openNavigation(page);
  await expect(nav.getByRole("link", { name: "settings", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "audit", exact: true })).toHaveCount(0);
  await page.goto("/beta/admin/audit");
  await expect(page.getByRole("heading", { name: "access is not granted" })).toBeVisible();
});

test("responsive shell has no horizontal overflow", async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/beta/workspace");
  await openNavigation(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

for (const role of ["member", "admin"] as const) {
  for (const environment of ["production", "staging"] as const) {
    test(`${role} analytics menu follows ${environment} visibility`, async ({ page }) => {
      await authenticate(page, role, environment);
      await page.goto("/beta/settings");
      const nav = await openNavigation(page);
      await expect(nav.getByRole("link", { name: "youtube analytics", exact: true })).toHaveCount(environment === "production" ? 0 : 1);
      if (environment === "production") {
        await page.goto("/beta/analytics");
        await expect(page.getByText("This page is not available.")).toBeVisible();
        await expect(page.locator('iframe[src*="analytics-demo"]')).toHaveCount(0);
      }
    });
  }
}

test("legacy operator URLs redirect into the Beta shell", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops/operators");
  await expect(page).toHaveURL(/\/beta\/settings\/users$/);
  await expect(page.getByRole("heading", { name: "users & access" })).toBeVisible();
});

test("denied principal cannot render a protected page even with old proof headers", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": "retired-fixture", "x-wtf-ops-proof": "retired-proof" });
  await page.route("**/beta/api/principal-context", (route) => route.fulfill({ status: 403, json: { error: "access_denied" } }));
  await page.goto("/beta/workspace");
  await expect(page.getByRole("heading", { name: "access is not granted" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "control room", exact: true })).toHaveCount(0);
});
