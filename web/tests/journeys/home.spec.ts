import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function lockToLoopback(page: Page) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      await route.continue();
      return;
    }
    await route.abort("blockedbyclient");
  });
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

test.describe("WTF OS public home", () => {
  test("uses a real catalogue episode as the labelled source spotlight", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const spotlight = page.getByTestId("source-spotlight");
    await expect(spotlight).toBeVisible();
    await expect(spotlight.getByText("source spotlight", { exact: true })).toBeVisible();
    await expect(spotlight.getByRole("link", { name: /open source receipt/i })).toHaveAttribute(
      "href",
      /\/episodes\?episode=/,
    );
  });

  test("keeps the public workspace grounded in the current catalogue", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await settle(page);

    await expect(page.getByRole("heading", { name: "the room", exact: true })).toBeVisible();
    await expect(page.getByTestId("cta-primary")).toHaveAttribute("href", "/chat");
    await expect(page.getByRole("heading", { name: "workspace state", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "source rail", exact: true })).toBeVisible();
    await expect(page.getByText("open the local production calendar and board showcase before its records are wired.")).toHaveCount(0);
  });

  test("keeps navigation routes available from the dock or compact controls", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    if ((page.viewportSize()?.width ?? 1024) < 1024) {
      await page.getByRole("button", { name: "controls", exact: true }).click();
      const controls = page.getByRole("dialog", { name: "workspace controls" });
      await expect(controls.getByRole("button", { name: "open production", exact: true })).toBeVisible();
      await expect(controls.getByRole("button", { name: "open settings", exact: true })).toBeVisible();
      await expect(controls.getByRole("button", { name: "open episodes", exact: true })).toBeVisible();
      await expect(controls.getByRole("button", { name: "open connections", exact: true })).toBeVisible();
      await expect(controls.getByRole("button", { name: "open source chat", exact: true })).toBeVisible();
      return;
    }
    const navigation = page.getByRole("navigation", { name: "Application", exact: true });

    await expect(navigation.getByRole("link", { name: "production", exact: true })).toHaveAttribute(
      "href",
      "/production",
    );
    await expect(navigation.getByRole("link", { name: "settings", exact: true })).toHaveAttribute(
      "href",
      "/settings",
    );

    await expect(navigation.getByRole("link", { name: "episodes", exact: true })).toHaveAttribute(
      "href",
      "/episodes",
    );
    await expect(navigation.getByRole("link", { name: "connections", exact: true })).toHaveAttribute(
      "href",
      "/connections",
    );
    await expect(navigation.getByRole("link", { name: "source chat", exact: true })).toHaveAttribute(
      "href",
      "/chat",
    );
  });

  test("has no serious or critical axe violations", async ({ page }) => {
    await lockToLoopback(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.unroute("**/*");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      seriousOrCritical,
      `Found serious/critical axe violations: ${seriousOrCritical.map((item) => item.id).join(", ")}`,
    ).toEqual([]);
  });
});
