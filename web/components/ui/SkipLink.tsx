"use client";

import type { HTMLAttributes } from "react";

export interface SkipLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  /** Target element ID to skip to. Defaults to public main region. */
  targetId?: string;
}

/**
 * Skip navigation link for keyboard users.
 *
 * - Visually hidden until focused
 * - First focusable element in tab order (place at top of document)
 * - Targets the public main content region by default
 * - Visible focus ring (two-layer: cream inner + ink outer)
 */
export function SkipLink({
  targetId = "public-main",
  children = "Skip to main content",
  className = "",
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={[
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-2 focus:left-2 focus:z-[9999]",
        "focus:inline-flex focus:items-center",
        "focus:min-h-[44px] focus:px-4 focus:py-2",
        "focus:font-label focus:text-sm focus:font-bold",
        "focus:bg-ink focus:text-cream",
        "focus:rounded-[var(--wtf-radius-control)]",
        "focus:border-2 focus:border-ink",
        "focus-visible:outline-none",
        "focus-visible:ring-2 ring-cream focus-visible:ring-offset-2",
        "focus-visible:ring-offset-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </a>
  );
}
