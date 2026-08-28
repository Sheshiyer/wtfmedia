import { test, expect } from "@playwright/test";

test("header uses the official WTF OS wordmark asset", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const mark = page.locator("[data-wtfos-wordmark]").first();
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute("src", "/brand/wtfos-wordmark.png");
  await expect(mark).toHaveAttribute("alt", "WTF OS");
});
