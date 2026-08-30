import { expect, test } from "@playwright/test";

test.describe("public production calendar showcase", () => {
  test("renders the response-backed calendar without operations authentication", async ({ page }) => {
    await page.route("**/api/calendar**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ events: [] }),
    }));
    await page.goto("/production", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/production$/);
    await expect(page.getByRole("heading", { name: "production calendar", exact: true })).toBeVisible();
    await expect(page.getByText("shared target D1 records", { exact: false })).toBeVisible();
    await expect(page.getByText("before any records are wired", { exact: false })).toHaveCount(0);
    await expect(page.getByText("records shown here come from the target D1 calendar", { exact: false })).toBeVisible();
    await expect(page.getByRole("region", { name: "production calendar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "board", exact: true })).toBeVisible();
    await expect(page.getByLabel("production note")).toBeVisible();
  });
});
