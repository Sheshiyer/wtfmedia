import { test, expect } from "@playwright/test";

/**
 * Journey tests — /chat route (migrated variant).
 *
 * Backed by Playwright route interception (no live RAG worker).
 * Covers: request/response flow, streaming, sources, abstention,
 * error recovery, accessibility, responsive reflow, and rollback.
 */

/* ── helpers ─────────────────────────────────────────────────────────── */

async function lockToLoopback(page: import("@playwright/test").Page) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (
      url.startsWith("http://127.0.0.1") ||
      url.startsWith("http://localhost")
    ) {
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

/** Mock /api/chat with a streaming text response. */
function mockChatStream(
  page: import("@playwright/test").Page,
  chunks: string[],
  headers: Record<string, string> = {},
) {
  page.route("/api/chat", (route) => {
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...headers,
      },
      body: chunks.join(""),
    });
  });
}

/** Mock /api/chat with a grounded answer including sources. */
function mockGroundedAnswer(
  page: import("@playwright/test").Page,
  opts: { timed?: boolean } = {},
) {
  const sources = opts.timed !== false
    ? JSON.stringify([
        {
          n: 1,
          video_id: "abc123",
          title: "Episode 1: The Beginning",
          score: 0.92,
          t: 125,
          time: "2:05",
          url: "https://youtube.com/watch?v=abc123&t=125",
        },
        {
          n: 2,
          video_id: "def456",
          title: "Episode 5: Persistence",
          score: 0.87,
          t: 300,
          time: "5:00",
          url: "https://youtube.com/watch?v=def456&t=300",
        },
      ])
    : JSON.stringify([
        {
          n: 1,
          video_id: "xyz789",
          title: "Startup Culture 101",
          score: 0.78,
          t: null,
          time: "",
          url: "https://youtube.com/watch?v=xyz789",
        },
      ]);

  mockChatStream(
    page,
    ["The hosts discussed how founders ", "often underestimate timing."],
    {
      "X-Sources": sources,
      "X-Model": "test-model",
      "X-Fallback": "false",
    },
  );
}

/** Mock /api/chat with an abstention response. */
function mockAbstention(page: import("@playwright/test").Page) {
  mockChatStream(page, ["I don't have enough information to answer that."], {
    "X-Sources": "[]",
    "X-Model": "test-model",
    "X-Fallback": "false",
  });
}

/** Mock /api/chat with a server error. */
function mockServerError(page: import("@playwright/test").Page) {
  page.route("/api/chat", (route) => {
    route.fulfill({
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Service unavailable",
    });
  });
}

/* ── tests ───────────────────────────────────────────────────────────── */

