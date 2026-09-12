import { describe, expect, it } from "vitest";
import {
  memberBottomNavigation,
  memberDisclosureGroups,
  memberDestinationForPath,
} from "@/lib/member/navigation";
import { readFileSync } from "node:fs";

const appRail = readFileSync(new URL("../../components/shells/AppRail.tsx", import.meta.url), "utf8");

describe("member workspace navigation", () => {
  it("keeps conversation routes under Ask WTF without marking Settings active", () => {
    expect(memberDestinationForPath("/beta/chat/mcnv_12345678")).toBe("ask");
    expect(memberDestinationForPath("/beta/settings")).toBe("settings");
    expect(memberBottomNavigation.map((item) => item.href)).toEqual(["/beta", "/beta/settings"]);
    expect(memberBottomNavigation.map((item) => item.icon)).toEqual(["chat", "settings"]);
  });

  it("exposes only member destinations and explicit public exits", () => {
    expect(memberDisclosureGroups[0]).toMatchObject({ label: "Beta workspace" });
    expect(memberDisclosureGroups[0]?.items.map((item) => item.href)).toEqual(["/beta", "/beta/settings"]);
    expect(memberDisclosureGroups[1]).toMatchObject({ label: "Public Alpha" });
    expect(memberDisclosureGroups.flatMap((group) => group.items).map((item) => item.href)).not.toContain("/beta/ops/settings");
  });

  it("bounds the hamburger disclosure below the fixed rail", () => {
    expect(appRail).toContain("max-h-[calc(100dvh-5.5rem)]");
    expect(appRail).toContain("overflow-y-auto");
    expect(appRail).toContain("flex min-w-0 flex-wrap items-center");
  });
});
