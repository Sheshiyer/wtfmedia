import { test as base, expect, type Page } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, providePage) => {
    // Block external traffic and default every API to unavailable; individual tests
    // explicitly supply evidence. No CI request can reach live Clerk/Edge/Google.
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return route.abort();
      if (url.pathname.includes("/api/")) return route.fulfill({ status: 503, json: { error: "fixture_unavailable" } });
      return route.continue();
    });
    await providePage(page);
  },
});
export { expect };
export async function authenticate(page: Page, role: "member" | "editor" | "admin" | "super_admin" = "admin", environment: "staging" | "production" = "staging") {
  const capabilities = ["beta:read", "chat:read", "analytics:read", ...(role === "member" ? [] : ["control_room:read"]), ...(["admin", "super_admin"].includes(role) ? ["members:read", "audit:read"] : [])];
  await page.route("**/beta/api/principal-context", (route) => {
    expect(route.request().headers().authorization).toBe("Bearer phase2-fixture-token");
    return route.fulfill({ json: { kind: role === "member" ? "member" : "operator", role, email: "fixture@example.test", environment, canonicalLanding: "/beta/chat", capabilities } });
  });
}
