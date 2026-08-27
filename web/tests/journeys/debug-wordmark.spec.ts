import { test, expect } from "@playwright/test";
test("debug wordmark color", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const homeLink = page.locator('header a[data-cursor="home"]');
  const f = homeLink.getByText("f", { exact: true });
  const style = await f.evaluate(el => ({
    inlineStyle: (el as HTMLElement).style.color,
    computedColor: getComputedStyle(el).color,
    tagName: el.tagName,
    className: el.className,
    outerHTML: (el as HTMLElement).outerHTML,
    parentClassName: el.parentElement?.className,
    parentOuterHTML: el.parentElement?.outerHTML?.substring(0, 200),
  }));
  console.log("DEBUG:", JSON.stringify(style, null, 2));
});
