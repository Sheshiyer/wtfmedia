"use client";

import { useEffect, useState } from "react";
import Grainient from "./Grainient";
import { MigratedWordmark } from "./MigratedWordmark";
import { Button } from "@/components/ui/Button";
import {
  BOOT_MS,
  BOOT_STORAGE_KEY,
  bootForceFromSearch,
  resolveWtfOsBoot,
  type WtfOsBootMode,
} from "@/lib/public/boot";

function markSeen() {
  try {
    sessionStorage.setItem(BOOT_STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function WtfOsBoot() {
  const [mode, setMode] = useState<WtfOsBootMode>("hidden");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(BOOT_STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }
    const next = resolveWtfOsBoot({
      webdriver: navigator.webdriver,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      seen,
      force: bootForceFromSearch(window.location.search),
    });
    setMode(next);
    if (next === "hidden") return undefined;
    const hide = window.setTimeout(() => {
      markSeen();
      setMode("hidden");
    }, next === "still" ? 400 : BOOT_MS);
    return () => window.clearTimeout(hide);
  }, []);

  const dismiss = () => {
    markSeen();
    setMode("hidden");
  };

  if (mode === "hidden") return null;

  return (
    <div
      data-wtf-os-boot
      role="dialog"
      aria-modal="true"
      aria-label="wtf os"
      className="fixed inset-0 z-[200] bg-canvas text-foreground"
    >
      <div className="absolute inset-0" aria-hidden="true">
        {mode === "still" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/splash/wtfos-bg-still.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Grainient />
        )}
      </div>
      <div className="relative z-10 grid h-full place-items-center px-6">
        <MigratedWordmark size="xl" plate />
      </div>
      <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center px-4">
        <Button type="button" variant="ghost" onClick={dismiss} className="bg-canvas/80">
          skip
        </Button>
      </div>
    </div>
  );
}
