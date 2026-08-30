import { expect, test } from "@playwright/test";

test.describe("WTF OS appearance preference", () => {
  test("persists an explicit dark choice in compact settings", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    const appearance = page.getByTestId("settings-appearance");
    await appearance.locator("summary").click();
    await page.getByRole("button", { name: "dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-wtf-theme", "dark");
    await page.reload({ waitUntil: "domcontentloaded" });
    await appearance.locator("summary").click();
    await expect(page.getByRole("button", { name: "dark", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("offers the same preference choices at the mobile breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    const appearance = page.getByTestId("settings-appearance");
    await appearance.locator("summary").click();
    await expect(appearance.getByRole("button", { name: "system", exact: true })).toBeVisible();
    await expect(appearance.getByRole("button", { name: "light", exact: true })).toBeVisible();
    await expect(appearance.getByRole("button", { name: "dark", exact: true })).toBeVisible();
  });
});
