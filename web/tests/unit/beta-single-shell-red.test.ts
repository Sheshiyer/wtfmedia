import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
});
