"use client";

/**
 * Migrated-only marquee with pause-on-hover/focus and reduced-motion
 * fallback.  Replaces the legacy Marquee inside the migrated PublicShell.
 *
 * - Pauses on hover or focus-within (CSS animation-play-state)
 * - Reduced motion: static row (animation: none via motion.css)
 * - Uses SignatureSparkle (token-driven) instead of legacy Sparkle
 * - Decorative: aria-hidden on the repeating row
 */

import { SignatureSparkle } from "./SignatureSparkle";

interface PausableMarqueeProps {
  items: string[];
  className?: string;
  fast?: boolean;
}

export function PausableMarquee({
  items,
  className = "",
  fast = false,
}: PausableMarqueeProps) {
  const row = [...items, ...items];

  return (
    <div
      className={`marquee-mask overflow-hidden group ${className}`}
      aria-hidden
    >
      <div
        className={`flex w-max ${
          fast ? "animate-marquee-fast" : "animate-marquee"
        } motion-safe:group-hover:[animation-play-state:paused] motion-safe:group-focus-within:[animation-play-state:paused]`}
      >
        {row.map((t, i) => (
          <span key={i} className="flex items-center">
            <span className="display text-lg sm:text-xl px-5 whitespace-nowrap uppercase">
              {t}
            </span>
            <SignatureSparkle
              size={16}
              color={i % 2 ? "var(--wtf-editorial)" : "var(--wtf-attention)"}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
