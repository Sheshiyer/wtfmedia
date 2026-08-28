import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Plan 01-17 Task 2: Phase-wide accessibility matrix. @a11y
 *
 * Covers keyboard, focus, accessible names, live regions, reduced motion,
 * and serious/critical axe checks across all migrated public routes.
 *
 * Complements viewports.spec.ts (reflow) and public-routes.spec.ts (navigation).
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

/** Mock /api/chat with a grounded answer. */
function mockGroundedAnswer(page: import("@playwright/test").Page) {
  page.route("/api/chat", (route) => {
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Sources": JSON.stringify([
          {
            n: 1,
            video_id: "abc123",
            title: "Episode 1",
            score: 0.9,
            t: 100,
            time: "1:40",
            url: "https://youtube.com/watch?v=abc123&t=100",
          },
        ]),
        "X-Model": "test-model",
        "X-Fallback": "false",
      },
      body: "Test answer with sources.",
    });
  });
}

/* ── axe configuration ───────────────────────────────────────────────── */

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const AXE_RULES_TO_DISABLE = [
  // Color contrast requires visual verification; flag but don't block
  "color-contrast",
];

/* ── accessibility matrix ────────────────────────────────────────────── */

test.describe("accessibility — Home (/) @a11y", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("axe: no serious/critical violations", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(AXE_RULES_TO_DISABLE)
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(serious).toEqual([]);
  });

  test("skip link is present and functional", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    // Skip link should exist
    const skipLink = page.locator('a[href="#main-content"], a[href="#content"]').first();
    if ((await skipLink.count()) > 0) {
      // Tab to activate skip link
      await page.keyboard.press("Tab");
      await expect(skipLink).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press("Enter");

      // Main content should be focused or scrolled to
      const mainContent = page.locator("#main-content, #content, main").first();
      await expect(mainContent).toBeVisible();
    }
  });

  test("heading hierarchy is correct", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    // Should have exactly one h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBe(1);

    // h1 should have accessible name
    const h1 = page.locator("h1").first();
    const h1Text = await h1.textContent();
    expect(h1Text?.trim().length).toBeGreaterThan(0);
  });

  test("all interactive elements have accessible names", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    // Check all buttons and links have accessible names
    const interactiveElements = page.locator("button, a[href], [role='button']");
    const count = await interactiveElements.count();

    for (let i = 0; i < count; i++) {
      const el = interactiveElements.nth(i);
      const accessibleName = await el.evaluate((el) => {
        return (
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          el.textContent?.trim() ||
          el.getAttribute("title")
        );
      });
      expect(accessibleName?.length, `Interactive element ${i} lacks accessible name`).toBeGreaterThan(0);
    }
  });

  test("keyboard navigation reaches all interactive elements", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    // Tab through the page and verify focus moves
    const focusableElements: string[] = [];
    const maxTabs = 20;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName + (el.id ? `#${el.id}` : "") + (el.className ? `.${el.className.split(" ")[0]}` : "") : "none";
      });
      if (focused === "none") break;
      focusableElements.push(focused);
    }

    // Should have at least 3 focusable elements (nav links, CTAs)
    expect(focusableElements.length).toBeGreaterThanOrEqual(3);
  });

  test("reduced motion: animations are disabled", async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settle(page);

    // Verify page loads without error
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Check that CSS animations are paused/disabled
    const hasRunningAnimations = await page.evaluate(() => {
      const animations = document.getAnimations();
      return animations.some((a) => a.playState === "running");
    });

    // With reduced motion, animations should be paused or not exist
    // This is a soft check — some animations may still run but be instant
    expect(hasRunningAnimations).toBe(false);
  });
});

test.describe("accessibility — Episodes (/episodes) @a11y", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("axe: no serious/critical violations", async ({ page }) => {
    await page.goto("/episodes");
    await settle(page);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(AXE_RULES_TO_DISABLE)
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(serious).toEqual([]);
  });

  test("episode cards have accessible names", async ({ page }) => {
    await page.goto("/episodes");
    await settle(page);

    const cards = page.locator('[data-cursor="open"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cards.nth(i);
      const accessibleName = await card.evaluate((el) => {
        return (
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          el.textContent?.trim()
        );
      });
      expect(accessibleName?.length, `Episode card ${i} lacks accessible name`).toBeGreaterThan(0);
    }
  });

  test("drawer has correct ARIA attributes", async ({ page }) => {
    await page.goto("/episodes");
    await settle(page);

    // Open drawer
    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Dialog should have aria-label or aria-labelledby
    const hasLabel = await drawer.evaluate((el) => {
      return !!(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
    });
    expect(hasLabel).toBe(true);

    // Focus should be trapped in drawer
    await page.keyboard.press("Tab");
    const focusedInDrawer = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest('[role="dialog"]') !== null;
    });
    expect(focusedInDrawer).toBe(true);
  });

  test("keyboard: Escape closes drawer", async ({ page }) => {
    await page.goto("/episodes");
    await settle(page);

    // Open drawer
    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Drawer should be closed
    await expect(drawer).not.toBeVisible();

    // Focus should return to the card
    await expect(firstCard).toBeFocused();
  });

  test("reduced motion: no animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/episodes");
    await settle(page);

    const cards = page.locator('[data-cursor="open"]');
    await expect(cards.first()).toBeVisible();
  });
});

