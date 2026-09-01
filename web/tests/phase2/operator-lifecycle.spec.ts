import { expect, test } from "@playwright/test";

test("recovery renders no protected identity or navigation", async ({ page }) => {
  await page.goto("/ops/recover?mode=reauthenticate&returnTo=https://evil.test", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toBeVisible();
  await expect(page.getByText("this url is open for viewing and production records.")).toBeVisible();
  await expect(page.getByRole("link", { name: "open wtf os" })).toHaveAttribute("href", "/");
  await expect(page.locator("nav[aria-label='Application']")).toHaveCount(0);
  await expect(page.locator("text=/super_admin|audit ledger|operator access/i")).toHaveCount(0);
});

test("logout recovery stays public-safe", async ({ page }) => {
  await page.goto("/ops/recover?mode=signing-out", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "signing out" })).toBeVisible();
  await expect(page.getByText("local operator state was cleared.")).toBeVisible();
  await expect(page.getByRole("link", { name: "open wtf os" })).toBeVisible();
});
