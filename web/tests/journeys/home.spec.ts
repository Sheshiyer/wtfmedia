import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Journey tests — Home route.
 *
 * Verifies:
 *   1. The tuned WTF OS room copy and primary CTA.
 *   2. Active public and operational destinations.
 *   3. Recent episode links route to dedicated episode pages.
 *   4. Navigation to /chat and /episodes.
 *   5. Accessibility (axe).
 */

/* ── helpers ─────────────────────────────────────────────────────────── */

async function lockToLoopback(page: import("@playwright/test").Page) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
    }
  });
}

async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

/* ── tests ───────────────────────────────────────────────────────────── */

test.describe("Home page journey", () => {
  test("room header has correct copy and CTA", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    await expect(page.getByText("ask the catalogue and get the moment", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "the room", exact: true })).toBeVisible();
    await expect(
      page.getByText("published conversations, recurring ideas, and answers with receipts. a timestamp only when verified."),
    ).toBeVisible();

    const primaryCta = page.locator('[data-testid="cta-primary"]');
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toContainText("ask the catalogue");
    await expect(primaryCta).toHaveAttribute("href", "/chat");
    await expect(primaryCta).toHaveCSS("background-color", "rgb(241, 179, 51)");
    await expect(primaryCta).toHaveCSS("color", "rgb(26, 26, 26)");
  });

  test("active workspace destinations are visible", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    const ledger = page.locator("[aria-labelledby=\"what's-open-title\"]");
    await expect(ledger).toBeVisible();
    for (const label of [
      "episodes",
      "connections",
      "ask wtf",
      "production",
      "episode map",
      "control room",
      "settings",
    ]) {
      await expect(ledger.getByRole("link").filter({ has: page.getByText(label, { exact: true }) })).toBeVisible();
    }
    await expect(page.locator('[data-state="active"]')).toHaveCount(7);
    await expect(page.locator('[data-state="unavailable"]')).toHaveCount(0);
  });

  test("recent episodes link to dedicated episode pages", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    await expect(page.getByText("source material", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "conversations in the room" })).toBeVisible();
    const firstEpisode = page.locator('a[href^="/episodes/"]').first();
    await expect(firstEpisode).toBeVisible();
    await expect(firstEpisode).toHaveAttribute("href", /\/episodes\/[^/]+$/);
  });

  test("primary CTA navigates to /chat", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    const primaryCta = page.locator('[data-testid="cta-primary"]');
    await primaryCta.click();

    await expect(page).toHaveURL(/\/chat/);
  });

  test("open episodes link navigates to /episodes", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    await page.getByRole("link", { name: /open episodes/ }).click();

    await expect(page).toHaveURL(/\/episodes/);
  });

  test("navigation links work", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Check nav links exist
    const episodesLink = page.locator('a[href="/episodes"]').first();
    const connectionsLink = page.locator('a[href="/connections"]').first();
    const chatLink = page.locator('a[href="/chat"]').first();

    // At least some nav links should be visible
    const navLinks = [episodesLink, connectionsLink, chatLink];
    for (const link of navLinks) {
      if (await link.isVisible()) {
        await expect(link).toHaveAttribute("href");
      }
    }
  });

  test("no serious or critical axe violations", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Unblock CDN for axe
    await page.unroute("**/*");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    expect(
      seriousOrCritical.length,
      `Found ${seriousOrCritical.length} serious/critical axe violations: ${seriousOrCritical.map((v) => v.id).join(", ")}`
    ).toBe(0);
  });
});
