import { describe, expect, it } from "vitest";
import {
  memberBottomNavigation,
  memberDisclosureGroups,
  memberDestinationForPath,
} from "@/lib/member/navigation";
import { isBetaDestinationVisible } from "@/lib/beta/navigation";
import { readFileSync } from "node:fs";

const appRail = readFileSync(new URL("../../components/shells/AppRail.tsx", import.meta.url), "utf8");

describe("member workspace navigation", () => {
  it("shows analytics in production and staging while retaining capability checks", () => {
    const page = readFileSync(new URL("../../app/beta/analytics/page.tsx", import.meta.url), "utf8");
    expect(page).toContain('isBetaDestinationVisible("/beta/analytics", principal.environment)');
    for (const path of ["/beta/analytics", "/beta/analytics/", "/beta/settings/workspace/analytics"]) {
      expect(isBetaDestinationVisible(path, "production")).toBe(true);
      expect(isBetaDestinationVisible(path, "staging")).toBe(true);
      expect(isBetaDestinationVisible(path, "local")).toBe(true);
    }
    expect(isBetaDestinationVisible("/beta/chat", "production")).toBe(true);
    expect(page).toContain('principal.capabilities.includes("analytics:read")');
    expect(memberDisclosureGroups[0].items.map((item) => item.href)).toContain("/beta/analytics");
    expect(isBetaDestinationVisible("/beta/social-analytics", "local")).toBe(true);
    expect(isBetaDestinationVisible("/beta/social-analytics", "staging")).toBe(true);
    expect(isBetaDestinationVisible("/beta/social-analytics", "production")).toBe(true);
  });

  it("keeps conversation routes under Ask WTF without marking Settings active", () => {
    expect(memberDestinationForPath("/beta/chat/mcnv_12345678")).toBe("ask");
    expect(memberDestinationForPath("/beta/settings")).toBe("settings");
    expect(memberBottomNavigation.map((item) => item.href)).toEqual(["/beta", "/beta/settings"]);
    expect(memberBottomNavigation.map((item) => item.icon)).toEqual(["chat", "settings"]);
  });

  it("exposes only member destinations", () => {
    expect(memberDisclosureGroups[0]).toMatchObject({ label: "Beta workspace" });
    expect(memberDisclosureGroups[0]?.items.map((item) => item.href)).toEqual(["/beta", "/beta/connections", "/beta/analytics", "/beta/social-analytics", "/beta/research", "/beta/settings"]);
    expect(memberDisclosureGroups).toHaveLength(1);
    expect(memberDisclosureGroups.flatMap((group) => group.items).map((item) => item.href)).not.toContain("/beta/ops/settings");
  });

  it("bounds the hamburger disclosure below the fixed rail", () => {
    expect(appRail).toContain("max-h-[calc(100dvh-5.5rem)]");
    expect(appRail).toContain("overflow-y-auto");
    expect(appRail).toContain("flex min-w-0 flex-wrap items-center");
  });
});
