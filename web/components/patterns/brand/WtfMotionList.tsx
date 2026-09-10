"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type MotionListItem = {
  label: string;
  detail: string;
  tone: "editorial" | "attention" | "live";
};

const toneClasses: Record<MotionListItem["tone"], string> = {
  editorial: "border-editorial bg-editorial",
  attention: "border-attention bg-attention",
  live: "border-live bg-live",
};

/**
 * A small, state-legible adaptation of the React Bits animated-list pattern.
 *
 * This list describes the auth handoff rather than inventing a live status.
 * It remains readable and still when reduced motion is enabled.
 */
export function WtfMotionList({ items, surface = "dark" }: { items: MotionListItem[]; surface?: "dark" | "light" }) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <ol className="mt-8 grid gap-3" aria-label="access flow">
      {items.map((item, index) => (
        <motion.li
          key={item.label}
          data-auth-step={index + 1}
          initial={{ opacity: 0, transform: "translateX(-10px)" }}
          animate={mounted ? { opacity: 1, transform: "translateX(0px)" } : { opacity: 0, transform: "translateX(-10px)" }}
          transition={
            !mounted || reducedMotion
              ? { duration: 0 }
              : { duration: 0.2, delay: 0.18 + index * 0.07, ease: [0.22, 1, 0.36, 1] }
          }
          className={`flex items-center gap-3 border-b pb-3 pt-1 ${surface === "light" ? "border-foreground/20" : "border-on-structure/20"}`}
        >
          <span
            aria-hidden="true"
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold text-foreground ${toneClasses[item.tone]}`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">
            <strong className="block font-label text-sm font-bold uppercase tracking-[0.08em]">
              {item.label}
            </strong>
            <span className={`block font-body text-sm ${surface === "light" ? "text-secondary" : "text-on-structure/70"}`}>{item.detail}</span>
          </span>
        </motion.li>
      ))}
    </ol>
  );
}
