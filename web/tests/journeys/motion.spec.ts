import { test, expect } from "@playwright/test";

/**
 * Plan 01-11 Task 2: Motion/reduced-motion journey tests.
 *
 * Verifies:
 * - prefers-reduced-motion emulation
 * - Immediate reduced-motion handling (no animation on open/close)
 * - Viewport reflow at 320/768/1440px
 * - Overflow checks at exact viewports
 */

test.describe("Motion and reduced-motion journeys", () => {
  test("drawer respects prefers-reduced-motion", async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Drawer should open without animation (immediate visibility)
    // The drawer content should be fully visible, not mid-animation
    const opacity = await drawer.evaluate(
      (el) => window.getComputedStyle(el).opacity
    );
    expect(opacity).toBe("1");
  });

  test("drawer close respects prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Close and verify immediate close (no exit animation)
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
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

  test("drawer at 320px - full viewport width", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // At 320px, drawer should take full viewport width
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(drawerBox!.width).toBe(320);
  });

  test("drawer at 1440px - bounded right edge", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // At 1440px, drawer should not exceed max width
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    // Drawer should be bounded (not full viewport)
    expect(drawerBox!.width).toBeLessThan(1440);
  });
});
