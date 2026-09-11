import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BETA_PROTECTED_DESTINATIONS } from "../../lib/beta/navigation";

const webRoot = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, webRoot), "utf8");

describe("Beta single-shell convergence", () => {
  it("has canonical member and operator route files", () => {
    for (const path of [
      "app/beta/chat/page.tsx",
      "app/beta/workspace/page.tsx",
      "app/beta/settings/workspace/page.tsx",
      "app/beta/admin/users/page.tsx",
      "app/beta/admin/audit/page.tsx",
      "app/beta/admin/release/page.tsx",
    ]) expect(existsSync(new URL(path, webRoot))).toBe(true);
  });

  it("uses principal-context admission and does not redirect legacy Alpha ops", () => {
    const gate = read("components/domain/beta/BetaPrincipalGate.tsx");
    const middleware = read("middleware.ts");
    expect(gate).toContain("/beta/api/principal-context");
    expect(gate).not.toContain("public_link");
    expect(middleware).not.toContain('target.pathname = pathname === "/ops"');
  });

  it("keeps conversations on opaque member routes", () => {
    const navigation = read("lib/member/chat.ts");
    expect(navigation).toContain("mcnv_");
    expect(navigation).not.toContain("userId");
  });

  it("clears stale admission and enters a renderable ready state", () => {
    const gate = read("components/domain/beta/BetaPrincipalGate.tsx");
    expect(gate).toContain('setPrincipal(null)');
    expect(gate).toContain('setState("ready")');
    expect(gate).toContain("admittedKey");
  });

  it("uses edge policy as the navigation contract", () => {
    expect(existsSync(new URL("lib/beta/policy.ts", webRoot))).toBe(false);
    expect(BETA_PROTECTED_DESTINATIONS.length).toBeGreaterThan(0);
    expect(BETA_PROTECTED_DESTINATIONS.some(({ audiences }) => audiences.includes("member"))).toBe(true);
    expect(BETA_PROTECTED_DESTINATIONS.some(({ audiences }) => audiences.includes("admin"))).toBe(true);
    expect(BETA_PROTECTED_DESTINATIONS.some(({ audiences }) => !audiences.includes("member"))).toBe(true);
    expect(BETA_PROTECTED_DESTINATIONS.find(({ href }) => href === "/beta/unknown/private")).toBeUndefined();
  });

  it("adapts the canonical chat route to the verified principal", () => {
    const page = read("app/beta/chat/page.tsx");
    expect(page).toContain("MemberChatWorkspace");
    expect(page).toContain("ChatWorkspace");
    expect(page).toContain("useBetaPrincipal");
    expect(read("app/beta/chat/[conversationId]/page.tsx")).toContain("BetaConversationRoute");
  });

  it("removes rewrite-era operator aliases and keeps settings role-aware", () => {
    expect(read("next.config.mjs")).not.toContain("/beta/ops");
    const rail = read("components/shells/AppRail.tsx");
    expect(rail).not.toContain("/beta/ops");
    const settings = read("app/beta/settings/layout.tsx");
    expect(settings).toContain("useBetaPrincipal");
    expect(settings).toContain("BetaSettingsNavigation");
  });
});