test.describe("/chat journey — migrated variant", () => {
  test.beforeEach(async ({ page }) => {
    await lockToLoopback(page);
  });

  /* ── page load ─────────────────────────────────────────────────────── */

  test("page loads with composer and empty thread", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    await expect(page.locator('[data-testid="ask-composer"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-thread"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    const textarea = page.locator("textarea");
    await expect(textarea).toHaveAttribute("placeholder", "what moment are you after?");
    await expect(textarea).toBeFocused();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText("ask wtf");
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveClass(/bg-attention/);
    await expect(submitButton).toHaveCSS("background-color", "rgb(241, 179, 51)");
    await expect(submitButton).toHaveCSS("color", "rgb(26, 26, 26)");
  });

  test("composer is compact and keeps source mode inside the send bar", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    const composer = page.locator('[data-testid="ask-composer"]');
    await expect(composer.locator(".wtf-type-rail")).toHaveCount(0);
    await expect(composer.getByTestId("ask-send-bar").getByTestId("source-mode-toggle")).toBeVisible();
    await expect(composer.getByTestId("ask-send-bar").getByRole("button")).toHaveCount(4);
    await expect(composer).not.toContainText("find the exact moment where the guest changes their mind");
  });

  /* ── request/response flow ─────────────────────────────────────────── */

  test("sends request and accumulates streamed response", async ({ page }) => {
    let requestBody: unknown;
    await page.route("/api/chat", (route) => {
      const body = route.request().postData();
      if (body) requestBody = JSON.parse(body);

      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Hello world.",
      });
    });

    await page.goto("/chat");
    await settle(page);

    const textarea = page.locator("textarea");
    await textarea.fill("What is this about?");
    await page.locator('button[type="submit"]').click();

    // Wait for response to appear
    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify request body
    expect(requestBody).toBeTruthy();
    const body = requestBody as { messages: Array<{ role: string; content: string }> };
    expect(body.messages).toBeDefined();
    expect(body.messages.some((m) => m.role === "user" && m.content === "What is this about?")).toBe(true);

    // Verify accumulated response text
    const assistantMsg = page.locator('[data-testid="message-1"]');
    await expect(assistantMsg).toContainText("Hello world.");
  });

  test("forwards episode scope from the episode workspace query", async ({ page }) => {
    let requestBody: { episodeId?: string } | undefined;
    await page.route("/api/chat", (route) => {
      requestBody = route.request().postDataJSON() as { episodeId?: string };
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Episode-scoped answer.",
      });
    });

    await page.goto("/chat?q=map%20this%20episode&episodeId=SPLFyVyTI1A");
    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({ timeout: 10000 });

    expect(requestBody?.episodeId).toBe("SPLFyVyTI1A");
  });

  /* ── sources ───────────────────────────────────────────────────────── */

  test("decodes X-Sources header and shows source panel", async ({ page }) => {
    mockGroundedAnswer(page, { timed: true });

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("What did they say about founders?");
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // Source panel is visible
    const sourcePanel = page.locator('[data-testid="source-panel"]');
    await expect(sourcePanel).toBeVisible();
    await expect(sourcePanel).toContainText("2 sources");

    // Sources have correct titles
    await sourcePanel.locator("summary").click();
    await expect(sourcePanel).toContainText("Episode 1: The Beginning");
    await expect(sourcePanel).toContainText("Episode 5: Persistence");
  });

  test("shows untimed sources without timestamp", async ({ page }) => {
    mockGroundedAnswer(page, { timed: false });

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("Summarize the episode");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    const sourcePanel = page.locator('[data-testid="source-panel"]');
    await expect(sourcePanel).toBeVisible();
    await expect(sourcePanel).toContainText("1 source");
  });

  test("preserves each source timeline in a both-mode response", async ({ page }) => {
    mockChatStream(page, ["The answer is grounded in both timelines. [1,2]"], {
      "X-Sources": JSON.stringify([
        {
          n: 1,
          video_id: "abcdefghijk",
          title: "Published source",
          source_mode: "published",
          score: 0.92,
          t: 125,
        },
        {
          n: 2,
          video_id: "abcdefghijk",
          title: "Uncut source",
          source_mode: "uncut",
          mapping_status: "mapped",
          score: 0.87,
          t: 300,
          url: "https://f.io/uncut-token",
        },
      ]),
      "X-Source-Mode": "both",
      "X-Fallback": "false",
    });

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("Compare the published and uncut sources.");
    await page.locator('button[type="submit"]').click();

    const sourcePanel = page.locator('[data-testid="source-panel"]');
    await expect(sourcePanel).toBeVisible({ timeout: 10000 });
    await sourcePanel.locator("summary").click();

    await expect(sourcePanel).toContainText("uncut timestamps come from the response");
    await expect(sourcePanel).toContainText("published 2:05");
    await expect(sourcePanel).toContainText("uncut 5:00");
    await expect(sourcePanel).toContainText("open published moment");
    await expect(sourcePanel).toContainText("open uncut source");
    await expect(sourcePanel.getByRole("link", { name: "open published moment" }).first()).toHaveCSS(
      "background-color",
      "rgb(241, 179, 51)",
    );
    await expect(sourcePanel.getByRole("link", { name: "open published moment" }).first()).toHaveCSS(
      "color",
      "rgb(26, 26, 26)",
    );

    const sourceModeSummary = sourcePanel.getByRole("group", { name: "Source modes present" });
    await expect(sourceModeSummary.getByText("published", { exact: true })).toBeVisible();
    await expect(sourceModeSummary.getByText("uncut", { exact: true })).toBeVisible();
    await expect(sourceModeSummary).not.toContainText("uncut unavailable");

    const citationLinks = page.locator('[data-testid="message-1"] .prose-chat a');
    await expect(citationLinks).toHaveCount(2);
    await expect(citationLinks.nth(0)).toHaveAttribute("href", "/episodes/abcdefghijk");
    await expect(citationLinks.nth(1)).toHaveAttribute("href", "/episodes/abcdefghijk");
  });

  /* ── abstention ────────────────────────────────────────────────────── */

  test("shows abstention label when response has no grounded content", async ({
    page,
  }) => {
    mockAbstention(page);

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("What is the meaning of life?");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="abstention-label"]')).toBeVisible();
    await expect(page.locator('[data-testid="abstention-label"]')).toContainText(
      "the catalogue doesn't support that claim",
    );
  });

  /* ── error recovery ────────────────────────────────────────────────── */

  test("shows safe error message on 503 and allows retry", async ({ page }) => {
    mockServerError(page);

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("Tell me something");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // Safe error message — no infrastructure details
    const assistantMsg = page.locator('[data-testid="message-1"]');
    await expect(assistantMsg).toContainText("answer failed. retry ask.");

    // No infrastructure vocabulary leaked
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toMatch(/503/);
    expect(bodyText).not.toMatch(/Service unavailable/i);
    expect(bodyText).not.toMatch(/fetch failed/i);
    expect(bodyText).not.toMatch(/ECONNREFUSED/i);
  });

  /* ── no duplicate hydration submit ─────────────────────────────────── */

  test("does not auto-submit without ?q= param", async ({ page }) => {
    let requestCount = 0;
    await page.route("/api/chat", (route) => {
      requestCount++;
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "ok",
      });
    });

    await page.goto("/chat");
    await settle(page);

    // Wait a moment to ensure no spurious request
    await page.waitForTimeout(1000);
    expect(requestCount).toBe(0);
  });

  /* ── loading indicator ─────────────────────────────────────────────── */

  test("shows loading indicator during streaming", async ({ page }) => {
    // Use a delayed response to catch the loading state
    page.route("/api/chat", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Response.",
      });
    });

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("Hello");
    await page.locator('button[type="submit"]').click();

    // Loading indicator appears
    const loading = page.locator('[data-testid="loading-indicator"]');
    await expect(loading).toBeVisible({ timeout: 5000 });
    await expect(loading).toContainText("looking through the catalogue");
    await expect(loading).toHaveAttribute("role", "status");

    // Loading indicator disappears after response
    await expect(loading).toBeHidden({ timeout: 10000 });
  });

  /* ── retry button ──────────────────────────────────────────────────── */

  test("retry button appears after assistant response", async ({ page }) => {
    mockGroundedAnswer(page);

    await page.goto("/chat");
    await settle(page);

    await page.locator("textarea").fill("Hello");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[data-testid="message-1"]')).toBeVisible({
      timeout: 10000,
    });

    // Retry button is visible
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toHaveText("retry answer");
  });

  /* ── keyboard focus ────────────────────────────────────────────────── */

  test("textarea is focused on mount and Enter submits", async ({ page }) => {
    let requestCount = 0;
    await page.route("/api/chat", (route) => {
      requestCount++;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("ok"));
          controller.close();
        },
      });
      route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "ok",
      });
    });

    await page.goto("/chat");
    await settle(page);

    const textarea = page.locator("textarea");
    await expect(textarea).toBeFocused();

    // Type and press Enter
    await textarea.fill("Test question");
    await textarea.press("Enter");

    // Request was sent
    await page.waitForTimeout(1000);
    expect(requestCount).toBe(1);
  });

  /* ── negative DOM assertions ───────────────────────────────────────── */

  test("no ModelPicker or model/infrastructure copy in DOM", async ({ page }) => {
    mockGroundedAnswer(page);

    await page.goto("/chat");
    await settle(page);

    const bodyText = await page.textContent("body");

    // No model picker
    expect(bodyText).not.toMatch(/ModelPicker/i);
    expect(bodyText).not.toMatch(/model-picker/i);
    expect(bodyText).not.toMatch(/data-testid="model-picker"/i);

    // No model names
    expect(bodyText).not.toMatch(/gpt-4/i);
    expect(bodyText).not.toMatch(/claude/i);
    expect(bodyText).not.toMatch(/llama/i);
    expect(bodyText).not.toMatch(/mistral/i);

    // No infrastructure vocabulary
    expect(bodyText).not.toMatch(/API key/i);
    expect(bodyText).not.toMatch(/endpoint/i);
    expect(bodyText).not.toMatch(/Cloudflare/i);
    expect(bodyText).not.toMatch(/Worker/i);
  });

  /* ── accessibility ─────────────────────────────────────────────────── */

  test("conversation thread has correct ARIA attributes", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    const thread = page.locator('[data-testid="conversation-thread"]');
    await expect(thread).toHaveAttribute("role", "log");
    await expect(thread).toHaveAttribute("aria-label", "Conversation");
    await expect(thread).toHaveAttribute("aria-live", "polite");
  });

  test("no serious or critical axe violations", async ({ page }) => {
    await page.goto("/chat");
    await settle(page);

    // Allow CDN requests for axe-core injection
    await page.unroute("**/*");
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js",
    });

    const results = await page.evaluate(() => {
      return (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ impact: string; id: string }> }> } }).axe.run();
    });

    const seriousViolations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (seriousViolations.length > 0) {
      const details = seriousViolations
        .map((v) => `${v.id} (${v.impact})`)
        .join(", ");
      expect(seriousViolations.length, `Axe violations: ${details}`).toBe(0);
    }
  });

  /* ── responsive reflow ─────────────────────────────────────────────── */

  test("composer and thread are visible at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/chat");
    await settle(page);

    await expect(page.locator('[data-testid="ask-composer"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-thread"]')).toBeVisible();
  });

  test("composer and thread are visible at 768px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/chat");
    await settle(page);

    await expect(page.locator('[data-testid="ask-composer"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-thread"]')).toBeVisible();
  });

  test("composer and thread are visible at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/chat");
    await settle(page);

    await expect(page.locator('[data-testid="ask-composer"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-thread"]')).toBeVisible();
  });

  test("Alpha chat has no document gap below the fixed composer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/chat");
    await settle(page);

    const metrics = await page.evaluate(() => ({
      viewport: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      composer: document.querySelector('[data-testid="ask-composer"]')?.getBoundingClientRect().toJSON(),
    }));

    expect(metrics.documentHeight).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.composer?.bottom).toBeLessThan(metrics.viewport);
    expect(metrics.composer?.bottom).toBeGreaterThan(metrics.viewport - 140);
  });

  test("Alpha chat removes the redundant intro panel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/chat");
    await settle(page);

    await expect(page.locator("[data-workspace-header]")).toHaveCount(0);
    await expect(page.locator("h1")).toBeAttached();
    await expect(page.locator(".wtf-bottom-pill")).toBeVisible();
  });
});
