import { describe, expect, it } from "vitest";
import { canAccessPath, decide, policyForPath } from "../../../cloudflare/src/auth/policy";
import { audienceForRole, BETA_PROTECTED_DESTINATIONS } from "../../lib/beta/navigation";

const EDGE_ROLES = ["member", "editor", "admin", "super_admin"] as const;
describe("Beta navigation and edge policy contract", () => {
  it("maps every protected destination to an edge-allowed requirement", () => {
    for (const destination of BETA_PROTECTED_DESTINATIONS) {
      const requirement = policyForPath(destination.edgePath);
      expect(requirement, destination.href).not.toBeNull();
      for (const role of EDGE_ROLES) {
        const allowed = destination.audiences.includes(audienceForRole(role));
        expect(canAccessPath(role, destination.edgePath), `${destination.href}:${role}`).toBe(allowed);
        if (requirement) expect(decide(role, requirement[0], requirement[1]), `${destination.href}:${role}`).toBe(allowed);
      }
    }
  });

  it("does not publish denied audiences and fails closed for unknown paths", () => {
    expect(BETA_PROTECTED_DESTINATIONS.filter(({ audiences }) => audiences.includes("member")).map(({ href }) => href)).toEqual(expect.arrayContaining([
      "/beta/settings/account",
      "/beta/settings/memory",
      "/beta/settings/sessions",
      "/beta/settings/appearance",
    ]));
    expect(BETA_PROTECTED_DESTINATIONS.find(({ href }) => href === "/beta/admin/users")?.audiences).not.toContain("member");
    expect(policyForPath("/beta/unknown/private")).toBeNull();
    expect(policyForPath("/ops/unknown/private")).toBeNull();
    expect(canAccessPath("member", "/beta/admin/users")).toBe(false);
    expect(decide("member", "members", "read")).toBe(false);
  });
});
