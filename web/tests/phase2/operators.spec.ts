import { test, expect, authenticate } from "./fixtures";

test("roster route is truthful when its protected service is unavailable", async ({ page }) => {
  await authenticate(page, "admin");
  await page.goto("/beta/settings/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "users & access" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "operator roster unavailable" })).toBeVisible();
  await expect(page.getByText("no roster details were loaded.")).toBeVisible();
  await expect(page.getByText("Yash")).toHaveCount(0);
});

test("editors cannot open protected users settings", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/beta/settings/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "access is not granted", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toHaveCount(0);
});

test("transfer controls are absent until a verified roster can identify an active target", async ({ page }) => {
  await authenticate(page, "admin");
  await page.goto("/beta/settings/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "transfer seat" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "deactivate operator" })).toHaveCount(0);
});

test("transfer uses a separate super-admin confirmation with a verified target", async ({ page }) => {
  await page.route("**/api/ops/operators", async (route) => {
    await route.fulfill({ json: { operators: [
      { name: "Owner", email: "owner@example.test", role: "super_admin", active: true, changedAt: "2026-08-26T00:00:00.000Z" },
      { name: "Approved Person", email: "approved@example.test", role: "editor", active: true, changedAt: "2026-08-26T00:00:00.000Z" },
    ] } });
  });
  await authenticate(page, "super_admin");
  await page.goto("/beta/settings/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "transfer seat" })).toBeVisible();
  await page.getByRole("button", { name: "transfer seat" }).click();
  await expect(page.getByRole("dialog")).toContainText("this makes approved@example.test the single super admin and records the handoff.");
  await expect(page.getByRole("button", { name: "keep current owner" })).toBeFocused();
});
