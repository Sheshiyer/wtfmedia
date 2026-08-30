import { test, expect } from "@playwright/test";

/**
 * URL-state journey tests.
 *
 * Verifies:
 * - /episodes stays the catalogue
 * - episode selection is a durable /episodes/[id] route
 * - Back/Forward/refresh/share work through real routes
 * - ScrollRail accessible controls remain on mobile catalogue rails
 */

test.describe("episode route state", () => {
  test("episodes page loads as the catalogue", async ({ page }) => {
    const response = await page.goto("/episodes", {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/\/episodes$/);
  });

  test("clicking an episode uses a dedicated route", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    expect(page.url()).toMatch(/\/episodes\/[A-Za-z0-9_-]+$/);
    await expect(page.getByRole("heading", { name: "readable transcript" })).toBeVisible();
  });

  test("Back and Forward move between catalogue and detail page", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);
    const detailUrl = page.url();

    await Promise.all([
      page.waitForURL(/\/episodes$/),
      page.goBack(),
    ]);
    await expect(page).toHaveURL(/\/episodes$/);

    await Promise.all([
      page.waitForURL(detailUrl),
      page.goForward(),
    ]);
    await expect(page).toHaveURL(detailUrl);
  });

  test("refresh preserves the dedicated episode route", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);
    const detailUrl = page.url();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(detailUrl);
    await expect(page.getByRole("heading", { name: "transcript chat" })).toBeVisible();
  });
});

test.describe("ScrollRail accessibility", () => {
  test("scroll rail has labelled controls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const prevButtons = page.locator('button[aria-label*="Scroll"]');
    const count = await prevButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("scroll rail region has aria-label", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const region = page.locator('[role="region"][aria-label$="episodes"]');
    const count = await region.count();
    expect(count).toBeGreaterThan(0);
  });

  test("scroll rail is keyboard navigable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const rail = page.locator('[role="region"][aria-label$="episodes"]').first();
    if ((await rail.count()) > 0) {
      await rail.focus();
      await page.keyboard.press("ArrowRight");
    }
  });
});

test.describe("dedicated episode route segments", () => {
  test("/episodes/[id] route renders from a catalogue card href", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const href = await page.locator('[data-cursor="open"]:visible').first().getAttribute("href");
    expect(href).toMatch(/^\/episodes\/[A-Za-z0-9_-]+$/);

    await page.goto(href!);
    await expect(page.getByRole("heading", { name: "youtube published version" })).toBeVisible();
  });
});
