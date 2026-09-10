import { describe, expect, it } from "vitest";
import {
  memberBottomNavigation,
  memberDisclosureGroups,
  memberDestinationForPath,
} from "@/lib/member/navigation";

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
});
