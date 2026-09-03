import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const destinations = [
  { href: "/", label: "the room", heading: "the room" },
  { href: "/episodes", label: "episodes", heading: "episodes" },
  { href: "/connections", label: "connections", heading: "connections" },
  { href: "/chat", label: "ask wtf", heading: "ask wtf" },
  { href: "/ops", label: "control room", heading: "control room" },
  { href: "/ops/production", label: "production", heading: "production" },
  { href: "/ops/episodes", label: "episode map", heading: "episodes" },
  { href: "/ops/settings", label: "settings", heading: "settings" },
] as const;

const heldDestinations = [
  { href: "/ops/ingest", label: "ingest", heading: "ingest" },
  { href: "/ops/operators", label: "operators", heading: "operators" },
  { href: "/ops/audit", label: "audit", heading: "audit" },
] as const;

async function openCurrentNav(page: Page) {
  const toggle = page.locator("[data-navigation-toggle]:visible").first();
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await expect(page.locator('nav[aria-label="Operations"]:visible').first()).toBeVisible();
}

function currentNavigation(page: Page) {
  return page.locator(".wtf-bottom-pill, nav[aria-label='Operations']");
}

function railLink(page: Page, label: string) {
  return currentNavigation(page).getByRole("link", { name: label, exact: true }).first();
}

async function authenticate(page: Page, role: "super_admin" | "admin" | "editor") {
  const payload = Buffer.from(JSON.stringify({
    operatorId: 1,
    role,
    environment: "local",
    correlationId: `phase2-ungated-${role}`,
    exp: Date.now() + 60_000,
  })).toString("base64url");
  const proof = createHmac("sha256", "phase2-e2e-test-key").update(payload).digest("base64url");
  await page.setExtraHTTPHeaders({ "x-wtf-ops-context": payload, "x-wtf-ops-proof": proof });
}

test("ungated release can open ops pages without an access proof", async ({ page }) => {
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "control room", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toHaveCount(0);

  await page.goto("/ops/episodes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "episodes", exact: true })).toBeVisible();
  const mappedMetric = page.locator("dt", { hasText: /^mapped$/ }).locator("..");
  await expect(mappedMetric).toBeVisible();
  await expect(mappedMetric.locator("dd")).toHaveText("59");

  await page.goto("/ops/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "production", exact: true })).toBeVisible();
});

test("episode map opens the exact public detail page for an explicit mapping", async ({ page }) => {
  await page.goto("/ops/episodes", { waitUntil: "domcontentloaded" });

  const detailLink = page.getByRole("link", { name: "open Ajay Banga podcast", exact: true });
  await expect(detailLink).toHaveAttribute("href", "/episodes/QdWHGjReLUo");

  await Promise.all([
    page.waitForURL("/episodes/QdWHGjReLUo"),
    detailLink.click(),
  ]);
  await expect(page.getByRole("heading", { name: /World Bank President/ })).toBeVisible();
});

test("public Alpha hides operator context from settings", async ({ page }) => {
  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-ops-context-strip]")).toHaveCount(0);

  await page.goto("/ops/settings", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-ops-context-strip]")).toHaveCount(0);
  await expect(page.getByText("current public version", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "sign in for beta" })).toBeVisible();
});

test("authenticated Beta settings show operator context", async ({ page }) => {
  await authenticate(page, "super_admin");
  await page.goto("/ops/settings", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-ops-context-strip]")).toBeVisible();
  await expect(page.locator("dt", { hasText: /^environment$/ })).toBeVisible();
  await expect(page.locator("[data-operator-logout]")).toHaveAttribute("href", /access\/logout/);
  await expect(page.getByRole("link", { name: "log out to public alpha", exact: true })).toBeVisible();
});

test("public-link held ops pages use coming soon widgets instead of dead controls", async ({ page }) => {
  await page.goto("/ops/ingest", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("ingest admin", { exact: true })).toBeVisible();
  await expect(page.getByText("coming soon")).toBeVisible();
  await expect(page.getByRole("button", { name: /check youtube connection/i })).toHaveCount(0);

  await page.goto("/ops/operators", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Operator seats are not a live gate")).toBeVisible();
  await expect(page.getByRole("button", { name: /invite approved operator/i })).toHaveCount(0);

  await page.goto("/ops/audit", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Audit export and protected event reads are not active")).toBeVisible();
  await expect(page.getByRole("button", { name: /export audit records/i })).toHaveCount(0);
});

test("public and operator rails include every current destination", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await openCurrentNav(page);
  for (const destination of destinations) {
    await expect(railLink(page, destination.label)).toBeVisible();
  }

  await page.goto("/ops", { waitUntil: "domcontentloaded" });
  await openCurrentNav(page);
  for (const destination of destinations) {
    await expect(railLink(page, destination.label)).toBeVisible();
  }
  for (const destination of heldDestinations) {
    await expect(railLink(page, destination.label)).toHaveCount(0);
  }
});

test("ungated rail can open every current page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const destination of destinations) {
    await openCurrentNav(page);
    const link = railLink(page, destination.label);
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL((url) => url.pathname === destination.href);
    await expect(page.getByRole("heading", { name: destination.heading, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toHaveCount(0);
  }
});

test("home ledger can open every current destination", async ({ page }) => {
  for (const destination of destinations.filter((item) => item.href !== "/")) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .locator("[aria-labelledby=\"what's-open-title\"]")
      .getByRole("link")
      .filter({ has: page.getByText(destination.label, { exact: true }) })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === destination.href);
    await expect(page.getByRole("heading", { name: destination.heading, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "sign-in is not in this release" })).toHaveCount(0);
  }
});

test("settings roadmap links to held destinations", async ({ page }) => {
  await page.goto("/ops/settings", { waitUntil: "domcontentloaded" });
  const roadmap = page.locator("[aria-labelledby=\"release-roadmap-title\"]");
  for (const destination of heldDestinations) {
    await expect(roadmap.getByText(destination.label, { exact: true })).toBeVisible();
    await expect(roadmap.locator(`a[href="${destination.href}"]`)).toBeVisible();
  }
});

test("ops mutation APIs stay closed without an access proof", async ({ request }) => {
  const operators = await request.get("/api/ops/operators");
  expect(operators.status()).toBe(404);
  const operatorsWrite = await request.post("/api/ops/operators");
  expect(operatorsWrite.status()).toBe(404);
  const audit = await request.get("/api/ops/audit");
  expect(audit.status()).toBe(404);
  const auditWrite = await request.post("/api/ops/audit");
  expect(auditWrite.status()).toBe(404);
});
