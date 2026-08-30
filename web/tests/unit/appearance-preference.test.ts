import { describe, expect, it } from "vitest";
import {
  appearancePreferences,
  normalizeAppearancePreference,
  readAppearancePreference,
} from "@/lib/public/appearance";

describe("appearance preference contract", () => {
  it("accepts only the three supported visual preferences", () => {
    expect(appearancePreferences).toEqual(["system", "light", "dark"]);
    expect(normalizeAppearancePreference("light")).toBe("light");
    expect(normalizeAppearancePreference("dark")).toBe("dark");
    expect(normalizeAppearancePreference("violet")).toBe("system");
  });

  it("falls back to system when persisted browser state is missing or malformed", () => {
    expect(readAppearancePreference(null)).toBe("system");
    expect(readAppearancePreference("sepia")).toBe("system");
  });
});
