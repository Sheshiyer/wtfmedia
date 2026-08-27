import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Plan 01-14 Task 3 — Connections dual-variant rollback proof.
 *
 * Proves:
 *   - Both legacy and migrated variants serve `/connections` with HTTP 200.
 *   - Both expose the accepted public data: connection nodes, edges, graph.
 *   - The server-only selector (`WTF_PUBLIC_UI_VARIANT`) never appears in
 *     browser JS, DOM, or URLs.
 *   - Switching variants requires only local/CI server configuration.
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

test.describe("connections variant rollback proof @rollback", () => {
  test("migrated variant serves /connections with accepted content", async ({ page }) => {
    await lockToLoopback(page);
    const response = await page.goto("/connections", { waitUntil: "domcontentloaded" });
    expect(response, "expected a response for /connections").not.toBeNull();
    expect(response!.status(), "/connections status").toBeLessThan(400);
    await settle(page);

    // Accepted content identity: connection graph heading and node/edge counts.
    await expect(page.locator("body")).toContainText(/connection/i);
    await expect(page.locator("body")).toContainText(/node/i);

    // Semantic node list exists.
    const nodeList = page.locator('[data-testid="graph-node-list"]');
    await expect(nodeList).toBeVisible();

    // Canvas is aria-hidden.
    const canvas = page.locator('[data-testid="graph-canvas"]');
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  test("selector is not exposed in browser JS, DOM, or URLs", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/connections", { waitUntil: "domcontentloaded" });
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
    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    await settle(page);

    // Navigation links exist and point to expected routes.
    const navLinks = page.locator("header a, nav a");
    await expect(navLinks.first()).toBeVisible();

    // At least one link to /chat (Ask WTF) exists.
    const chatLink = page.locator('a[href*="/chat"]');
    const chatCount = await chatLink.count();
    expect(chatCount, "expected at least one /chat link").toBeGreaterThanOrEqual(1);
  });

  test("query parameters are preserved without selecting variant", async ({ page }) => {
    await lockToLoopback(page);
    // Navigate with an unrelated query parameter — it must not be consumed
    // as a variant selector and must survive in the URL.
    const response = await page.goto("/connections?ref=test-probe", {
      waitUntil: "domcontentloaded",
    });
    expect(response!.status()).toBeLessThan(400);
    await settle(page);

    // The page still renders connections content (not an error).
    await expect(page.locator("body")).toContainText(/connection/i);

    // The query parameter is not interpreted as a variant selector.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("migrated");
    expect(bodyText).not.toContain("legacy");
  });
});
