import { describe, expect, it } from "vitest";
import {
  parseAuthenticatedChatRelease,
  releaseControlAccess,
} from "@/lib/ops/release";
import { accessLoginUrl, BETA_RELEASE_RETURN_TO } from "@/lib/ops/access-url";

describe("authenticated chat release projection", () => {
  it("returns the protected Access-intercepted settings target for Beta", () => {
    expect(accessLoginUrl()).toBe(BETA_RELEASE_RETURN_TO);
    expect(accessLoginUrl()).not.toContain("/cdn-cgi/access/login");
  });

  it("accepts only the four server release states", () => {
    expect(parseAuthenticatedChatRelease({ state: "paused", environment: "staging" })).toEqual({
      state: "paused",
      track: "alpha",
      environment: "staging",
    });
    expect(parseAuthenticatedChatRelease({ release: { state: "rolled_back", updated_at: "now" } })).toEqual({
      state: "rolled_back",
      track: "alpha",
      updatedAt: "now",
    });
    expect(parseAuthenticatedChatRelease({ state: "stable", track: "beta", environment: "staging" })).toEqual({
      state: "stable",
      track: "beta",
      environment: "staging",
    });
    expect(parseAuthenticatedChatRelease({ state: "enabled" })).toBeNull();
    expect(parseAuthenticatedChatRelease({ state: "stable", environment: "production-ish" })).toBeNull();
    expect(parseAuthenticatedChatRelease({ state: "stable", track: "canary" })).toBeNull();
  });

  it("allows mutations only for super admins in local or staging", () => {
    expect(releaseControlAccess("local", "super_admin")).toBe("mutate");
    expect(releaseControlAccess("staging", "super_admin")).toBe("mutate");
    expect(releaseControlAccess("staging", "admin")).toBe("read-only");
    expect(releaseControlAccess("local", "editor")).toBe("read-only");
    expect(releaseControlAccess("production", "super_admin")).toBe("unavailable");
    expect(releaseControlAccess("staging", "public_link")).toBe("unavailable");
  });
});
