import { describe, expect, it } from "vitest";
import {
  canManageSettings,
  canReadSettingsSection,
  settingsSectionsFor,
  settingsSectionForPath,
} from "@/lib/ops/settings-navigation";

describe("nested settings navigation", () => {
  it("keeps the settings directory role-governed", () => {
    expect(settingsSectionsFor("editor").map((section) => section.id)).toEqual([
      "readiness", "release", "ai", "analytics", "sessions", "memory", "sources",
    ]);
    expect(settingsSectionsFor("admin").map((section) => section.id)).toContain("access");
    expect(settingsSectionsFor("public_link")).toEqual([]);
  });

  it("separates route read access from mutation authority", () => {
    expect(canReadSettingsSection("editor", "ai")).toBe(true);
    expect(canReadSettingsSection("editor", "access")).toBe(false);
    expect(canManageSettings("editor")).toBe(false);
    expect(canManageSettings("admin")).toBe(true);
    expect(canManageSettings("super_admin")).toBe(true);
  });

  it("resolves only canonical nested settings paths", () => {
    expect(settingsSectionForPath("/ops/settings/analytics")?.id).toBe("analytics");
    expect(settingsSectionForPath("/ops/settings")).toBeNull();
    expect(settingsSectionForPath("/ops/settings/analytics/extra")).toBeNull();
  });
});
