import { test, expect, authenticate } from "./fixtures";
const users = [
 { name: "New Member", email: "member@example.test", role: "member", status: "active", changedAt: "2026-10-06" },
 { name: "Admin Person", email: "admin@example.test", role: "admin", status: "active", changedAt: "2026-10-06" },
];
const endpoint = "**/beta/api/admin/users";

test("all users appear and member role changes use the authenticated API", async ({ page }) => {
 await authenticate(page);
 await page.route(endpoint, async route => {
  expect(route.request().headers().authorization).toBe("Bearer phase2-fixture-token");
  const payload = route.request().method() === "POST" ? route.request().postDataJSON() : null;
  if (payload) expect(payload).toEqual({ action: "role", email: "member@example.test", role: "admin" });
  return route.fulfill({ json: { users: users.map(u => payload && u.email === payload.email ? { ...u, role: payload.role } : u) } });
 });
 await page.goto("/beta/settings/users");
 await expect(page.getByText("New Member", { exact: true })).toBeVisible();
 await expect(page.getByText("Admin Person", { exact: true })).toBeVisible();
 await page.getByLabel("Role for member@example.test").selectOption("admin");
 await expect(page.getByLabel("Role for member@example.test")).toHaveValue("admin");
});

test("editors cannot open protected users settings", async ({ page }) => {
 await authenticate(page, "editor"); await page.goto("/beta/settings/users");
 await expect(page.getByRole("heading", { name: "access is not granted" })).toBeVisible();
 await expect(page.getByRole("button", { name: "Invite user" })).toHaveCount(0);
});

test("failed roster has no fabricated users", async ({ page }) => {
 await authenticate(page); await page.goto("/beta/settings/users");
 await expect(page.getByText("Users could not be loaded. Try refreshing.")).toBeVisible();
 await expect(page.getByText("Admin Person", { exact: true })).toHaveCount(0);
});

test("invite and suspend controls report actual API outcomes and require confirmation", async ({ page }) => {
 await authenticate(page);
 const calls: unknown[] = [];
 await page.route(endpoint, async route => {
  if (route.request().method() === "POST") {
   const body = route.request().postDataJSON(); calls.push(body);
   if (body.action === "invite") return route.fulfill({ status: 409, json: { error: "invitation_not_sent" } });
  }
  return route.fulfill({ json: { users } });
 });
 await page.goto("/beta/settings/users");
 await page.getByLabel("Email address", { exact: true }).fill("invited@example.test");
 await page.getByRole("button", { name: "Invite user", exact: true }).click();
 await expect(page.getByRole("status")).toContainText("invitation could not be sent");
 await page.getByRole("listitem").filter({ hasText: "New Member" }).getByRole("button", { name: "Suspend", exact: true }).click();
 await expect(page.getByRole("dialog")).toContainText("Suspend user?");
 await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
 expect(calls).toHaveLength(1);
 await page.getByRole("button", { name: "Confirm", exact: true }).click();
 await expect(page.getByRole("dialog")).toHaveCount(0);
 expect(calls[1]).toEqual({ action: "suspend", email: "member@example.test" });
});

test("ownership transfer remains separately confirmed", async ({ page }) => {
 await authenticate(page, "super_admin");
 await page.route(endpoint, route => route.fulfill({ json: { users } }));
 await page.goto("/beta/settings/users");
 await page.getByRole("button", { name: "Transfer ownership", exact: true }).click();
 await expect(page.getByRole("dialog")).toContainText("Your role becomes admin.");
 await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
});


test("deletion requires typed email and removes the user after completion", async ({ page }) => {
 await authenticate(page);
 let deleted = false;
 await page.route(endpoint, async route => {
  if (route.request().method() === "POST") {
   expect(route.request().postDataJSON()).toEqual({ action: "delete", email: "member@example.test", confirmEmail: "member@example.test" });
   deleted = true;
  }
  return route.fulfill({ json: { users: deleted ? users.slice(1) : users } });
 });
 await page.goto("/beta/settings/users");
 await page.getByRole("listitem").filter({ hasText: "New Member" }).getByRole("button", { name: "Delete user", exact: true }).click();
 await expect(page.getByRole("dialog")).toContainText("all active and archived chats");
 await expect(page.getByRole("button", { name: "Confirm", exact: true })).toBeDisabled();
 expect(deleted).toBe(false);
 await page.getByLabel("Type the email to confirm").fill("member@example.test");
 await page.getByRole("button", { name: "Confirm", exact: true }).click();
 await expect(page.getByRole("dialog")).toHaveCount(0);
 await expect(page.getByText("New Member", { exact: true })).toHaveCount(0);
 await expect(page.getByRole("status")).toHaveText("User account and history deleted.");
});
