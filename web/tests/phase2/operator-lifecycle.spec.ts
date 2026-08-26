import { expect, test } from "@playwright/test";

test("recovery renders no protected identity or navigation", async ({ page }) => {
  await page.goto("/ops/recover?mode=reauthenticate&returnTo=https://evil.test", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "let’s verify your access" })).toBeVisible();
  await expect(page.getByText("protected workspace data has been cleared.")).toBeVisible();
  await expect(page.getByRole("link", { name: "sign in again" })).toHaveAttribute("href", "/ops");
  await expect(page.locator("nav[aria-label='Operations']")).toHaveCount(0);
  await expect(page.locator("text=/super_admin|audit ledger|operator access/i")).toHaveCount(0);
});

test("logout recovery stays public-safe", async ({ page }) => {
  await page.goto("/ops/recover?mode=signing-out", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "signing out" })).toBeVisible();
  await expect(page.getByText("protected workspace data has been cleared.")).toBeVisible();
  await expect(page.getByRole("link", { name: "return to the catalogue" })).toBeVisible();
});
