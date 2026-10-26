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
      const visible = environment !== "production";
      await expect(nav.getByRole("link", { name: "youtube analytics", exact: true })).toHaveCount(visible ? 1 : 0);
      await page.goto("/beta/analytics");
      await expect(page.locator('iframe[src*="analytics-demo"]')).toHaveCount(visible ? 1 : 0);
      if (!visible) await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    });
  }
}

test("legacy operator URLs redirect into the Beta shell", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops/operators");
  await expect(page).toHaveURL(/\/beta\/settings\/users$/);
  await expect(page.getByRole("heading", { name: "users & access" })).toBeVisible();
});

for (const responseState of ["retrieval_weak", "abstained"]) {
  test(`saved ${responseState} chat shows only the no-data answer`, async ({ page }) => {
    await authenticate(page, "member");
    const conversation = { id: "mcnv_12345678", title: "Evidence question", source_mode: "published", lifecycle_state: "active" };
    const content = "We don’t have enough information about that in the catalogue.";
    await page.route("**/beta/api/chat**", (route) => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(conversation.id)
      ? { conversation, messages: [{ id: "mmsg_12345678", role: "assistant", content, created_at: "2026-10-21T00:00:00Z", grounding_state: "ungrounded", source_metadata_json: JSON.stringify({ responseState, sources: [{ n: 1, title: "Uncited candidate", video_id: "abcdefghijk", source_mode: "published" }], citedIndices: [1] }) }] }
      : { conversations: [conversation], nextCursor: null } }));
    await page.goto(`/beta/chat/${conversation.id}`);
    await expect(page.getByText(content, { exact: true })).toBeVisible();
    await expect(page.getByTestId("source-panel")).toHaveCount(0);
    await expect(page.getByTestId("abstention-label")).toHaveCount(0);
    await expect(page.getByText("Uncited candidate", { exact: true })).toHaveCount(0);
  });
}

test("denied principal cannot render a protected page even with old proof headers", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": "retired-fixture", "x-wtf-ops-proof": "retired-proof" });
  await page.route("**/beta/api/principal-context", (route) => route.fulfill({ status: 403, json: { error: "access_denied" } }));
  await page.goto("/beta/workspace");
  await expect(page.getByRole("heading", { name: "access is not granted" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "control room", exact: true })).toHaveCount(0);
});
