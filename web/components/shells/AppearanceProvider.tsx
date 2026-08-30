"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  appearanceStorageKey,
  normalizeAppearancePreference,
  readAppearancePreference,
  type AppearancePreference,
} from "@/lib/public/appearance";

type AppearanceContextValue = {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyAppearancePreference(preference: AppearancePreference) {
  document.documentElement.dataset.wtfTheme = preference;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>("system");

  useEffect(() => {
    const persisted = readAppearancePreference(window.localStorage.getItem(appearanceStorageKey));
    setPreferenceState(persisted);
    applyAppearancePreference(persisted);
  }, []);

  const value = useMemo<AppearanceContextValue>(() => ({
    preference,
    setPreference(nextPreference) {
      const next = normalizeAppearancePreference(nextPreference);
      setPreferenceState(next);
      window.localStorage.setItem(appearanceStorageKey, next);
      applyAppearancePreference(next);
    },
  }), [preference]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearancePreference() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearancePreference must be used inside AppearanceProvider");
  }
  return context;
}
