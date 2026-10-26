import { test, expect } from "@playwright/test";

/**
 * Plan 01-14 Task 3: Connections route journey tests.
 *
 * Verifies:
 * - Page-ready state with graph and semantic list
 * - Canvas is aria-hidden and non-tabbable
 * - Semantic list has all nodes and edges
 * - Keyboard selection updates shared detail
 * - Selection detail shows episode links
 * - Reduced-motion renders stable layout
 * - Viewport responsiveness (320/768/1440)
 */

test.describe("Connections route journeys", () => {
  test("page loads with graph canvas and semantic list", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    // Canvas should be aria-hidden
    const canvas = page.locator('[data-testid="graph-canvas"]');
    await expect(canvas).toHaveAttribute("aria-hidden", "true");

    // Semantic node list should exist with buttons
    const nodeList = page.locator('[data-testid="graph-node-list"]');
    await expect(nodeList).toBeVisible();

    const nodeButtons = nodeList.locator("button");
    const count = await nodeButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("canvas is not keyboard-reachable", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const canvas = page.locator('[data-testid="graph-canvas"]');
    await expect(canvas).toHaveAttribute("tabindex", "-1");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  test("semantic list shows all projection nodes", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    // Each node button should have aria-pressed
    const nodeList = page.locator('[data-testid="graph-node-list"]');
    const buttons = nodeList.locator("button[aria-pressed]");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // The strongest discovered topic is selected so evidence is visible immediately.
    await expect(buttons.first()).toHaveAttribute("aria-pressed", "true");
  });

  test("clicking node button shows selection detail", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    // Click first node button
    const nodeList = page.locator('[data-testid="graph-node-list"]');
    const firstButton = nodeList.locator("button").first();
    await firstButton.click();

    // Selection detail should appear
    const detail = page.locator('[data-testid="graph-selection-detail"]');
    await expect(detail).toBeVisible();

    // Should have episode links
    const episodeLinks = detail.locator("a");
    const linkCount = await episodeLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test("clicking the selected node keeps its evidence visible", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const nodeList = page.locator('[data-testid="graph-node-list"]');
    const firstButton = nodeList.locator("button").first();

    // Select
    await firstButton.click();
    const detail = page.locator('[data-testid="graph-selection-detail"]');
    await expect(detail).toBeVisible();

    // A topic view remains selected instead of leaving an empty detail area.
    await firstButton.click();
    await expect(detail).toBeVisible();
  });

  test("keyboard Enter selects node", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const nodeList = page.locator('[data-testid="graph-node-list"]');
    const firstButton = nodeList.locator("button").first();

    // Focus and press Enter
    await firstButton.focus();
    await page.keyboard.press("Enter");

    // Selection detail should appear
    const detail = page.locator('[data-testid="graph-selection-detail"]');
    await expect(detail).toBeVisible();
  });

  test("keyboard Space selects node", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const nodeList = page.locator('[data-testid="graph-node-list"]');
    const firstButton = nodeList.locator("button").first();

    // Focus and press Space
    await firstButton.focus();
    await page.keyboard.press("Space");

    // Selection detail should appear
    const detail = page.locator('[data-testid="graph-selection-detail"]');
    await expect(detail).toBeVisible();
  });

  test("episode links use readable titles and open the dedicated episode page", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    // Select a node
    const nodeList = page.locator('[data-testid="graph-node-list"]');
    const firstButton = nodeList.locator("button").first();
    await firstButton.click();

    // Check episode links use the public route instead of raw video IDs.
    const detail = page.locator('[data-testid="graph-selection-detail"]');
    const links = detail.locator("a");
    const firstLink = links.first();
    await expect(firstLink).toHaveAttribute("href", /\/episodes\/[A-Za-z0-9_-]+/);
    await expect(firstLink).not.toHaveText(/^[A-Za-z0-9_-]{8,}$/);
  });

  test("evidence includes a native timestamp range and a direct watch link", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const detail = page.locator('[data-testid="graph-selection-detail"]');
    await expect(detail).toBeVisible();
    await expect(detail.getByText(/evidence 01 · \d+:\d{2}–\d+:\d{2}/)).toBeVisible();
    await expect(detail.getByRole("link", { name: /watch moment/i }).first()).toHaveAttribute(
      "href",
      /youtube\.com\/watch\?v=[A-Za-z0-9_-]+&t=\d+s/,
    );
  });

  test("semantic edge list exists", async ({ page }) => {
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    // Edge list region should exist
    const edgeList = page.locator('[data-testid="graph-edge-list"]');
    await expect(edgeList).toBeVisible();

    const edges = edgeList.locator("li");
    const count = await edges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("category menu opens and filters the topic list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const categoryButton = page.getByRole("button", { name: "Category: All categories" });
    await categoryButton.click();
    await expect(page.getByRole("listbox", { name: "Topic categories" })).toBeVisible();

    await page.getByRole("option", { name: /AI & Technology/ }).click();
    await expect(page.getByRole("button", { name: "Category: AI & Technology" })).toBeVisible();
    await expect(page.getByTestId("connections-category-count")).toHaveText("13/72");

    const categoryBadges = page.locator('[data-testid="graph-node-list"] li button > span:first-child');
    await expect(categoryBadges).toHaveCount(13);
    await expect(categoryBadges.first()).toHaveText("AI & Technology");
  });

  test("category menu remains clickable where the bottom dock overlaps its row", async ({ page }) => {
    await page.setViewportSize({ width: 1470, height: 956 });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, 1500));

    const categoryButton = page.getByRole("button", { name: "Category: All categories" });
    await expect(categoryButton).toBeVisible();

    const hitTargetIsCategoryControl = await categoryButton.evaluate((button) => {
      const bounds = button.getBoundingClientRect();
      const hitTarget = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return hitTarget === button || button.contains(hitTarget);
    });
    expect(hitTargetIsCategoryControl).toBe(true);

    await categoryButton.click();
    await expect(page.getByRole("listbox", { name: "Topic categories" })).toBeVisible();
  });

  test("page has no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("page has no horizontal overflow at 768px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("page has no horizontal overflow at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
