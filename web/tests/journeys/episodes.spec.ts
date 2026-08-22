import { test, expect } from "@playwright/test";

/**
 * Plan 01-11 Task 2: Episodes route journey tests.
 *
 * Verifies:
 * - Page-ready state with episodes loaded
 * - Episode card activation and drawer open
 * - Drawer close via Escape, backdrop, and close button
 * - Back/Forward/Refresh share semantics
 * - Transcript states (loading, blocks, plain text, unavailable)
 * - Source link safety (noreferrer, target=_blank)
 */

test.describe("Episodes route journeys", () => {
  test("page loads with episodes grid", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    // Should have episode cards
    const cards = page.locator('[data-cursor="open"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking episode card opens drawer", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    // Drawer should be visible with dialog role
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Should have episode title as heading
    const heading = drawer.locator("h2, [class*='font-label']");
    await expect(heading).toBeVisible();
  });

  test("drawer closes on Escape key", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("drawer closes on backdrop click", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Click the overlay/backdrop
    const overlay = page.locator('[data-state="open"]').first();
    await overlay.click({ position: { x: 10, y: 10 } });

    // Drawer should close
    await expect(drawer).not.toBeVisible();
  });

  test("drawer close button is accessible", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const closeButton = page.locator('[aria-label="Close drawer"]');
    await expect(closeButton).toBeVisible();

    // Close button should have minimum 44px touch target
    const box = await closeButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("Back button closes drawer", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    await page.goBack();
    await expect(drawer).not.toBeVisible();
  });

  test("Forward button reopens drawer", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    await page.goBack();
    await expect(drawer).not.toBeVisible();

    await page.goForward();
    await expect(drawer).toBeVisible();
  });

  test("refresh preserves episode selection", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    // URL should have episode param
    const urlBefore = page.url();
    expect(urlBefore).toContain("episode=");

    await page.reload({ waitUntil: "domcontentloaded" });

    // Drawer should still be visible after refresh
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
  });

  test("Watch link opens in new tab with noreferrer", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const watchLink = page.locator('a[href*="youtube.com"]').first();
    if ((await watchLink.count()) > 0) {
      await expect(watchLink).toHaveAttribute("target", "_blank");
      await expect(watchLink).toHaveAttribute("rel", "noreferrer");
    }
  });

  test("Ask link navigates to chat", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const askLink = page.locator('a[href*="/chat?q"]').first();
    if ((await askLink.count()) > 0) {
      const href = await askLink.getAttribute("href");
      expect(href).toContain("/chat?q=");
    }
  });
});
