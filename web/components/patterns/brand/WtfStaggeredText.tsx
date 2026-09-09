"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * WTF OS adaptation of the React Bits staggered-text pattern.
 *
 * The registry component supplied the interaction idea; the visual contract
 * stays local: no catalog palette, no layout animation, and a static frame
 * whenever reduced motion is requested.
 */
export function WtfStaggeredText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const words = text.trim().split(/\s+/);

  useEffect(() => setMounted(true), []);

  const initialFrame = { opacity: 0, transform: "translateY(0.65em)" };
  const finalFrame = { opacity: 1, transform: "translateY(0em)" };

  return (
    <span aria-label={text} className={className}>
      <span aria-hidden="true" className="inline-flex flex-wrap">
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            initial={initialFrame}
            animate={mounted ? finalFrame : initialFrame}
            transition={
              !mounted || reducedMotion
                ? { duration: 0 }
                : {
                    duration: 0.32,
                    delay: index * 0.045,
                    ease: REVEAL_EASE,
                  }
            }
          >
            {word}
            {index < words.length - 1 ? "\u00a0" : ""}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
