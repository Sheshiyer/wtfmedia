import { test, expect } from "@playwright/test";

/**
 * Plan 01-11 Task 2: Motion/reduced-motion journey tests.
 *
 * Verifies:
 * - prefers-reduced-motion emulation
 * - Immediate reduced-motion handling on route transitions
 * - Viewport reflow at 320/768/1440px
 * - Overflow checks at exact viewports
 */

test.describe("Motion and reduced-motion journeys", () => {
  test("episode detail respects prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    const transcript = page.getByRole("heading", { name: "readable transcript" });
    await expect(transcript).toBeVisible();
    const opacity = await transcript.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });

  test("ScrollRail scroll respects prefers-reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    // ScrollRail should use instant scroll behavior
    const scrollRail = page.locator('[data-slot="scroll-rail"]').first();
    if ((await scrollRail.count()) > 0) {
      const scrollBehavior = await scrollRail.evaluate(
        (el) => window.getComputedStyle(el).scrollBehavior
      );
      // Should be auto or instant, not smooth
      expect(scrollBehavior).not.toBe("smooth");
    }
  });

  test("viewport 320px - episodes page reflows correctly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    // Page should load without horizontal overflow at the document level.
    // ScrollRail uses overflow-x:auto internally, so body.scrollWidth may
    // include its scrollable content.  Check the html element instead.
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });

  test("viewport 768px - episodes page reflows correctly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("viewport 1440px - episodes page reflows correctly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("episode detail at 320px has no document overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("episode detail at 1440px has no document overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
