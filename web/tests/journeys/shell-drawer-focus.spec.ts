import { expect, test } from "@playwright/test";

test.describe("Public shell application navigation focus", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("top disclosure is keyboard reachable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "open navigation", exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "application navigation" })).toHaveCount(0);
    await expect(page.locator(".wtf-bottom-pill")).toHaveCount(0);

    const navigation = page.getByRole("navigation", { name: "Application", exact: true });
    await expect(navigation).toBeHidden();
    await page.getByRole("button", { name: "Open application navigation" }).click();
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "the room", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link").first()).toBeFocused();

    const railBox = await page.locator("[data-top-app-rail]").boundingBox();
    const navigationBox = await navigation.boundingBox();
    expect(railBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(navigationBox!.y).toBeGreaterThanOrEqual(railBox!.y + railBox!.height);
  });
});
