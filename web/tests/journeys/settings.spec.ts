import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page) {
  const payload = Buffer.from(JSON.stringify({
    operatorId: 1,
    role: "admin",
    environment: "local",
    correlationId: "settings-e2e-admin",
    exp: Date.now() + 60_000,
  })).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({
    "x-wtf-ops-context": payload,
    "x-wtf-ops-proof": proof,
  });
}

test.describe("shared settings", () => {
  test("keeps settings compact until a section is requested", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "settings", exact: true })).toBeVisible();
    const disclosures = page.locator("details[data-testid^='settings-']");
    await expect(disclosures).toHaveCount(7);
    await expect(page.locator("details[data-testid^='settings-'][open]")).toHaveCount(0);

    const workspaceState = page.getByTestId("settings-workspace-state");
    await expect(workspaceState.locator("summary")).toContainText("workspace state");
    await expect(workspaceState).not.toHaveAttribute("open", "");
    await expect(workspaceState.getByText("episodes", { exact: true })).not.toBeVisible();
    await workspaceState.locator("summary").click();
    await expect(workspaceState).toHaveAttribute("open", "");
    await expect(workspaceState.getByText("episodes", { exact: true })).toBeVisible();
    await expect(workspaceState.locator('a[href="/episodes"]')).toHaveCount(1);

    const evidenceReceipt = page.getByTestId("settings-evidence-receipt");
    await expect(evidenceReceipt).not.toHaveAttribute("open", "");
    await evidenceReceipt.locator("summary").click();
    await expect(evidenceReceipt.getByText("catalogue scope", { exact: true })).toBeVisible();
    await expect(evidenceReceipt.locator("dd").filter({ hasText: "55 episodes" })).toBeVisible();
    await expect(evidenceReceipt.locator(".bg-surface-structure")).toHaveCSS("color", "rgb(255, 246, 234)");
  });

  test("shares display-only settings and changelog without configuration actions", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    const appearance = page.getByTestId("settings-appearance");
    await appearance.locator("summary").click();
    await expect(page.getByRole("heading", { name: "appearance", exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "appearance preference" })).toBeVisible();
    await expect(page.getByText("changes only this browser’s visual presentation", { exact: false })).toBeVisible();

    const connections = page.getByTestId("settings-agentic-connections");
    await connections.locator("summary").click();
    await expect(page.getByRole("heading", { name: "agentic connections", exact: true })).toBeVisible();
    await expect(page.getByText("hosted MCP", { exact: true })).toBeVisible();

    const release = page.getByTestId("settings-release-history");
    await expect(release.locator("summary")).toContainText("v0.1.3");
    await release.locator("summary").click();
    await expect(page.getByRole("heading", { name: "changelog", exact: true })).toBeVisible();
    await expect(page.getByText("Local worktree snapshot — not a signed or published release.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /configure|connect|save|apply/i })).toHaveCount(0);
  });

  test("keeps evidence receipt contrast when appearance changes", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    const appearance = page.getByTestId("settings-appearance");
    await appearance.locator("summary").click();
    await page.getByRole("button", { name: "dark", exact: true }).click();

    const evidenceReceipt = page.getByTestId("settings-evidence-receipt");
    await evidenceReceipt.locator("summary").click();
    const evidencePanel = evidenceReceipt.locator(".bg-surface-structure");
    await expect(evidencePanel).toHaveCSS("background-color", "rgb(14, 12, 11)");
    await expect(evidencePanel).toHaveCSS("color", "rgb(255, 246, 234)");
  });
});

test.describe("operator settings", () => {
  test("renders a truthful, read-only settings scaffold for an authorized operator", async ({ page }) => {
    await authenticate(page);
    await page.goto("/ops/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "settings", exact: true })).toBeVisible();
    await page.getByTestId("settings-agentic-connections").locator("summary").click();
    await expect(page.getByRole("heading", { name: "agentic connections", exact: true })).toBeVisible();
    await expect(page.getByText("not configured", { exact: true }).first()).toBeVisible();
    await page.getByTestId("settings-release-history").locator("summary").click();
    await expect(page.getByText("local scaffold", { exact: true })).toBeVisible();
    const ota = page.getByTestId("settings-ota");
    await ota.locator("summary").click();
    await expect(ota.locator("article").getByText("not supported", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "connect" })).toHaveCount(0);
  });
});
