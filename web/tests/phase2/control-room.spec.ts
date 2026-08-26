import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page, role: "admin" | "editor" = "admin") {
  const payload = Buffer.from(JSON.stringify({
    operatorId: 1,
    role,
    environment: "local",
    correlationId: `phase2-e2e-${role}`,
    exp: Date.now() + 60_000,
  })).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": proof });
}

test("truthful role-projected Control Room shell shows only activated administration navigation", async ({ page }) => {
  await authenticate(page);
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "control room" })).toBeVisible();
  await expect(page.getByText("your access is verified. workflow systems will appear here when they are activated.")).toBeVisible();
  if ((page.viewportSize()?.width ?? 1024) < 1024) await page.getByRole("button", { name: "menu" }).click();
  await expect(page.getByRole("navigation", { name: "Operations" }).getByRole("link", { name: "Operators" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Operations" }).getByRole("link", { name: "Audit" })).toBeVisible();
  await expect(page.getByText("all systems operational")).toHaveCount(0);
});

test("editor role exposes only the activated Control Room destination", async ({ page }) => {
  await authenticate(page, "editor");
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  if ((page.viewportSize()?.width ?? 1024) < 1024) await page.getByRole("button", { name: "menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Operations" });
  await expect(navigation.getByRole("link", { name: "Control Room" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Operators" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Audit" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "open Ask WTF" })).toBeVisible();
});

test("responsive shell has no horizontal overflow", async ({ page }) => {
  await authenticate(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "menu" }).click();
  await expect(page.getByRole("dialog", { name: "Operations navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Operations navigation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "menu" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
