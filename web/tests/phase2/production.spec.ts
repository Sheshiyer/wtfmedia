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

test("production copy stays local and does not claim a shared audit record", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("local sketches stay in this browser tab and are not backend records.")).toBeVisible();
  await expect(page.getByText(/shared audit record/i)).toHaveCount(0);
});

test("operator can place, drag, and move a colour-coded local sketch", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });

  await page.getByLabel("day").fill("2026-08-29");
  await page.getByLabel("colour / flow").selectOption("knowledge");
  await page.getByLabel("production note").fill("source receipt check");
  await page.getByRole("button", { name: "place local sketch" }).click();

  const sketch = page.getByRole("button", { name: "select sketch source receipt check" });
  await expect(sketch).toHaveAttribute("data-pin-tone", "knowledge");

  await sketch.dragTo(page.locator('[data-calendar-day="2026-08-30"]'));
  await page.getByLabel("day").fill("2026-08-31");
  await page.getByLabel("column").selectOption("blocked");
  await page.getByRole("button", { name: "move selected sketch" }).click();
  await page.getByRole("button", { name: "board" }).click();

  const blockedColumn = page.locator('[data-production-column="blocked"]');
  await expect(blockedColumn.getByRole("button", { name: "select sketch source receipt check" })).toBeVisible();
  await expect(blockedColumn.getByText("2026-08-31")).toBeVisible();
});

test("editor can open production chrome but not administration", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "production" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1024) < 1024) {
    await page.getByRole("button", { name: "controls", exact: true }).click();
    const controls = page.getByRole("dialog", { name: "workspace controls" });
    await expect(controls.getByRole("button", { name: "open production" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "open operators" })).toHaveCount(0);
    return;
  }
  const navigation = page.getByRole("navigation", { name: "operations", exact: true });
  await expect(navigation.getByRole("link", { name: "production" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "operators" })).toHaveCount(0);
});
