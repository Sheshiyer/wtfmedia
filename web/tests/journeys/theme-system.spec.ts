import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

type Theme = "light" | "dark";

const colors: Record<Theme, { canvas: string; foreground: string; raised: string; overlay: string }> = {
  light: {
    canvas: "rgb(255, 246, 234)",
    foreground: "rgb(26, 26, 26)",
    raised: "rgb(255, 252, 247)",
    overlay: "rgba(26, 26, 26, 0.7)",
  },
  dark: {
    canvas: "rgb(23, 21, 19)",
    foreground: "rgb(255, 246, 234)",
    raised: "rgb(49, 45, 40)",
    overlay: "rgba(14, 12, 11, 0.7)",
  },
};

async function useSystemTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme });
}

async function expectAppTheme(page: Page, theme: Theme) {
  const expected = colors[theme];
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-wtf-ui", "wtfos");
  await expect(root).toHaveAttribute("data-wtf-theme", theme);
  await expect.poll(async () =>
    page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe(expected.canvas);
  await expect.poll(async () =>
    page.locator("body").evaluate((element) => getComputedStyle(element).color),
  ).toBe(expected.foreground);
}

async function authenticate(page: Page, role: "admin" | "super_admin") {
  const payload = Buffer.from(
    JSON.stringify({
      operatorId: 1,
      role,
      environment: "local",
      correlationId: `theme-system-${role}`,
      exp: Date.now() + 60_000,
    }),
  ).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key")
    .update(payload)
    .digest("base64url");
  await page.setExtraHTTPHeaders({
    "x-wtf-ops-context": payload,
    "x-wtf-ops-proof": proof,
  });
}

async function expectRaisedDialog(
  page: Page,
  theme: Theme,
  overlay = colors[theme].overlay,
) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect.poll(async () =>
    dialog.evaluate((element, expected) => {
      const direct = getComputedStyle(element).backgroundColor;
      const surface = direct === expected ? element : element.querySelector("section");
      return surface ? getComputedStyle(surface).backgroundColor : "";
    }, colors[theme].raised),
  ).toBe(colors[theme].raised);
  await expect.poll(async () =>
    page.locator('[data-state="open"], [role="dialog"]').evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backgroundColor),
    ),
  ).toContain(overlay);
}

test.describe("WTF OS light theme journeys", () => {
  for (const systemTheme of ["light", "dark"] as const) {
    test(`public workspace routes keep light surfaces under ${systemTheme} system preference`, async ({ page }) => {
      await useSystemTheme(page, systemTheme);

      for (const [path, heading] of [
        ["/", "the room"],
        ["/episodes", "episodes"],
        ["/connections", "connections"],
        ["/chat", "ask wtf"],
      ] as const) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
        await expectAppTheme(page, "light");
      }
    });

    test(`access recovery routes keep light surfaces under ${systemTheme} system preference`, async ({ page }) => {
      await useSystemTheme(page, systemTheme);

      for (const [path, heading] of [
        ["/sign-in", "sign-in is not in this release"],
        ["/request-access", "seats are not open yet"],
        ["/ops/recover?mode=unavailable", "operations unavailable"],
      ] as const) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: heading })).toBeVisible();
        await expectAppTheme(page, "light");
      }
    });
  }

  test("episode detail renders raised light surfaces under dark system preference", async ({ page }) => {
    await useSystemTheme(page, "dark");
    await page.goto("/episodes", { waitUntil: "domcontentloaded" });
    const firstCard = page.locator('[data-cursor="open"]:visible').first();
    await Promise.all([
      page.waitForURL(/\/episodes\/[A-Za-z0-9_-]+$/),
      firstCard.click(),
    ]);

    await expectAppTheme(page, "light");
    const sourceCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "youtube published version" }),
    }).first();
    await expect.poll(async () =>
      sourceCard.evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe(colors.light.raised);
  });

  test("connections stay on the light palette when the system theme changes without a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    await expectAppTheme(page, "light");

    const canvas = page.locator('[data-testid="graph-canvas"] canvas');
    await expect(canvas).toBeVisible();
    const lightGraphState = await canvas.evaluate((element) => {
      const graph = element as HTMLCanvasElement;
      const style = getComputedStyle(document.documentElement);
      const context = graph.getContext("2d", { willReadFrequently: true });
      const pixels = context?.getImageData(0, 0, graph.width, graph.height).data;
      return {
        foreground: style.getPropertyValue("--wtf-foreground-rgb").trim(),
        structure: style.getPropertyValue("--wtf-surface-structure-rgb").trim(),
        hasInk: pixels ? pixels.some((value, index) => index % 4 !== 3 && value < 250) : false,
      };
    });

    await useSystemTheme(page, "dark");
    await expectAppTheme(page, "light");
    const darkGraphState = await canvas.evaluate((element) => {
      const graph = element as HTMLCanvasElement;
      const style = getComputedStyle(document.documentElement);
      const context = graph.getContext("2d", { willReadFrequently: true });
      const pixels = context?.getImageData(0, 0, graph.width, graph.height).data;
      return {
        foreground: style.getPropertyValue("--wtf-foreground-rgb").trim(),
        structure: style.getPropertyValue("--wtf-surface-structure-rgb").trim(),
        hasInk: pixels ? pixels.some((value, index) => index % 4 !== 3 && value < 250) : false,
      };
    });

    expect(darkGraphState).toEqual(lightGraphState);
  });

  test("operator confirmation dialogs remain raised and readable under dark system preference", async ({ page }) => {
    await useSystemTheme(page, "dark");
    await page.route("**/api/ops/operators", (route) =>
      route.fulfill({
        json: {
          operators: [
            {
              name: "Owner",
              email: "owner@example.test",
              role: "super_admin",
              active: true,
              changedAt: "2026-08-26T00:00:00.000Z",
            },
            {
              name: "Approved Person",
              email: "approved@example.test",
              role: "editor",
              active: true,
              changedAt: "2026-08-26T00:00:00.000Z",
            },
          ],
        },
      }),
    );
    await authenticate(page, "super_admin");
    await page.goto("/ops/operators", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "transfer seat" }).click();
    await expectAppTheme(page, "light");
    await expectRaisedDialog(page, "light");
  });

  test("audit export confirmation remains raised and readable under dark system preference", async ({ page }) => {
    await useSystemTheme(page, "dark");
    await page.route("**/api/ops/audit*", (route) => route.fulfill({ json: { records: [] } }));
    await authenticate(page, "admin");
    await page.goto("/ops/audit", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "export audit records" }).click();
    await expectAppTheme(page, "light");
    await expectRaisedDialog(page, "light");
  });
});
