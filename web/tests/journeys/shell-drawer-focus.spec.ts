import { expect, test } from "@playwright/test";

test.describe("Public shell drawer focus return", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("pointer path restores focus to the hamburger on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const menu = page.getByRole("button", { name: "Open application navigation", exact: true });
    await expect(menu).toBeVisible();
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "application navigation" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(menu).toBeFocused();
  });

  test("keyboard path reaches the hamburger, opens with Enter, and restores focus on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const menu = page.getByRole("button", { name: "Open application navigation", exact: true });

    for (let i = 0; i < 12; i += 1) {
      if (await menu.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(menu).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "application navigation" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(menu).toBeFocused();
  });
});
