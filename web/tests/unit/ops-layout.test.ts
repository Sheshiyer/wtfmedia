import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

describe("protected operator layout boundary", () => {
  it("does not render an unverified staging or production operator shell", () => {
    const source = readFileSync(resolve(root, "app/(operator)/ops/layout.tsx"), "utf8");

    expect(source).toContain('if (!trusted && environment !== "local")');
    expect(source).toContain("data-ops-access-required");
    expect(source).toContain("<OperatorShell nav={[]}>");
  });

  it("does not expose an Alpha baseline or Beta sign-in CTA in release control", () => {
    const source = readFileSync(resolve(root, "app/(operator)/ops/settings/ReleaseControl.tsx"), "utf8");

    expect(source).not.toContain("data-release-public-gate");
    expect(source).not.toContain("data-release-beta-login");
    expect(source).not.toContain("sign in for beta");
    expect(source).not.toContain("current public version");
    expect(source).not.toContain("beta adds authenticated sessions");
  });
});
