import { describe, expect, it } from "vitest";
import {
  isSocialPlatform,
  hostnameFromHostHeader,
  localHostnameAllowed,
  PLATFORM_DEFINITIONS,
  SOCIAL_PLATFORMS,
} from "../../lib/social-analytics/contracts";

describe("social analytics contract", () => {
  it("exposes the four approved launch platforms", () => {
    expect(SOCIAL_PLATFORMS).toEqual(["linkedin", "instagram", "facebook", "twitter"]);
    expect(PLATFORM_DEFINITIONS.map((item) => item.label)).toEqual(["LinkedIn", "Instagram", "Facebook", "X (Twitter)"]);
    expect(isSocialPlatform("linkedin")).toBe(true);
    expect(isSocialPlatform("youtube")).toBe(false);
  });

  it("keeps the experimental API local-only", () => {
    expect(localHostnameAllowed("localhost")).toBe(true);
    expect(localHostnameAllowed("127.0.0.1")).toBe(true);
    expect(localHostnameAllowed("[::1]")).toBe(true);
    expect(localHostnameAllowed("beta-staging.wtfhq.in")).toBe(false);
    expect(localHostnameAllowed("localhost.evil.example")).toBe(false);
    expect(hostnameFromHostHeader("localhost:4322")).toBe("localhost");
    expect(hostnameFromHostHeader("[::1]:4322")).toBe("::1");
    expect(hostnameFromHostHeader("beta-staging.wtfhq.in")).toBe("beta-staging.wtfhq.in");
  });
});
