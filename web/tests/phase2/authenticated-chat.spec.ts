import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function authenticate(page: Page, role: "admin" | "editor" = "admin") {
  const payload = Buffer.from(JSON.stringify({
    operatorId: 1,
    role,
    environment: "local",
    correlationId: `phase3-chat-${role}`,
    exp: Date.now() + 60_000,
  })).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": proof });
}

test.describe("authenticated Ask WTF projection", () => {
  test("keeps the history shell server-held when the release gate is off", async ({ page }) => {
    await authenticate(page);
    await page.goto("/ops/chat", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "authenticated chat is not activated", exact: true })).toBeVisible();
    await expect(page.getByText("this release is held behind the server release gate.", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "open public ask wtf", exact: true })).toHaveAttribute("href", "/chat");
    await expect(page.locator("[data-chat-history] [data-conversation-row]")).toHaveCount(0);
  });

  test("does not let a deep-link slug authorize an unavailable conversation", async ({ page }) => {
    await page.goto("/chat/conversation_01-alice", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "operator chat unavailable", exact: true })).toBeVisible();
    await expect(page.getByText("sign in through the approved operator access path to continue.", { exact: true })).toBeVisible();
    await expect(page.locator("[data-testid=authenticated-chat-thread]")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("conversation_01");
  });
});
