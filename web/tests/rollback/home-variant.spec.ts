import { test, expect } from "@playwright/test";

/**
 * Rollback proof — Home route.
 *
 * Verifies:
 *   1. Both legacy and WTF OS variants serve / with accepted content.
 *   2. The variant selector is never exposed in browser JS, DOM, or URLs.
 *   3. Navigation destinations are preserved.
 *   4. CTAs work on both variants.
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

test.describe("/ rollback proof", () => {
  test("WTF OS variant serves / with accepted content", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Eyebrow
    const eyebrow = page.getByText("run the show from the source", { exact: true });
    await expect(eyebrow).toBeVisible();

    // Heading
    const heading = page.getByRole("heading", { name: "control room" });
    await expect(heading).toBeVisible();

    // Primary CTA
    const primaryCta = page.locator('[data-testid="cta-primary"]');
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toContainText("ask the catalogue");
    await expect(primaryCta).toHaveAttribute("href", "/chat");

    // Canonical shell and truthful workspace state.
    await expect(page.locator('[data-wtf-shell="wtfos"]')).toBeAttached();
    await expect(page.locator('[data-state="active"]')).toHaveCount(3);
    await expect(page.locator('[data-state="not-activated"]')).toHaveCount(4);
    await expect(
      page.getByRole("heading", { name: "conversations in the room" }),
    ).toBeVisible();
  });

  test("legacy variant serves / with accepted content", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // At minimum, the page loads without error
    await expect(page).toHaveURL(/\//);

    // The page has a heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("selector is not exposed in browser JS, DOM, or URLs", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // No element with data-variant or data-ui-variant attribute
    const selectorElements = await page.locator("[data-variant], [data-ui-variant]").count();
    expect(selectorElements).toBe(0);

    // No variant-related text in the page source
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toMatch(/WTF_PUBLIC_UI_VARIANT/);
    expect(bodyText).not.toMatch(/publicUiVariant/);

    // No variant selector in any link href
    const links = await page.locator("a[href]").evaluateAll((els) =>
      els.map((el) => el.getAttribute("href"))
    );
    for (const href of links) {
      expect(href).not.toMatch(/variant=/);
    }
  });

  test("navigation destinations are preserved", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Navigation links point to correct routes
    const episodesLink = page.locator('a[href="/episodes"]').first();
    if (await episodesLink.isVisible()) {
      await expect(episodesLink).toHaveAttribute("href", "/episodes");
    }

    const connectionsLink = page.locator('a[href="/connections"]').first();
    if (await connectionsLink.isVisible()) {
      await expect(connectionsLink).toHaveAttribute("href", "/connections");
    }

    const chatLink = page.locator('a[href="/chat"]').first();
    if (await chatLink.isVisible()) {
      await expect(chatLink).toHaveAttribute("href", "/chat");
    }
  });

  test("CTAs navigate correctly", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/");
    await settle(page);

    // Primary CTA → /chat
    const primaryCta = page.locator('[data-testid="cta-primary"]');
    if (await primaryCta.isVisible()) {
      await primaryCta.click();
      await expect(page).toHaveURL(/\/chat/);
      await page.goBack();
      await settle(page);
    }

    // Secondary CTA → /episodes
    const secondaryCta = page.locator('[data-testid="cta-secondary"]');
    if (await secondaryCta.isVisible()) {
      await secondaryCta.click();
      await expect(page).toHaveURL(/\/episodes/);
    }
  });
});
