import { expect, test } from "@playwright/test";

const composerColors = {
  light: {
    textareaBackground: "rgb(255, 246, 234)",
    textareaForeground: "rgb(26, 26, 26)",
    disabledButtonBackground: "rgb(240, 234, 223)",
    disabledButtonForeground: "rgb(114, 104, 93)",
  },
  dark: {
    textareaBackground: "rgb(23, 21, 19)",
    textareaForeground: "rgb(255, 246, 234)",
    disabledButtonBackground: "rgb(38, 35, 31)",
    disabledButtonForeground: "rgb(170, 160, 147)",
  },
} as const;

async function openWorkspaceControls(page: import("@playwright/test").Page) {
  if ((page.viewportSize()?.width ?? 1024) < 1024) {
    await page.getByRole("button", { name: "controls", exact: true }).click();
  } else {
    await page.getByTestId("global-command-trigger").click();
  }
  return page.getByRole("dialog", { name: "workspace controls" });
}

test.describe("WTF OS appearance preference", () => {
  test("persists an explicit dark choice through the available navigation surface", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const controls = await openWorkspaceControls(page);
    await controls.getByRole("button", { name: "use dark appearance", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-wtf-theme", "dark");
    await page.reload({ waitUntil: "domcontentloaded" });
    const restoredControls = await openWorkspaceControls(page);
    await expect(restoredControls.getByRole("button", { name: "use dark appearance", exact: true })).toBeVisible();
  });

  test("offers the same preference choices from compact workspace controls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const controls = await openWorkspaceControls(page);
    await expect(controls.getByRole("button", { name: "use system appearance", exact: true })).toBeVisible();
    await expect(controls.getByRole("button", { name: "use light appearance", exact: true })).toBeVisible();
    await expect(controls.getByRole("button", { name: "use dark appearance", exact: true })).toBeVisible();
  });

  test("keeps the chat composer readable in explicit light and dark appearances", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.getByTestId("global-command-trigger").click();

    for (const preference of ["light", "dark"] as const) {
      await page.getByRole("button", { name: `use ${preference} appearance`, exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-wtf-theme", preference);

      await expect.poll(async () => page.evaluate(() => {
        const textarea = document.querySelector("textarea");
        const submit = document.querySelector('button[type="submit"]');
        if (!textarea || !submit) throw new Error("Expected chat composer controls");

        const textareaStyle = getComputedStyle(textarea);
        const submitStyle = getComputedStyle(submit);
        return {
          textareaBackground: textareaStyle.backgroundColor,
          textareaForeground: textareaStyle.color,
          disabledButtonBackground: submitStyle.backgroundColor,
          disabledButtonForeground: submitStyle.color,
        };
      })).toEqual(composerColors[preference]);
    }
  });
});
