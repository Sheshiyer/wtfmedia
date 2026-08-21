import { test, expect } from "@playwright/test";

/**
 * Plan 01-04 placeholder journey scaffold.
 * Purpose: prove the production-like server harness, pinned Chromium project,
 * stable snapshot paths, and 320/768/1440 viewport matrix load deterministically.
 * Behavioral route assertions land in later Phase 1 plans (01-05+).
 * Live external resources are not contacted; this spec only touches the local
 * production server declared in playwright.config.ts webServer.
 */

const PROTECTED_ROUTES = ["/", "/episodes", "/connections", "/chat"] as const;

test.describe("phase1 public-route scaffold", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`route ${route} serves a successful response`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `expected a response for ${route}`).not.toBeNull();
      expect(response!.status(), `expected 2xx/3xx for ${route}`).toBeLessThan(400);
    });
  }
});
