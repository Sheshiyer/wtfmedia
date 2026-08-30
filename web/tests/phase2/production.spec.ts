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

async function mockCalendar(page: Page) {
  let revision = 0;
  let records: Array<Record<string, unknown>> = [];
  await page.route("**/api/calendar**", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: records }) });
      return;
    }
    if (method === "POST") {
      const body = request.postDataJSON();
      revision = 1;
      const event = {
        id: `cal_${"a".repeat(32)}`,
        ...body,
        revision,
        createdAt: "2026-08-30T00:00:00.000Z",
        updatedAt: "2026-08-30T00:00:00.000Z",
      };
      records = [event];
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ event, idempotent: false }) });
      return;
    }
    if (method === "PATCH") {
      const body = request.postDataJSON();
      const current = records[0];
      if (!current || body.revision !== current.revision) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "revision_conflict", currentRevision: current?.revision ?? 0 }) });
        return;
      }
      revision += 1;
      const event = { ...current, ...body, revision, updatedAt: "2026-08-30T00:01:00.000Z" };
      delete event.idempotencyKey;
      records = [event];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ event }) });
      return;
    }
    await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "method_not_allowed" }) });
  });
}

test("production chrome is empty and does not invent workflow counts", async ({ page }) => {
  await authenticate(page);
  await mockCalendar(page);
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "production" })).toBeVisible();
  await expect(page.getByText("records shown here come from the target D1 calendar.", { exact: false })).toBeVisible();
  await expect(page.getByText("0 episodes")).toHaveCount(0);
  await expect(page.getByText("0 tasks")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "production calendar" })).toBeVisible();
  await page.getByRole("button", { name: "board" }).click();
  await expect(page.getByRole("region", { name: "production board" })).toBeVisible();
  await expect(page.getByLabel("owner label")).toBeEnabled();
});

test("production copy states the temporary anonymous D1 policy", async ({ page }) => {
  await authenticate(page);
  await mockCalendar(page);
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });

  const policyCopy = page.locator("p").filter({ hasText: "records shown here come from the target D1 calendar" });
  await expect(policyCopy).toContainText("edits are anonymous and cannot be attributed to a verified person.");
  await expect(policyCopy).toContainText("delete is unavailable.");
});

test("operator can create, drag, and update a response-backed calendar record", async ({ page }) => {
  await authenticate(page);
  await mockCalendar(page);
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });

  await page.getByLabel("day").fill("2026-08-29");
  await page.getByLabel("colour / flow").selectOption("knowledge");
  await page.getByLabel("production note").fill("source receipt check");
  await page.getByRole("button", { name: "create record" }).click();
  await expect(page.getByText("calendar record saved in D1", { exact: false })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  const record = page.getByRole("button", { name: "select record source receipt check" });
  await expect(record).toHaveAttribute("data-pin-tone", "knowledge");
  await record.click();

  await record.dragTo(page.locator('[data-calendar-day="2026-08-30"]'));
  await page.getByLabel("day").fill("2026-08-31");
  await page.getByLabel("column").selectOption("blocked");
  await page.getByRole("button", { name: "update selected record" }).click();
  await page.getByRole("button", { name: "board" }).click();

  const blockedColumn = page.locator('[data-production-column="blocked"]');
  await expect(blockedColumn.getByRole("button", { name: "select record source receipt check" })).toBeVisible();
  await expect(blockedColumn.getByText("2026-08-31")).toBeVisible();
});

test("failed calendar creation preserves the form and reports server truth", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/calendar**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [] }) });
      return;
    }
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "calendar_unavailable" }) });
  });
  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });
  await page.getByLabel("day").fill("2026-08-29");
  await page.getByLabel("production note").fill("keep this input");
  await page.getByRole("button", { name: "create record" }).click();

  await expect(page.locator('p[role="alert"]')).toContainText("your changes were not saved");
  await expect(page.getByLabel("day")).toHaveValue("2026-08-29");
  await expect(page.getByLabel("production note")).toHaveValue("keep this input");
  await expect(page.getByRole("button", { name: "select record keep this input" })).toHaveCount(0);
});

test("editor can open production chrome but not administration", async ({ page }) => {
  await authenticate(page, "editor");
  await mockCalendar(page);
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
