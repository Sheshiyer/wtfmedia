import { test, expect } from "@playwright/test";

/**
 * Episodes route journey tests.
 *
 * Verifies the public catalogue + dedicated episode route contract:
 * - /episodes renders browse cards only
 * - one click opens /episodes/[id]
 * - detail page shows published embed, transcript, transcript chat, keywords
 * - Back returns to the catalogue
 * - published YouTube links remain external and noreferrer
 */

test.describe("Episodes route journeys", () => {
  test("catalogue loads with episode links", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const cards = page.locator('[data-cursor="open"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expect(cards.first()).toHaveAttribute("href", /\/episodes\/[A-Za-z0-9_-]+/);
  });

  test("clicking an episode opens the dedicated episode page", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    await expect(page).toHaveURL(/\/episodes\/[A-Za-z0-9_-]+$/);
    await expect(page.getByRole("heading", { name: "readable transcript" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "transcript chat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "mapped keywords" })).toBeVisible();
  });

  test("dedicated page hides unavailable uncut source slot", async ({ page }) => {
    await page.goto("/episodes/SPLFyVyTI1A", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("region", { name: "episode source embeds" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "youtube published version" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "uncut version" })).toHaveCount(0);
    await expect(page.getByText("not activated")).toHaveCount(0);
  });

  test("dedicated page exposes indexed uncut evidence without enabling playback", async ({ page }) => {
    await page.goto("/episodes/68ylaeBbdsg", { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("uncut evidence status").getByText("uncut indexed", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "uncut version" })).toHaveCount(0);
    await expect(page.getByText(/episode-scoped Ask WTF/i)).toBeVisible();
  });

  test("transcript and keywords are compact with show-more accordions", async ({ page }) => {
    await page.goto("/episodes/SPLFyVyTI1A", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/^show \d+ more transcript moments$/)).toBeVisible();
    await expect(page.getByText(/^show \d+ more keywords$/)).toBeVisible();
  });

  test("Back button returns to the catalogue", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);
    await expect(page).toHaveURL(/\/episodes\/[A-Za-z0-9_-]+$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/episodes$/);
    await expect(page.locator('[data-cursor="open"]').first()).toBeVisible();
  });

  test("refresh preserves the dedicated episode page", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);
    const urlBefore = page.url();
    expect(urlBefore).toMatch(/\/episodes\/[A-Za-z0-9_-]+$/);

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(urlBefore);
    await expect(page.getByRole("heading", { name: "readable transcript" })).toBeVisible();
  });

  test("Watch link opens in new tab with noreferrer", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    const watchLink = page.locator('a[href*="youtube.com"]').first();
    await expect(watchLink).toHaveAttribute("target", "_blank");
    expect(await watchLink.getAttribute("rel")).toContain("noreferrer");
  });

  test("transcript chat form navigates to Ask WTF", async ({ page }) => {
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });

    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    const form = page.locator('form[action="/chat"]');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="episodeId"]')).toHaveValue(/^[A-Za-z0-9_-]{11}$/);
    await expect(form.locator('textarea[name="q"]')).toContainText("map the transcript");
  });
});
