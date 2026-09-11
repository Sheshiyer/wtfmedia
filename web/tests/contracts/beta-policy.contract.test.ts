import { describe, expect, it } from "vitest";
import { decide, policyForPath } from "../../../cloudflare/src/auth/policy";
import { BETA_PROTECTED_DESTINATIONS } from "../../lib/beta/navigation";

describe("Beta navigation and edge policy contract", () => {
  it("maps every protected destination to an edge-allowed requirement", () => {
    for (const destination of BETA_PROTECTED_DESTINATIONS) {
      // Terra's converged policy is canonical. The legacy path is retained only
      // while this web worktree is integrated with the pre-convergence edge.
      const requirement = policyForPath(destination.edgePath) ?? policyForPath(destination.legacyEdgePath);
      expect(requirement, destination.href).not.toBeNull();
      if (requirement) expect(decide("super_admin", requirement[0], requirement[1]), destination.href).toBe(true);
    }
  });

  it("does not publish denied audiences and fails closed for unknown paths", () => {
    const memberOnly = BETA_PROTECTED_DESTINATIONS.filter(({ audiences }) => audiences.length === 1 && audiences[0] === "member");
    expect(memberOnly.map(({ href }) => href)).toEqual(expect.arrayContaining([
      "/beta/settings/account",
      "/beta/settings/memory",
      "/beta/settings/sessions",
      "/beta/settings/appearance",
    ]));
    expect(BETA_PROTECTED_DESTINATIONS.find(({ href }) => href === "/beta/admin/users")?.audiences).not.toContain("member");
    expect(policyForPath("/beta/unknown/private")).toBeNull();
    expect(policyForPath("/ops/unknown/private")).toBeNull();
    expect(decide("member", "members", "read")).toBe(false);
  });
});
