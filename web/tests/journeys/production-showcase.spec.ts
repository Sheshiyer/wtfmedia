import { expect, test } from "@playwright/test";

test.describe("public production calendar showcase", () => {
  test("renders the calendar and local planning tools without operations authentication", async ({ page }) => {
    await page.goto("/production", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/production$/);
    await expect(page.getByRole("heading", { name: "production calendar", exact: true })).toBeVisible();
    await expect(page.getByText("local UI showcase", { exact: false })).toBeVisible();
    await expect(page.getByRole("region", { name: "production calendar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "board", exact: true })).toBeVisible();
    await expect(page.getByLabel("production note")).toBeVisible();
  });
});
