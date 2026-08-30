import { expect, test } from "@playwright/test";

test.describe("Public shell controls focus return", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("pointer path restores focus to controls on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const controls = page.getByRole("button", { name: "controls", exact: true });
    await expect(controls).toBeVisible();
    await controls.click();
    const dialog = page.getByRole("dialog", { name: "workspace controls" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(controls).toBeFocused();
  });

  test("keyboard path reaches controls, opens with Enter, and restores focus on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const controls = page.getByRole("button", { name: "controls", exact: true });

    for (let i = 0; i < 12; i += 1) {
      if (await controls.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(controls).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "workspace controls" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(controls).toBeFocused();
  });
});
