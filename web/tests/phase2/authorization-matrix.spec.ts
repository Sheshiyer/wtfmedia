import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

test("authorization matrix denies editor discovery of administrative routes", async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ operatorId: 1, role: "editor", environment: "local", correlationId: "phase2-matrix-editor", exp: Date.now() + 60_000 })).toString("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url") });
  for (const route of ["/ops/operators", "/ops/audit"]) { await page.goto(route); await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toBeVisible(); }
});
