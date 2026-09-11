import { describe, expect, it } from "vitest";
import { clerkRedirectTarget, memberBetaEntryTarget } from "@/lib/ops/clerk-url";

describe("Clerk member Beta return target", () => {
  it("keeps an invited member on the private Beta route after sign-in", () => {
    expect(clerkRedirectTarget("/beta")).toBe("/beta");
  });

  it("normalizes Clerk's same-site absolute Beta callback to the fixed internal route", () => {
    expect(
      clerkRedirectTarget(
        "https://wtfmedia-web-staging.connect2nikhai.workers.dev/beta",
        "https://wtfmedia-web-staging.connect2nikhai.workers.dev",
      ),
    ).toBe("/beta");
  });

  it("continues to reject unrecognised post-sign-in destinations", () => {
    expect(clerkRedirectTarget("https://untrusted.example/beta", "https://wtfmedia-web-staging.connect2nikhai.workers.dev")).toBe("/beta/workspace");
  });

  it("preserves an invitation ticket instead of sending an invited member into generic restricted sign-in", () => {
    expect(memberBetaEntryTarget("invitation-ticket-value")).toBe("/sign-up?redirect_url=%2Fbeta&__clerk_ticket=invitation-ticket-value");
  });

  it("continues to send ticketless member visits to the polished sign-in route", () => {
    expect(memberBetaEntryTarget(null)).toBe("/sign-in?redirect_url=%2Fbeta");
  });

  it("does not forward malformed values into Clerk's invitation flow", () => {
    expect(memberBetaEntryTarget("not a ticket")).toBe("/sign-in?redirect_url=%2Fbeta");
  });
});
