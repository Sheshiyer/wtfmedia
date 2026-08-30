import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page, role: "admin" | "editor" = "admin") {
  const payload = Buffer.from(
    JSON.stringify({
      operatorId: 1,
      role,
      environment: "local",
      correlationId: `phase2-e2e-${role}`,
      exp: Date.now() + 60_000,
    }),
  ).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({
    "x-wtf-ops-context": payload,
    "x-wtf-ops-proof": proof,
  });
}

test("production chrome is empty and does not invent workflow counts", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "production" })).toBeVisible();
  await expect(page.getByText("no episode records, owners, or counts are inferred.")).toBeVisible();
  await expect(page.getByText("0 episodes")).toHaveCount(0);
  await expect(page.getByText("0 tasks")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "production calendar" })).toBeVisible();
  await page.getByRole("button", { name: "board" }).click();
  await expect(page.getByRole("region", { name: "production board" })).toBeVisible();
  await expect(page.getByLabel("owner")).toBeDisabled();
});

test("editor can open production chrome and administration pages", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "production" })).toBeVisible();
  await expect(page.getByRole("button", { name: "open operations navigation", exact: true })).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "operations", exact: true });
  await expect(navigation.getByRole("link", { name: "production" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "settings" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "operators" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "ingest" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "audit" })).toHaveCount(0);
});
