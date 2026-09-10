import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authFrame = readFileSync(new URL("../../components/domain/ops/OperatorAuthFrame.tsx", import.meta.url), "utf8");
const betaPage = readFileSync(new URL("../../app/beta/page.tsx", import.meta.url), "utf8");

describe("Beta open-enrollment copy", () => {
  it("offers verified account creation without invitation-only language", () => {
    expect(authFrame).toContain('eyebrow: "company beta"');
    expect(authFrame).toContain("We create your private member account.");
    expect(betaPage).toContain("Ask WTF · company beta");
    expect(betaPage).not.toContain("Finish the emailed invitation");
  });
});
