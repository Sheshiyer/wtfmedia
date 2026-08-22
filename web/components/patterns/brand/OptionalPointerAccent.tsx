"use client";

/**
 * Optional pointer accent for the migrated brand layer.
 *
 * Renders the legacy CustomCursor ONLY when:
 *   1. The device has a fine pointer and hover capability
 *   2. The user has NOT requested reduced motion
 *
 * Under reduced motion or on touch devices, renders nothing — the
 * native cursor is always visible in the migrated subtree via motion.css.
 *
 * This component exists so the migrated PublicShell can offer the
 * custom cursor as an opt-in brand accent without forcing it on
 * users who prefer reduced motion or use touch devices.
 */

import { useEffect, useState } from "react";
import { CustomCursor } from "@/components/CustomCursor";

export function OptionalPointerAccent() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mqHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setEnabled(mqHover.matches && !mqMotion.matches);
    };

    update();
    mqHover.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqHover.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  if (!enabled) return null;
  return <CustomCursor />;
}
