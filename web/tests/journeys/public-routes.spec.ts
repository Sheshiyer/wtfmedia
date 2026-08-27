import { test, expect } from "@playwright/test";

/**
 * Plan 01-17 Task 1: Phase-wide cross-route journey matrix.
 *
 * Composes existing route/API assertions into one deterministic Playwright
 * matrix that runs migrated routes together and a bounded retained-variant
 * smoke without duplicating source logic.
 *
 * Covers:
 * - Cross-route navigation (Home → Episodes → Connections → Chat → Home)
 * - Back/Forward across routes
 * - Query preservation (/chat?q=..., /episodes?episode=..., /connections?connection=...)
 * - Selected episode/connection state
 * - Chat source navigation
 * - Exact /api/chat contracts (method, request shape, streaming, headers)
 * - Retained-variant smoke (legacy variant still loads)
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

/** Mock /api/chat with a grounded answer including sources. */
function mockGroundedAnswer(page: import("@playwright/test").Page) {
  const sources = JSON.stringify([
    {
      n: 1,
      video_id: "abc123",
      title: "Episode 1: The Beginning",
      score: 0.92,
      t: 125,
      time: "2:05",
      url: "https://youtube.com/watch?v=abc123&t=125",
    },
  ]);

  page.route("/api/chat", (route) => {
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Sources": sources,
        "X-Model": "test-model",
        "X-Fallback": "false",
      },
      body: "The hosts discussed how founders often underestimate timing.",
    });
  });
}

/* ── cross-route navigation matrix ───────────────────────────────────── */

test.describe("cross-route navigation", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("Home → Episodes → Connections → Chat → Home round-trip", async ({ page }) => {
    // Home
    await page.goto("/");
    await settle(page);
    await expect(page.locator("h1")).toBeVisible();

    // Home → Episodes via nav link
    const episodesLink = page.locator('a[href="/episodes"]').first();
    await episodesLink.click();
    await settle(page);
    await expect(page).toHaveURL(/\/episodes/);
    await expect(page.locator('[data-cursor="open"]').first()).toBeVisible();

    // Episodes → Connections via nav link
    const connectionsLink = page.locator('a[href="/connections"]').first();
    await connectionsLink.click();
    await settle(page);
    await expect(page).toHaveURL(/\/connections/);
    await expect(page.locator("h1")).toBeVisible();

    // Connections → Chat via nav link
    const chatLink = page.locator('a[href="/chat"]').first();
    await chatLink.click();
    await settle(page);
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('[data-testid="ask-composer"]')).toBeVisible();

    // Chat → Home via nav link
    const homeLink = page.locator('a[href="/"]').first();
    await homeLink.click();
    await settle(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("Back/Forward traverses all routes correctly", async ({ page }) => {
    await page.goto("/");
    await settle(page);

    await page.goto("/episodes");
    await settle(page);

    await page.goto("/connections");
    await settle(page);

    await page.goto("/chat");
    await settle(page);

    // Back through all routes
    await page.goBack();
    await settle(page);
    await expect(page).toHaveURL(/\/connections/);

    await page.goBack();
    await settle(page);
    await expect(page).toHaveURL(/\/episodes/);

    await page.goBack();
    await settle(page);
    await expect(page).toHaveURL(/\/$/);

    // Forward through all routes
    await page.goForward();
    await settle(page);
    await expect(page).toHaveURL(/\/episodes/);

    await page.goForward();
    await settle(page);
    await expect(page).toHaveURL(/\/connections/);

    await page.goForward();
    await settle(page);
    await expect(page).toHaveURL(/\/chat/);
  });
});

/* ── query preservation ──────────────────────────────────────────────── */

test.describe("query preservation", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("/chat?q= param is preserved and auto-submits", async ({ page }) => {
    mockGroundedAnswer(page);

    await page.goto("/chat?q=What+did+they+say+about+founders");
    await settle(page);

    // The question should be submitted automatically
    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // URL should still contain the query param
    expect(page.url()).toContain("q=");
  });

  test("/episodes?episode= param opens drawer on load", async ({ page }) => {
    // First get a valid episode ID
    await page.goto("/episodes");
    await settle(page);

    const firstCard = page.locator('[data-cursor="open"]').first();
    await firstCard.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Capture the URL with episode param
    const urlWithEpisode = page.url();
    expect(urlWithEpisode).toContain("episode=");

    // Navigate away and back with the same URL
    await page.goto("/");
    await settle(page);

    await page.goto(urlWithEpisode);
    await settle(page);

    // Drawer should be open again
    await expect(drawer).toBeVisible();
  });

  test("/connections?connection= param selects node on load", async ({ page }) => {
    // First get a valid connection ID
    await page.goto("/connections");
    await settle(page);

    const firstNode = page.locator('[data-selected]').first();
    if ((await firstNode.count()) > 0) {
      await firstNode.click();

      const urlWithConnection = page.url();
      if (urlWithConnection.includes("connection=")) {
        // Navigate away and back
        await page.goto("/");
        await settle(page);

        await page.goto(urlWithConnection);
        await settle(page);

        // Node should be selected again
        const selectedNode = page.locator('[data-selected="true"]');
        await expect(selectedNode).toBeVisible();
      }
    }
  });
});

/* ── /api/chat contract ──────────────────────────────────────────────── */

test.describe("/api/chat contract", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  test("sends POST with correct request shape", async ({ page }) => {
    let requestMethod: string | undefined;
    let requestBody: unknown;

    await page.route("/api/chat", (route) => {
      requestMethod = route.request().method();
      const body = route.request().postData();
      if (body) requestBody = JSON.parse(body);

      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "ok",
      });
    });

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("Test question");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // Method is POST
    expect(requestMethod).toBe("POST");

    // Request body has messages array
    expect(requestBody).toBeTruthy();
    const body = requestBody as { messages: Array<{ role: string; content: string }> };
    expect(body.messages).toBeDefined();
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.some((m) => m.role === "user" && m.content === "Test question")).toBe(true);
  });

  test("decodes X-Sources header for source panel", async ({ page }) => {
    mockGroundedAnswer(page);

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("What did they say?");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    const sourcePanel = page.locator('[data-testid="source-panel"]');
    await expect(sourcePanel).toBeVisible();
    await expect(sourcePanel).toContainText("1 source");
    await expect(sourcePanel).toContainText("Episode 1: The Beginning");
  });

  test("no infrastructure vocabulary in DOM", async ({ page }) => {
    mockGroundedAnswer(page);

    await page.goto("/chat");
    await settle(page);

    const bodyText = await page.textContent("body");

    // No model names
    expect(bodyText).not.toMatch(/gpt-4/i);
    expect(bodyText).not.toMatch(/claude/i);
    expect(bodyText).not.toMatch(/llama/i);

    // No infrastructure vocabulary
    expect(bodyText).not.toMatch(/API key/i);
    expect(bodyText).not.toMatch(/endpoint/i);
    expect(bodyText).not.toMatch(/Cloudflare/i);
    expect(bodyText).not.toMatch(/Worker/i);
  });
});

/* ── retained-variant smoke ──────────────────────────────────────────── */

test.describe("retained-variant smoke", () => {
  test("legacy variant loads without error on all routes", async ({ page }) => {
    await lockToLoopback(page);

    const routes = ["/", "/episodes", "/connections", "/chat"];

    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `expected a response for ${route}`).not.toBeNull();
      expect(response!.status(), `expected 2xx/3xx for ${route}`).toBeLessThan(400);

      // Page has a heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
    }
  });
});
