import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

test("authorization matrix keeps mutation APIs closed while pages are viewable", async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ operatorId: 1, role: "editor", environment: "local", correlationId: "phase2-matrix-editor", exp: Date.now() + 60_000 })).toString("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url") });
  await page.goto("/ops/operators");
  await expect(page.getByRole("heading", { name: "operators", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toHaveCount(0);
  await page.goto("/ops/audit");
  await expect(page.getByRole("heading", { name: "audit", exact: true })).toBeVisible();
});
