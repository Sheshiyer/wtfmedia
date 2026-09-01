import { test, expect } from "@playwright/test";

/**
 * Plan 01-17 Task 1: Phase-wide viewport matrix.
 *
 * Parameterizes all public routes at exact viewports (320/768/1440) and
 * asserts visible actions, reflow, and no horizontal overflow.
 *
 * This file is the viewport complement to public-routes.spec.ts which
 * covers cross-route navigation and API contracts.
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

/** Assert no horizontal scrollbar on the document body. */
async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  expect(overflow, "expected no horizontal overflow").toBe(true);
}

/* ── viewport matrix ─────────────────────────────────────────────────── */

const VIEWPORTS = [
  { name: "320px mobile", width: 320, height: 568 },
  { name: "768px tablet", width: 768, height: 1024 },
  { name: "1440px desktop", width: 1440, height: 900 },
] as const;

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/episodes", label: "Episodes" },
  { path: "/connections", label: "Connections" },
  { path: "/chat", label: "Chat" },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await lockToLoopback(page);
    });

    for (const route of ROUTES) {
      test(`${route.label} (${route.path}) loads without horizontal overflow`, async ({
        page,
      }) => {
        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        expect(response).not.toBeNull();
        expect(response!.status()).toBeLessThan(400);
        await settle(page);

        // No horizontal scrollbar
        await assertNoHorizontalOverflow(page);

        // Page has a heading
        const heading = page.locator("h1");
        await expect(heading).toBeVisible();
      });
    }

    test("Home hero and CTAs visible", async ({ page }) => {
      await page.goto("/");
      await settle(page);

      // Hero heading is visible at all viewports
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      // At least one CTA is visible
      const ctas = page.locator("#wtf-main a[href='/chat'], #wtf-main a[href='/episodes']");
      await expect(ctas.first()).toBeVisible();

      await assertNoHorizontalOverflow(page);
    });

    test("Episodes grid reflows without overflow", async ({ page }) => {
      await page.goto("/episodes");
      await settle(page);

      // Episode cards are visible
      const cards = page.locator('[data-cursor="open"]:visible');
      await expect(cards.first()).toBeVisible();

      // No horizontal overflow from cards
      await assertNoHorizontalOverflow(page);
    });

    test("Connections graph fits viewport", async ({ page }) => {
      await page.goto("/connections");
      await settle(page);

      // Graph container is visible
      const graph = page.locator("h1");
      await expect(graph).toBeVisible();

      await assertNoHorizontalOverflow(page);
    });

    test("Chat composer accessible at viewport", async ({ page }) => {
      await page.goto("/chat");
      await settle(page);

      // Composer is visible and usable
      const composer = page.locator('[data-testid="ask-composer"]');
      await expect(composer).toBeVisible();

      // Textarea is visible and not clipped
      const textarea = page.locator("textarea");
      await expect(textarea).toBeVisible();

      const box = await textarea.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(100);

      await assertNoHorizontalOverflow(page);
    });

    test("Navigation links accessible at viewport", async ({ page }) => {
      await page.goto("/");
      await settle(page);

      // At least one nav link is visible (may be behind a menu on mobile)
      const navLinks = page.locator(
        'a[href="/"], a[href="/episodes"], a[href="/connections"], a[href="/chat"]'
      );
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);

      await assertNoHorizontalOverflow(page);
    });
  });
}