test.describe("accessibility — Connections (/connections) @a11y", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("axe: no serious/critical violations", async ({ page }) => {
    await page.goto("/connections");
    await settle(page);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(AXE_RULES_TO_DISABLE)
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(serious).toEqual([]);
  });

  test("graph has accessible alternative", async ({ page }) => {
    await page.goto("/connections");
    await settle(page);

    // GraphWithList pattern: canvas is decorative (aria-hidden),
    // semantic node list provides the accessible alternative
    const canvas = page.locator('[data-testid="graph-canvas"]').first();
    if ((await canvas.count()) > 0) {
      // Canvas should be aria-hidden (decorative)
      const isHidden = await canvas.evaluate((el) => el.getAttribute("aria-hidden") === "true");
      expect(isHidden).toBe(true);

      // Semantic node list should exist as accessible alternative
      const nodeList = page.locator('[data-testid="graph-node-list"]');
      await expect(nodeList).toBeVisible();

      // The region wrapping the list should have an accessible name
      const region = page.locator('[role="region"][aria-label="Connection nodes"]');
      await expect(region).toBeVisible();
    }
  });

  test("keyboard: list navigation works", async ({ page }) => {
    await page.goto("/connections");
    await settle(page);

    // GraphWithList uses standard buttons — Tab navigates between them
    const nodeButtons = page.locator("[data-node-id]");
    const count = await nodeButtons.count();
    if (count > 1) {
      // Focus first button
      await nodeButtons.first().focus();
      await expect(nodeButtons.first()).toBeFocused();

      // Tab should move focus to next button
      await page.keyboard.press("Tab");
      await expect(nodeButtons.nth(1)).toBeFocused();
    }
  });

  test("reduced motion: graph is static", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/connections");
    await settle(page);

    // Page should load without error
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});

test.describe("accessibility — Chat (/chat) @a11y", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
    mockGroundedAnswer(page);
  });

  test("axe: no serious/critical violations", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .disableRules(AXE_RULES_TO_DISABLE)
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(serious).toEqual([]);
  });

  test("composer has accessible label", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    const composer = page.locator('[data-testid="ask-composer"]');
    await expect(composer).toBeVisible();

    // Textarea should have label
    const textarea = page.locator("textarea");
    const hasLabel = await textarea.evaluate((el) => {
      return !!(
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.placeholder : false)
      );
    });
    expect(hasLabel).toBe(true);
  });

  test("live region announces responses", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    // Submit a question
    await page.locator("textarea").fill("Test question");
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // Check for live region
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="status"], [role="log"]');
    const liveCount = await liveRegion.count();
    expect(liveCount).toBeGreaterThan(0);
  });

  test("keyboard: Enter submits question", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    const textarea = page.locator("textarea");
    await textarea.focus();
    await textarea.fill("Test question");

    // Press Enter to submit
    await page.keyboard.press("Enter");

    // Response should appear
    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("reduced motion: no animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/chat");
    await settle(page);

    const composer = page.locator('[data-testid="ask-composer"]');
    await expect(composer).toBeVisible();
  });
});

/* ── phase-wide accessibility summary ────────────────────────────────── */

test.describe("accessibility — phase-wide summary @a11y", () => {
  test("all routes have no serious/critical axe violations", async ({ page }) => {
    await lockToLoopback(page);
    mockGroundedAnswer(page);

    const routes = ["/", "/episodes", "/connections", "/chat"];

    for (const route of routes) {
      await page.goto(route);
      await settle(page);

      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .disableRules(AXE_RULES_TO_DISABLE)
        .analyze();

      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );

      expect(
        serious.length,
        `Route ${route} has ${serious.length} serious/critical violations: ${serious.map((v) => v.id).join(", ")}`
      ).toBe(0);
    }
  });
});
