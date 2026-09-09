"use client";

import { useEffect, useState } from "react";
import Grainient from "./Grainient";
import { MigratedWordmark } from "./MigratedWordmark";
import { WtfStaggeredText } from "./WtfStaggeredText";
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
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <MigratedWordmark size="xl" plate />
        <div className="grid justify-items-center gap-3">
          <p
            data-wtf-os-boot-status
            aria-live="polite"
            className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-foreground"
          >
            <WtfStaggeredText text="receipts become actions" />
          </p>
          <span aria-hidden="true" className="h-px w-32 bg-foreground/30" />
        </div>
      </div>
      <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center px-4">
        <Button type="button" variant="ghost" onClick={dismiss} className="bg-canvas/80">
          skip
        </Button>
      </div>
    </div>
  );
}
