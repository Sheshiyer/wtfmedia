import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page, role: "admin" | "editor") { const payload = Buffer.from(JSON.stringify({ operatorId: 1, role, environment: "local", correlationId: `phase2-audit-${role}`, exp: Date.now() + 60_000 })).toString("base64url"); await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url") }); }

test("ledger renders only its allowlisted envelope", async ({ page }) => {
  await page.route("**/api/ops/audit*", (route) => route.fulfill({ json: { records: [{ timestamp: "2026-08-26T00:00:00.000Z", subject: "recorded operator", role: "admin", action: "operator_invite", entityType: "operator", entityId: "invitation", outcome: "succeeded", environment: "local", correlationId: "fixture-correlation" }] } }));
  await authenticate(page, "admin"); await page.goto("/ops/audit", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "audit ledger" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) < 768) {
    await expect(page.getByRole("listitem").filter({ hasText: "fixture-correlation" })).toBeVisible();
  } else {
    await expect(page.getByRole("cell", { name: "fixture-correlation" })).toBeVisible();
  }
  await expect(page.getByText(/token|prompt|provider/i)).toHaveCount(0);
});

test("denied roles receive recovery without audit chrome", async ({ page }) => {
  await authenticate(page, "editor"); await page.goto("/ops/audit", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "let’s verify your access" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "audit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "export audit records" })).toHaveCount(0);
});

test("export confirms filters without previewing audit rows", async ({ page }) => {
  await page.route("**/api/ops/audit*", (route) => route.fulfill({ json: { records: [] } }));
  await authenticate(page, "admin"); await page.goto("/ops/audit", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "export audit records" }).click();
  await expect(page.getByRole("dialog")).toContainText("this export is recorded. active filters: none.");
  await expect(page.getByRole("dialog")).not.toContainText("fixture-correlation");
});
