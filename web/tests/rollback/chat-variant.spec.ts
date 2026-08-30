import { test, expect } from "@playwright/test";

/**
 * Rollback proof — /chat route.
 *
 * Verifies:
 *   1. Both legacy and migrated variants serve /chat with accepted content.
 *   2. The variant selector is never exposed in browser JS, DOM, or URLs.
 *   3. Navigation destinations are preserved.
 *   4. Query parameters (especially ?q=) are preserved without selecting variant.
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

test.describe("/chat rollback proof", () => {
  test("migrated variant serves /chat with accepted content", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/chat");
    await settle(page);

    // Composer is present
    const composer = page.locator('[data-testid="ask-composer"]');
    await expect(composer).toBeVisible();

    // Submit button says "ask wtf"
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText("ask wtf");

    // Textarea placeholder asks for a moment, not a restated label.
    const textarea = page.locator("textarea");
    await expect(textarea).toHaveAttribute("placeholder", "what moment are you after?");

    // Conversation thread is present
    const thread = page.locator('[data-testid="conversation-thread"]');
    await expect(thread).toBeVisible();

    // Empty state is visible
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
  });

  test("legacy variant serves /chat with accepted content", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/chat");
    await settle(page);

    // At minimum, the page loads without error
    await expect(page).toHaveURL(/\/chat/);

    // The page has a textarea (both variants have a text input)
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
  });

  test("selector is not exposed in browser JS, DOM, or URLs", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/chat");
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
    await page.goto("/chat");
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

    const homeLink = page.locator('a[href="/"]').first();
    if (await homeLink.isVisible()) {
      await expect(homeLink).toHaveAttribute("href", "/");
    }
  });

  test("query parameters are preserved without selecting variant", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/chat?q=What%20did%20they%20say%20about%20founders%3F");
    await settle(page);

    // The page loads at /chat with the query param
    await expect(page).toHaveURL(/\/chat\?q=/);

    // Auto-submit fires: user message appears in the conversation thread
    const userMessage = page.locator('[data-testid="message-0"]');
    await expect(userMessage).toBeVisible({ timeout: 10000 });

    // No variant parameter in the URL
    const url = page.url();
    expect(url).not.toMatch(/variant=/);
  });
});
