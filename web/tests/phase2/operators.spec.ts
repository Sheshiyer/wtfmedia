import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page, role: "super_admin" | "admin" | "editor") {
  const payload = Buffer.from(JSON.stringify({ operatorId: 1, role, environment: "local", correlationId: `phase2-operators-${role}`, exp: Date.now() + 60_000 })).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": proof });
}

test("roster route is truthful when its protected service is unavailable", async ({ page }) => {
  await authenticate(page, "admin");
  await page.goto("/ops/operators", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "operators" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "operator roster unavailable" })).toBeVisible();
  await expect(page.getByText("no roster details were loaded.")).toBeVisible();
  await expect(page.getByText("Yash")).toHaveCount(0);
});

test("denied roles receive recovery without roster chrome", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/ops/operators", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "let’s verify your access" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "operators" })).toHaveCount(0);
  await expect(page.getByText("operator roster")).toHaveCount(0);
});

test("transfer controls are absent until a verified roster can identify an active target", async ({ page }) => {
  await authenticate(page, "admin");
  await page.goto("/ops/operators", { waitUntil: "domcontentloaded" });
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
  await page.goto("/ops/operators", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("cell", { name: "approved@example.test" })).toBeVisible();
  await page.getByRole("button", { name: "transfer seat" }).click();
  await expect(page.getByRole("dialog")).toContainText("this makes approved@example.test the single super admin and records the handoff.");
  await expect(page.getByRole("button", { name: "keep current owner" })).toBeFocused();
});
