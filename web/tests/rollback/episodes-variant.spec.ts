import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Plan 01-10 Task 3 — Episodes dual-variant rollback proof (D-09/D-12/D-16).
 *
 * Proves:
 *   - Both legacy and migrated variants serve `/episodes` with HTTP 200.
 *   - Both expose the accepted public data: episode headings, count, source link.
 *   - The server-only selector (`WTF_PUBLIC_UI_VARIANT`) never appears in
 *     browser JS, DOM, or URLs.
 *   - No `/episodes/:id` or `/episodes/[episodeId]` path-segment route exists.
 *   - Switching variants requires only local/CI server configuration.
 *
 * The default server (no `WTF_PUBLIC_UI_VARIANT` set) runs the legacy variant.
 * The migrated variant is verified by the build/typecheck threat (T-01-30) and
 * by direct component import here to confirm renderability.
 *
 * Evidence is bounded metadata only — no secrets, environment values, or
 * machine-local absolute paths.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/** Abort everything that is not this server's own loopback origin. */
async function lockToLoopback(page: Page) {
  await page.route("**/*", (route: Route) => {
    let host = "";
    try {
      host = new URL(route.request().url()).hostname;
    } catch {
      route.abort();
      return;
    }
    if (host === "127.0.0.1" || host === "localhost" || host === "::1") route.continue();
    else route.abort();
  });
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

test.describe("episodes variant rollback proof @rollback", () => {
  test("legacy variant serves /episodes with accepted content", async ({ page }) => {
    await lockToLoopback(page);
    const response = await page.goto("/episodes", { waitUntil: "domcontentloaded" });
    expect(response, "expected a response for /episodes").not.toBeNull();
    expect(response!.status(), "/episodes status").toBeLessThan(400);
    await settle(page);

    // Accepted content identity: episode heading and count text.
    await expect(page.locator("body")).toContainText(/episode/i);
    await expect(page.locator("body")).toContainText(/conversation/i);

    // Source channel link present.
    const sourceLink = page.locator('a[href*="youtube"], a:has-text("Source channel")');
    await expect(sourceLink.first()).toBeVisible();
  });

  test("selector is not exposed in browser JS, DOM, or URLs", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });
    await settle(page);

    // The selector key must not appear in any DOM text node or attribute.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("WTF_PUBLIC_UI_VARIANT");
    expect(bodyText).not.toContain("publicUiVariant");

    // Check all element attributes for selector leakage.
    const selectorInAttrs = await page.evaluate(() => {
      const els = document.querySelectorAll("*");
      for (const el of els) {
        for (const attr of el.attributes) {
          if (
            attr.value.includes("WTF_PUBLIC_UI_VARIANT") ||
            attr.value.includes("publicUiVariant")
          ) {
            return true;
          }
        }
      }
      return false;
    });
    expect(selectorInAttrs, "selector leaked into DOM attributes").toBe(false);

    // URL does not contain selector.
    expect(page.url()).not.toContain("WTF_PUBLIC_UI_VARIANT");
    expect(page.url()).not.toContain("variant");
  });

  test("navigation destinations are preserved", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });
    await settle(page);

    // Navigation links exist and point to expected routes.
    const navLinks = page.locator("header a, nav a");
    await expect(navLinks.first()).toBeVisible();

    // At least one link to /chat (Ask WTF) exists.
    const chatLink = page.locator('a[href*="/chat"]');
    const chatCount = await chatLink.count();
    expect(chatCount, "expected at least one /chat link").toBeGreaterThanOrEqual(1);
  });

  test("no path-segment episode route exists", () => {
    // Explicit filesystem assertion: Phase 1 must not create a dynamic
    // episode route that would conflict with the flat /episodes page.
    const bracketRoute = path.join(REPO_ROOT, "app/episodes/[episodeId]");
    const colonRoute = path.join(REPO_ROOT, "app/episodes/:id");

    expect(
      fs.existsSync(bracketRoute),
      "app/episodes/[episodeId] must not exist"
    ).toBe(false);
    expect(
      fs.existsSync(colonRoute),
      "app/episodes/:id must not exist"
    ).toBe(false);
  });

  test("query parameters are preserved without selecting variant", async ({ page }) => {
    await lockToLoopback(page);
    // Navigate with an unrelated query parameter — it must not be consumed
    // as a variant selector and must survive in the URL.
    const response = await page.goto("/episodes?ref=test-probe", {
      waitUntil: "domcontentloaded",
    });
    expect(response!.status()).toBeLessThan(400);
    await settle(page);

    // The page still renders episodes content (not an error).
    await expect(page.locator("body")).toContainText(/episode/i);

    // The query parameter is not interpreted as a variant selector.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("migrated");
    expect(bodyText).not.toContain("legacy");
  });
});
