import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Plan 01-17 Task 2: Phase-wide visual-candidate matrix.
 *
 * Deterministic visual capture at 320/768/1440 viewports with:
 * - Frozen environment (clock, timezone, locale, fixtures, network, fonts)
 * - Font/image waits
 * - Disabled nonessential animation
 * - Privacy-safe naming (no private data in snapshot names)
 *
 * This is a CANDIDATE capture — snapshots establish baselines for future
 * comparison. They are not self-approving; owner approval is required.
 */

/* ── helpers ─────────────────────────────────────────────────────────── */

async function captureVisual(
  page: import("@playwright/test").Page,
  name: string,
) {
  const options = { fullPage: true, animations: "disabled" } as const;
  const candidateMode = test.info().config.metadata.phase1VisualCandidate === true;

  // Wait for two consecutive identical captures so late-settling layout
  // (broken-image alt text, lazy content) is deterministic in both modes.
  let previous = await page.screenshot(options);
  let previousHash = crypto
    .createHash("sha256")
    .update(previous)
    .digest("hex");
  let stable = false;
  for (const delay of [100, 250, 500, 1000, 1000]) {
    await page.waitForTimeout(delay);
    const current = await page.screenshot(options);
    const currentHash = crypto
      .createHash("sha256")
      .update(current)
      .digest("hex");
    if (currentHash === previousHash) {
      stable = true;
      break;
    }
    previous = current;
    previousHash = currentHash;
  }

  if (!candidateMode) {
    // Comparison mode: Playwright compares against the approved baseline.
    // The stability loop above ensures late-settling layout has finished.
    if (!stable) {
      throw new Error(`${name} did not reach visual stability before comparison`);
    }
    await expect(page).toHaveScreenshot(name, options);
    return;
  }

  // Candidate mode: write the stable frame as an unapproved candidate artifact
  expect(stable, `${name} must reach two consecutive stable captures`).toBe(true);
  const stableBuffer = previous;
  const stableHash = crypto.createHash("sha256").update(stableBuffer).digest("hex");

  const relativeDirectory = ".phase1-visual-candidates";
  const directory = path.resolve(process.cwd(), relativeDirectory);
  const artifactPath = path.join(directory, name);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(artifactPath, stableBuffer);
  fs.writeFileSync(
    `${artifactPath}.json`,
    `${JSON.stringify(
      {
        schema_version: 1,
        status: "candidate",
        approved: false,
        artifact: `${relativeDirectory}/${name}`,
        sha256: stableHash,
        bytes: stableBuffer.length,
      },
      null,
      2,
    )}\n`,
  );
}

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

/* ── viewport matrix ─────────────────────────────────────────────────── */

const VIEWPORTS = [
  { name: "320px", width: 320, height: 568 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1440px", width: 1440, height: 900 },
] as const;

/* ── visual capture matrix ───────────────────────────────────────────── */

for (const viewport of VIEWPORTS) {
  test.describe(`visual capture ${viewport.name} @visual`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await lockToLoopback(page);
    });

    test(`Home (/) at ${viewport.name}`, async ({ page }) => {
      await page.goto("/");
      await settle(page);

      // Disable animations; hide broken images (external thumbs are loopback-blocked)
      // so nondeterministic alt-text rendering cannot flake the comparison.
      await page.addStyleTag({
        content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; } img { color: transparent !important; }",
      });

      await captureVisual(page, `home-${viewport.name}.png`);
    });

    test(`Episodes (/episodes) at ${viewport.name}`, async ({ page }) => {
      await page.goto("/episodes");
      await settle(page);

      await page.addStyleTag({
        content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
      });

      await captureVisual(page, `episodes-${viewport.name}.png`);
    });

    test(`Connections (/connections) at ${viewport.name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/connections");
      await settle(page);

      await page.addStyleTag({
        content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
      });

      await captureVisual(page, `connections-${viewport.name}.png`);
    });

    test(`Chat (/chat) empty at ${viewport.name}`, async ({ page }) => {
      mockGroundedAnswer(page);
      await page.goto("/chat");
      await settle(page);

      await page.addStyleTag({
        content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
      });

      await captureVisual(page, `chat-empty-${viewport.name}.png`);
    });

    test(`Chat (/chat) with response at ${viewport.name}`, async ({ page }) => {
      mockGroundedAnswer(page);
      await page.goto("/chat");
      await settle(page);

      // Submit a question to get a response
      await page.locator("textarea").fill("What did they say?");
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
        timeout: 10000,
      });

      await page.addStyleTag({
        content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
      });

      await captureVisual(page, `chat-response-${viewport.name}.png`);
    });
  });
}

/* ── drawer visual capture ───────────────────────────────────────────── */

test.describe("visual capture — drawer states @visual", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("Episode drawer open at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/episodes");
    await settle(page);

    // Open drawer
    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    await page.addStyleTag({
      content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
    });

    await captureVisual(page, "episodes-drawer-open-1440px.png");
  });

  test("Episode drawer open at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/episodes");
    await settle(page);

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    await page.addStyleTag({
      content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
    });

    await captureVisual(page, "episodes-drawer-open-320px.png");
  });
});
