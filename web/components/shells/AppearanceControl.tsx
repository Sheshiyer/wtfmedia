"use client";

import { appearancePreferences } from "@/lib/public/appearance";
import { useAppearancePreference } from "@/components/shells/AppearanceProvider";

export function AppearanceControl({ context = "structure" }: { context?: "structure" | "surface" }) {
  const { preference, setPreference } = useAppearancePreference();
  const onStructure = context === "structure";

  return (
    <fieldset className="grid gap-2" aria-label="appearance">
      <legend
        className={`font-label text-[11px] font-bold uppercase tracking-[0.14em] ${
          onStructure ? "text-on-structure/55" : "text-secondary"
        }`}
      >
        appearance
      </legend>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="appearance preference">
        {appearancePreferences.map((option) => {
          const selected = preference === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreference(option)}
              className={[
                "min-h-10 border-2 px-2 font-label text-[11px] font-bold lowercase tracking-wide",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2",
                onStructure ? "focus-visible:ring-offset-surface-structure" : "focus-visible:ring-offset-canvas",
                selected
                  ? "border-attention bg-attention text-on-attention"
                  : onStructure
                    ? "border-foreground/30 text-on-structure hover:border-foreground hover:bg-canvas/10"
                    : "border-foreground/30 text-foreground hover:border-foreground hover:bg-surface-subtle",
              ].join(" ")}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
