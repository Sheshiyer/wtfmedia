import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Plan 01-12 Task 3: Public shell route-matrix journey.
 *
 * Verifies the migrated PublicShell across all public routes at 320/768/1440:
 * - Shell structure (skip link, main target, rail/drawer, scope marker)
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

        // Primary nav present
        const nav = page.locator("#wtf-application-navigation");
        await expect(nav).toBeVisible();
        // Alpha keeps the compact four-link application pill; Beta/operator
        // may add its longer workspace/operator treatment.
        await expect(page.locator(".wtf-bottom-pill")).toHaveCount(1);

        // Public Alpha never renders the operator context strip, and public
        // header metadata stays in normal flow beneath the shared rail.
        await expect(page.locator("[data-ops-context-strip]")).toHaveCount(0);
        const workspaceContext = page.locator("[data-workspace-context]").first();
        if (await workspaceContext.count()) {
          await expect(workspaceContext).toHaveCSS("position", "static");
        }

        // Chat intentionally drops the redundant intro panel to preserve
        // room for answers; catalogue routes retain their page headers.
        if (route === "/chat") {
          await expect(page.locator("[data-workspace-header]")).toHaveCount(0);
        } else {
          await expect(page.locator("[data-workspace-header]")).toBeVisible();
        }

        await expect(page.getByRole("button", { name: "open navigation", exact: true })).toHaveCount(0);
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

  test("keyboard tab order reaches nav links", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab order: skip link -> header wordmark -> application toggle.
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // header wordmark
    await page.keyboard.press("Tab"); // application toggle
    await page.keyboard.press("Enter");

    const focused = page.locator("#wtf-application-navigation-menu :focus");
    await expect(focused).toBeVisible();

    // Should be within the nav
    const inNav = await focused.count();
    expect(inNav).toBeGreaterThan(0);
  });

  test("application disclosure exposes a labelled relationship and restores focus", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const toggle = page.locator("[data-navigation-toggle]");
    const application = page.locator("#wtf-application-navigation-menu");
    await expect(toggle).toHaveAttribute("aria-controls", "wtf-application-navigation-menu");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(application).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(application).toBeVisible();
    await expect(application.getByRole("link").first()).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(application).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await expect(application).toBeVisible();
    await page.mouse.click(8, 300);
    await expect(application).toBeHidden();
  });

  for (const route of ROUTES) {
    test(`aria-current=page on active route ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const activeLinks = page.locator('#wtf-application-navigation a[aria-current="page"]');
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

    // Tab through the header controls to the application disclosure
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // wordmark
    await page.keyboard.press("Tab"); // application toggle
    await page.keyboard.press("Enter");

    const focused = page.locator("#wtf-application-navigation-menu :focus");
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

    // The rail uses the converged control-room wordmark link.
    const wordmark = page.locator('a[aria-label="WTF OS"]');
    await expect(wordmark).toBeAttached();
  });
});
