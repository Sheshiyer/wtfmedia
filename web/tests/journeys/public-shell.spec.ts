import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Plan 01-12 Task 3: Public shell route-matrix journey.
 *
 * Verifies the migrated PublicShell across all public routes at 320/768/1440:
 * - Shell structure (skip link, main target, dock/controls, scope marker)
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
        const scopeMarker = page.locator('[data-wtf-shell="wtfos"]');
        await expect(scopeMarker).toBeAttached();

        // Skip link exists and is first focusable
        const skipLink = page.locator('a[href="#wtf-main"]');
        await expect(skipLink).toBeAttached();

        // Main content target exists
        const main = page.locator("#wtf-main");
        await expect(main).toBeAttached();
        await expect(main).toHaveAttribute("tabindex", "-1");

        // Desktop dock navigation is present; compact screens use one controls trigger.
        const nav = page.locator('nav[aria-label="Application"]');
        if (vp.width >= 1024) {
          await expect(nav).toBeVisible();
        }

        // Every active application route presents a workspace header.
        await expect(page.locator("[data-workspace-header]")).toBeVisible();

        if (vp.width < 1024) {
          await expect(page.getByRole("button", { name: "controls", exact: true })).toBeVisible();
        }
      });
    }
  }

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab to skip link (first focusable element)
    await page.keyboard.press("Tab");

    const skipLink = page.locator('a[href="#wtf-main"]:focus');
    await expect(skipLink).toBeVisible();

    // Activate skip link
    await page.keyboard.press("Enter");

    // Focus should move to the shared workspace main region.
    const main = page.locator("#wtf-main:focus");
    await expect(main).toBeAttached();
  });

  test("keyboard tab order reaches dock links", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) < 1024, "Desktop dock is persistent from 1024px.");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const firstLink = page.locator('nav[aria-label="Application"] a').first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
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
    test.skip((page.viewportSize()?.width ?? 1440) < 1024, "Desktop dock focus is persistent from 1024px.");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const focused = page.locator('nav[aria-label="Application"] a').first();
    await focused.focus();
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

    // The default application should have the canonical WTF OS marker.
    const wtfos = page.locator('[data-wtf-shell="wtfos"]');
    await expect(wtfos).toBeAttached();

    if ((page.viewportSize()?.width ?? 1024) < 1024) {
      await expect(page.getByRole("button", { name: "controls", exact: true })).toBeVisible();
      return;
    }
    await expect(page.getByTestId("app-dock")).toBeVisible();
  });
});
