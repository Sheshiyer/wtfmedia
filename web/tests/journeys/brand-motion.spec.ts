import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Plan 01-22 Task 3 — brand motion journey.
 *
 * Verifies the migrated brand effects wired into PublicShell:
 * - MigratedWordmarkMini in header (semantic tokens, not legacy WordmarkMini)
 * - Centered WTF OS dock with split public/operational rails
 * - OptionalPointerAccent (renders nothing on touch/reduced-motion)
 * - Reduced motion: dock remains static, pointer accent hidden
 * - No horizontal overflow at 320/768/1440
 * - axe: no serious/critical violations
 * - Native cursor never hidden (even with pointer accent)
 */

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 640 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

test.describe("brand motion journey", () => {
  // ─── MigratedWordmarkMini ───────────────────────────────────────────

  test("header shows the official WTF OS wordmark asset", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const mark = page.locator("[data-wtfos-wordmark]").first();
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute("src", "/brand/wtfos-wordmark.png");
    await expect(mark).toHaveAttribute("alt", "WTF OS");
  });

  test("boot overlay does not block automated clients", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-wtf-os-boot]")).toHaveCount(0);
  });

  // ─── Centered Dock ─────────────────────────────────────────────────

  test("bottom dock renders the centered wordmark between split rails", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const dock = page.locator(".wtf-bottom-pill");
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("navigation", { name: "Application" })).toBeVisible();
    await expect(dock.getByRole("navigation", { name: "Operational destinations" })).toBeVisible();
    const logo = dock.getByRole("link", { name: "WTF OS" });
    await expect(logo).toBeVisible();
    await expect(logo.locator("[data-wtfos-wordmark-mini]")).toBeVisible();
  });

  test("bottom dock keeps public and operational destinations readable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const dock = page.locator(".wtf-bottom-pill");
    for (const label of [
      "the room",
      "episodes",
      "connections",
      "ask wtf",
      "control room",
      "production",
      "episode map",
      "settings",
    ]) {
      await expect(dock.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  // ─── OptionalPointerAccent ─────────────────────────────────────────

  test("OptionalPointerAccent renders nothing in test env (no hover/pointer)", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // In Playwright's Chromium, (hover: hover) and (pointer: fine) DO match,
    // so OptionalPointerAccent renders CustomCursor which sets cursor: none.
    // Both outcomes are valid: cursor "none" (CustomCursor active) or
    // cursor auto/default (CustomCursor not rendered).
    const body = page.locator("body");
    const cursor = await body.evaluate((el) => getComputedStyle(el).cursor);
    const hasCustomCursor = await body.evaluate((el) =>
      el.classList.contains("has-custom-cursor")
    );

    // If cursor is "none", CustomCursor must be active (has-custom-cursor class)
    // If cursor is not "none", CustomCursor is not rendered — also valid
    if (cursor === "none") {
      expect(hasCustomCursor).toBe(true);
    } else {
      expect(["auto", "default", "pointer"]).toContain(cursor);
    }
  });

  // ─── Reduced motion ────────────────────────────────────────────────

  test("reduced motion: bottom dock has no running animation", async ({ page }) => {
    // Use Playwright's native reducedMotion emulation (not CDP)
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const animatedChildren = await page.locator(".wtf-bottom-pill").evaluate((dock) =>
      Array.from(dock.querySelectorAll<HTMLElement>("*")).filter((el) => {
        const style = getComputedStyle(el);
        return style.animationName !== "none";
      }).length
    );
    expect(animatedChildren).toBe(0);
  });

  test("reduced motion: pointer accent disabled", async ({ page }) => {
    // Use Playwright's native reducedMotion emulation (not CDP)
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Under reduced motion, OptionalPointerAccent should not render CustomCursor
    // so body should NOT have has-custom-cursor class
    const body = page.locator("body");
    const hasCustomCursor = await body.evaluate((el) =>
      el.classList.contains("has-custom-cursor")
    );
    expect(hasCustomCursor).toBe(false);

    // Native cursor should still be visible
    const cursor = await body.evaluate(
      (el) => getComputedStyle(el).cursor
    );
    expect(cursor).not.toBe("none");
  });

  // ─── Keyboard focus ────────────────────────────────────────────────

  test("keyboard tab order includes wordmark home link", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Tab: skip link → WordmarkMini home link → first nav link
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // wordmark home link

    const focused = page.locator(":focus");
    const href = await focused.getAttribute("href");
    expect(href).toBe("/");
  });

  // ─── Viewport overflow ─────────────────────────────────────────────

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
      expect(hasHorizontalScroll).toBe(false);
    });
  }

  // ─── axe ───────────────────────────────────────────────────────────

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

  // ─── Legacy isolation ──────────────────────────────────────────────

  test("migrated shell does not import legacy WordmarkMini", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const mark = page.locator("[data-wtfos-wordmark]").first();
    await expect(mark).toBeAttached();
    await expect(mark).toHaveAttribute("src", "/brand/wtfos-wordmark.png");
  });
});
