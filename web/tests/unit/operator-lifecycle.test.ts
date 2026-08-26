import { describe, expect, it } from "vitest";
import { validatedReturnTo } from "@/lib/ops/return-to";
import { activatedOpsNavigation, canAccessOpsPath } from "@/lib/ops/policy";
import { verifyTrustedOpsContext } from "@/lib/ops/context";
import { createHmac } from "node:crypto";

describe("operator lifecycle", () => {
  it("redirect corpus accepts only canonical /ops destinations", () => {
    expect(validatedReturnTo("/ops/operators")).toBe("/ops/operators");
    for (const unsafe of ["https://evil.test", "//evil.test", "/%2f%2fevil.test", "/chat", "/ops?next=/chat", "/ops/%2e%2e/chat"]) expect(validatedReturnTo(unsafe)).toBe("/ops");
  });

  it("requires a signed unexpired edge context instead of headers or decoded JWT", () => {
    const payload = Buffer.from(JSON.stringify({ operatorId: 7, role: "admin", environment: "local", correlationId: "corr-12345678", exp: Date.now() + 30_000 })).toString("base64url");
    const proof = createHmac("sha256", "proof").update(payload).digest("base64url");
    expect(verifyTrustedOpsContext(payload, proof, "proof")?.role).toBe("admin");
    expect(verifyTrustedOpsContext(payload, "forged", "proof")).toBeNull();
  });

  it("keeps editor navigation limited to the activated Control Room", () => {
    expect(activatedOpsNavigation("editor")).toEqual([{ label: "Control Room", href: "/ops" }]);
    expect(canAccessOpsPath("editor", "/ops/audit")).toBe(false);
  });
});
