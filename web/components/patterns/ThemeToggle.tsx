"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import type { WtfThemePreference } from "@/lib/public/public-ui-variant";

const THEME_STORAGE_KEY = "wtf-theme-preference";

function isThemePreference(value: string | null): value is WtfThemePreference {
  return value === "light" || value === "dark";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3.25" />
      <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.23 4.23l1.42 1.42M18.35 18.35l1.42 1.42M2.5 12h2M19.5 12h2M4.23 19.77l1.42-1.42M18.35 5.65l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.6 15.4A7.8 7.8 0 0 1 8.6 4.4 7.8 7.8 0 1 0 19.6 15.4Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<WtfThemePreference>("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!isThemePreference(stored)) return;
      setTheme(stored);
      document.documentElement.dataset.wtfTheme = stored;
    } catch {
      // The server-selected light theme remains the safe fallback.
    }
  }, []);

  function selectTheme(next: WtfThemePreference) {
    setTheme(next);
    document.documentElement.dataset.wtfTheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Theme switching still works when storage is unavailable.
    }
  }

  const optionClass = (option: WtfThemePreference) => [
    "rounded-full p-2",
    theme === option
      ? "border-foreground bg-attention text-on-attention"
      : "border-transparent text-foreground hover:border-foreground/40 hover:bg-surface-raised",
  ].join(" ");

  return (
    <div
      role="group"
      aria-label="Color theme"
      data-theme-toggle
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border-2 border-foreground/20 bg-surface-subtle p-0.5"
    >
      <IconButton
        aria-label="Use light theme"
        aria-pressed={theme === "light"}
        data-theme-option="light"
        variant="ghost"
        className={optionClass("light")}
        onClick={() => selectTheme("light")}
        title="Use light theme"
      >
        <SunIcon />
      </IconButton>
      <IconButton
        aria-label="Use dark theme"
        aria-pressed={theme === "dark"}
        data-theme-option="dark"
        variant="ghost"
        className={optionClass("dark")}
        onClick={() => selectTheme("dark")}
        title="Use dark theme"
      >
        <MoonIcon />
      </IconButton>
    </div>
  );
}
