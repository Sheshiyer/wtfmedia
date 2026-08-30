import { test, expect } from "@playwright/test";

/**
 * Keyboard/focus journey tests for the public episode catalogue.
 *
 * Verifies:
 * - Episode cards are real links
 * - Enter opens the dedicated episode route
 * - Focus indicators remain visible
 * - Dedicated episode page exposes focusable transcript chat controls
 */

test.describe("Keyboard and focus journeys", () => {
  test("Enter key opens the dedicated episode page", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await firstCard.focus();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      page.keyboard.press("Enter"),
    ]);

    await expect(page.getByRole("heading", { name: "readable transcript" })).toBeVisible();
  });

  test("episode card has a readable link target and accessible name", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await expect(firstCard).toHaveAttribute("href", /\/episodes\/[A-Za-z0-9_-]+/);

    const accessibleName = await firstCard.evaluate((el) => {
      return (
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        el.textContent?.trim()
      );
    });
    expect(accessibleName?.length).toBeGreaterThan(0);
  });

  test("visible focus indicators on episode cards", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await firstCard.focus();

    const outline = await firstCard.evaluate(
      (el) => window.getComputedStyle(el).outlineStyle,
    );
    const boxShadow = await firstCard.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(outline !== "none" || boxShadow !== "none").toBe(true);
  });

  test("dedicated episode page exposes transcript chat focus targets", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    const textarea = page.locator('textarea[name="q"]');
    await expect(textarea).toBeVisible();
    await textarea.focus();
    await expect(textarea).toBeFocused();
    await expect(page.getByRole("button", { name: "ask wtf" })).toBeVisible();
  });
});
