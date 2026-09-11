import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  BETA_PRODUCTION_HOSTNAME,
  BETA_STAGING_HOSTNAME,
  PUBLIC_ALPHA_HOSTNAME,
  betaRootRedirectForHost,
  isCanonicalBetaHostname,
} from "@/lib/beta/hosts";

describe("canonical Beta host routing", () => {
  it("maps only the two exact Beta host roots to the authenticated resolver", () => {
    expect(betaRootRedirectForHost(BETA_STAGING_HOSTNAME, "/")).toBe("/beta");
    expect(betaRootRedirectForHost(BETA_PRODUCTION_HOSTNAME, "/")).toBe("/beta");
    expect(betaRootRedirectForHost(`${BETA_STAGING_HOSTNAME}.evil.test`, "/")).toBeNull();
    expect(betaRootRedirectForHost(PUBLIC_ALPHA_HOSTNAME, "/")).toBeNull();
    expect(betaRootRedirectForHost("wtfmedia-web-staging.connect2nikhai.workers.dev", "/")).toBeNull();
    expect(betaRootRedirectForHost(BETA_STAGING_HOSTNAME, "/chat")).toBeNull();
    expect(isCanonicalBetaHostname("BETA-STAGING.WTFHQ.IN.")).toBe(true);
  });

  it("redirects the staging root without changing the hostname", async () => {
    const response = await middleware(new NextRequest(`https://${BETA_STAGING_HOSTNAME}/`), {} as never);
    if (!response) throw new Error("middleware_response_missing");
    expect(response.headers.get("location")).toBe(`https://${BETA_STAGING_HOSTNAME}/beta`);
  });

  it("keeps public Alpha and workers.dev roots outside the Beta-host redirect", async () => {
    for (const hostname of [PUBLIC_ALPHA_HOSTNAME, "wtfmedia-web-staging.connect2nikhai.workers.dev"]) {
      const response = await middleware(new NextRequest(`https://${hostname}/`), {} as never);
      expect(response?.headers.get("location"), hostname).toBeNull();
    }
  });

  it("does not configure cross-host Clerk session sharing in application source", () => {
    const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
    expect(layout).not.toMatch(/\b(?:domain|proxyUrl|isSatellite)\s*=/u);
    expect(layout).toContain("<ClerkProvider publishableKey={clerkPublishableKey}>");
  });
});
