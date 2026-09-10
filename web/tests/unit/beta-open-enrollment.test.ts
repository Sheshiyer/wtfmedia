import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authFrame = readFileSync(new URL("../../components/domain/ops/OperatorAuthFrame.tsx", import.meta.url), "utf8");
const betaPage = readFileSync(new URL("../../app/beta/page.tsx", import.meta.url), "utf8");
const memberShell = readFileSync(new URL("../../components/domain/member/MemberBetaShell.tsx", import.meta.url), "utf8");

describe("Beta open-enrollment copy", () => {
  it("offers verified account creation without invitation-only language", () => {
    expect(authFrame).toContain('eyebrow: "company beta"');
    expect(authFrame).toContain("We create your private member account.");
    expect(betaPage).toContain("Ask WTF · company beta");
    expect(betaPage).not.toContain("Finish the emailed invitation");
  });

  it("renders the authenticated member workspace inside the WTF OS shell", () => {
    expect(betaPage).toContain("<MemberBetaShell>");
    expect(betaPage).toContain("data-member-beta-dashboard");
    expect(betaPage).toContain("<WorkspaceHeader");
    expect(betaPage).toContain('id="history"');
    expect(betaPage).toContain('id="memory"');
    expect(betaPage).not.toContain('className="mx-auto w-full max-w-5xl p-6"');
    expect(memberShell).toContain('mode="member"');
    expect(memberShell).toContain('/beta#history');
    expect(memberShell).toContain('/beta#memory');
  });
});
