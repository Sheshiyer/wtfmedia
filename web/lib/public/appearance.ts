export const appearancePreferences = ["system", "light", "dark"] as const;

export type AppearancePreference = (typeof appearancePreferences)[number];

export const appearanceStorageKey = "wtfmedia:appearance";

export function normalizeAppearancePreference(value: unknown): AppearancePreference {
  return typeof value === "string" && appearancePreferences.includes(value as AppearancePreference)
    ? value as AppearancePreference
    : "system";
}

export function readAppearancePreference(value: unknown): AppearancePreference {
  return normalizeAppearancePreference(value);
}

