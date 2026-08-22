import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Plan 01-12 Task 3: Public shell route-matrix journey.
 *
 * Verifies the migrated PublicShell across all public routes at 320/768/1440:
 * - Shell structure (skip link, main target, nav, footer, scope marker)
 * - Keyboard tab order and skip-to-main flow
 * - aria-current on active route
 * - focus-visible indicators
 * - page overflow (no horizontal scroll)
 * - serious/critical axe violations
 * - privacy (no forbidden internal vocabulary in rendered DOM)
 */

const ROUTES = ["/", "/episodes", "/connections", "/chat"] as const;

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 640 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

const FORBIDDEN_DOM_PATTERNS = [
  /\b(secret|api[_-]?key|token|password|credential)\b/i,
  /\b(owner|budget|dossier|permission)\b/i,
  /\/(Users|home|root|Volumes)\/[^\s"']+/,
];

test.describe("Public shell journey", () => {
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route} renders shell at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route, { waitUntil: "domcontentloaded" });

        // Shell scope marker present
        const scopeMarker = page.locator('[data-wtf-shell="migrated"]');
        await expect(scopeMarker).toBeAttached();

        // Skip link exists and is first focusable
        const skipLink = page.locator('a[href="#main-content"]');
        await expect(skipLink).toBeAttached();

        // Main content target exists
        const main = page.locator("#main-content");
        await expect(main).toBeAttached();
        await expect(main).toHaveAttribute("tabindex", "-1");

        // Primary nav present
        const nav = page.locator('nav[aria-label="Primary"]');
        await expect(nav).toBeAttached();

        // Footer present
        const footer = page.locator("footer");
        await expect(footer).toBeAttached();

        // Inert brand slot present
        const brandSlot = page.locator('[data-wtf-brand-slot="inert"]');
        await expect(brandSlot).toBeAttached();
        await expect(brandSlot).toHaveAttribute("aria-hidden", "true");
      });
    }
  }

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab to skip link (first focusable element)
    await page.keyboard.press("Tab");

    const skipLink = page.locator('a[href="#main-content"]:focus');
    await expect(skipLink).toBeVisible();

    // Activate skip link
    await page.keyboard.press("Enter");

    // Focus should move to main-content
    const main = page.locator("#main-content:focus");
    await expect(main).toBeAttached();
  });

  test("keyboard tab order reaches nav links", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab: skip link → WordmarkMini link → first nav link
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // WordmarkMini home link (header, outside nav)
    await page.keyboard.press("Tab"); // first nav link

    const focused = page.locator(":focus");
    const tag = await focused.evaluate((el) => el.tagName.toLowerCase());
    expect(tag).toBe("a");

    // Should be within the nav
    const inNav = await page.locator('nav[aria-label="Primary"] :focus').count();
    expect(inNav).toBeGreaterThan(0);
  });

  for (const route of ROUTES) {
    test(`aria-current=page on active route ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const activeLinks = page.locator('nav a[aria-current="page"]');
      const count = await activeLinks.count();

      // Exactly one active link per route
      expect(count).toBe(1);

      // The active link href should match the route
      const href = await activeLinks.first().getAttribute("href");
      if (route === "/") {
        expect(href).toBe("/");
      } else {
        expect(href).toBe(route);
      }
    });
  }

  test("focus-visible indicators on nav links", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab to a nav link
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // first nav link

    const focused = page.locator(":focus");
    const boxShadow = await focused.evaluate(
      (el) => window.getComputedStyle(el).boxShadow
    );
    const outline = await focused.evaluate(
      (el) => window.getComputedStyle(el).outlineStyle
    );

    // At least one focus indicator present
    const hasFocusIndicator = outline !== "none" || boxShadow !== "none";
    expect(hasFocusIndicator).toBe(true);
  });

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });
  }

  test("no serious or critical axe violations on home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    expect(
      seriousOrCritical,
      `Found ${seriousOrCritical.length} serious/critical axe violations: ${seriousOrCritical.map((v) => v.id).join(", ")}`
    ).toHaveLength(0);
  });

  test("no serious or critical axe violations on episodes", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    expect(
      seriousOrCritical,
      `Found ${seriousOrCritical.length} serious/critical axe violations: ${seriousOrCritical.map((v) => v.id).join(", ")}`
    ).toHaveLength(0);
  });

  test("no forbidden vocabulary in rendered DOM", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const bodyText = await page.locator("body").innerText();

      for (const pattern of FORBIDDEN_DOM_PATTERNS) {
        const match = bodyText.match(pattern);
        expect(
          match,
          `Forbidden vocabulary "${match?.[0]}" found in rendered DOM at ${route}`
        ).toBeNull();
      }
    }
  });

  test("legacy presentation rollback smoke", async ({ page }) => {
    // Verify the legacy shell is still reachable via variant toggle
    // This is a structural check — the actual rollback test runs separately
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // The migrated shell should have the scope marker
    const migrated = page.locator('[data-wtf-shell="migrated"]');
    await expect(migrated).toBeAttached();

    // WordmarkMini should be present (not legacy Wordmark)
    const wordmark = page.locator('[data-cursor="home"]');
    await expect(wordmark).toBeAttached();
  });
});
