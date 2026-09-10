import { describe, expect, it } from "vitest";
import { clerkRedirectTarget } from "@/lib/ops/clerk-url";

describe("Clerk member Beta return target", () => {
  it("keeps an invited member on the private Beta route after sign-in", () => {
    expect(clerkRedirectTarget("/beta")).toBe("/beta");
  });

  it("continues to reject unrecognised post-sign-in destinations", () => {
    expect(clerkRedirectTarget("https://untrusted.example/beta")).toBe("/ops");
  });
});
