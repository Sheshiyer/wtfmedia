import { expect, test } from "@playwright/test";

test.describe("Public shell bottom navigation focus", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("bottom pill is persistent and keyboard reachable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "open navigation", exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "application navigation" })).toHaveCount(0);

    const navigation = page.locator("#wtf-application-navigation");
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "the room", exact: true })).toBeVisible();
    for (const label of ["episodes", "connections", "ask wtf"]) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
      if ((await page.locator("#wtf-application-navigation :focus").count()) > 0) break;
    }

    expect(await page.locator("#wtf-application-navigation :focus").count()).toBeGreaterThan(0);
  });
});
