import { expect, test, type Locator, type Page } from "@playwright/test";

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function ratio(first: string, second: string) {
  const parse = (value: string) => value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
  const luminance = (value: string) => {
    const [red, green, blue] = parse(value).map(channel);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectContrast(locator: Locator) {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor };
  });
  expect(ratio(colors.color, colors.background), JSON.stringify(colors)).toBeGreaterThanOrEqual(4.5);
}

async function setDarkPreference(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.setItem("wtfmedia:appearance", "dark"));
}

test.describe("WTF OS command dock and dark contrast", () => {
  test("offers an accessible global command surface from the responsive dock", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "the desktop dock is intentionally replaced by the mobile header");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("app-dock")).toBeVisible();
    await page.keyboard.press("Meta+k");
    const dialog = page.getByRole("dialog", { name: "workspace controls" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("capability register", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "use dark appearance", exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "open settings", exact: true })).toBeVisible();

    await dialog.getByRole("button", { name: "open connections", exact: true }).click();
    await expect(page).toHaveURL(/\/connections$/);
  });

  test("keeps dock, atlas index, and selected source receipt readable in dark mode", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "desktop dock contrast is covered at its rendered desktop breakpoint");
    await setDarkPreference(page);
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("data-wtf-theme", "dark");
    await expectContrast(page.getByTestId("app-dock").getByRole("link").first());
    const firstIdea = page.getByTestId("graph-node-list").getByRole("button").first();
    await expectContrast(firstIdea);
    await firstIdea.click();
    await expectContrast(page.getByTestId("graph-selection-detail").getByRole("link").first());
  });

  test("uses one compact controls trigger without a left navigation drawer", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "controls", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open application navigation", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "controls", exact: true }).click();
    const controls = page.getByRole("dialog", { name: "workspace controls" });
    await expect(controls).toBeVisible();
    await expect(controls.getByRole("button", { name: "open connections", exact: true })).toBeVisible();
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  });

  test("keeps compact workspace controls readable in dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await setDarkPreference(page);
    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "controls", exact: true }).click();

    const controls = page.getByRole("dialog", { name: "workspace controls" });
    const firstCommand = controls.getByRole("button", { name: "open control room", exact: true });
    const colors = await firstCommand.evaluate((element) => {
      const root = getComputedStyle(document.documentElement);
      const drawerElement = element.closest('[role="dialog"]');
      return {
        foreground: getComputedStyle(element).color,
        surface: drawerElement ? getComputedStyle(drawerElement).backgroundColor : "",
        expectedForeground: root.getPropertyValue("--wtf-foreground-rgb").trim(),
        expectedSurface: root.getPropertyValue("--wtf-surface-raised-rgb").trim(),
      };
    });

    expect(colors.foreground).toContain(colors.expectedForeground.replaceAll(" ", ", "));
    expect(colors.surface).toContain(colors.expectedSurface.replaceAll(" ", ", "));
    expect(ratio(colors.foreground, colors.surface), JSON.stringify(colors)).toBeGreaterThanOrEqual(4.5);
  });
});
