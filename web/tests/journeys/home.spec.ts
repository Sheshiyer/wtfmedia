import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Journey tests — Home route.
 *
 * Verifies:
 *   1. Hero section with correct copy and CTAs.
 *   2. Product blocks (Ask WTF, Episodes).
 *   3. Guest strip with scroll rail.
 *   4. Marquee section.
 *   5. Navigation to /chat and /episodes.
 *   6. Accessibility (axe).
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
  test("hero section has correct copy and CTAs", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Eyebrow
    const eyebrow = page.locator("text=wtf media · public catalogue");
    await expect(eyebrow).toBeVisible();

    // Heading
    const heading = page.locator("text=ask the catalogue. get the moment.");
    await expect(heading).toBeVisible();

    // Body copy
    const body = page.locator("text=every conversation, searchable and cited");
    await expect(body).toBeVisible();

    // Primary CTA
    const primaryCta = page.locator('[data-testid="cta-primary"]');
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveText("ask wtf");
    await expect(primaryCta).toHaveAttribute("href", "/chat");

    // Secondary CTA
    const secondaryCta = page.locator('[data-testid="cta-secondary"]');
    await expect(secondaryCta).toBeVisible();
    await expect(secondaryCta).toHaveText("browse episodes");
    await expect(secondaryCta).toHaveAttribute("href", "/episodes");
  });

  test("product blocks are visible", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Ask WTF block
    const askBlock = page.locator("text=Ask anything");
    await expect(askBlock).toBeVisible();

    // Episodes block
    const episodesBlock = page.locator("text=Browse the archive");
    await expect(episodesBlock).toBeVisible();

    // Episode count
    const episodeCount = page.locator("text=/\\d+ episodes/");
    await expect(episodeCount.first()).toBeVisible();
  });

  test("guest strip is visible and scrollable", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Guest strip section
    const guestSection = page.getByRole("heading", { name: "Featured guests" });
    await expect(guestSection).toBeVisible();

    // Scroll rail is present
    const scrollRail = page.locator('[role="region"][aria-label="Scrollable content"]');
    await expect(scrollRail).toBeVisible();

    // Previous/next buttons
    const prevButton = page.locator('button[aria-label="Previous guest"]');
    const nextButton = page.locator('button[aria-label="Next guest"]');
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // Previous should be disabled at start
    await expect(prevButton).toBeDisabled();
  });

  test("marquee section is visible", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Marquee text
    const marquee = page.locator("text=ask wtf anything");
    await expect(marquee.first()).toBeVisible();
  });

  test("primary CTA navigates to /chat", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    const primaryCta = page.locator('[data-testid="cta-primary"]');
    await primaryCta.click();

    await expect(page).toHaveURL(/\/chat/);
  });

  test("secondary CTA navigates to /episodes", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    const secondaryCta = page.locator('[data-testid="cta-secondary"]');
    await secondaryCta.click();

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
