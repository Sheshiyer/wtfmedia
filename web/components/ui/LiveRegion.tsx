"use client";

import { forwardRef, type HTMLAttributes } from "react";

export interface LiveRegionProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * ARIA live politeness level.
   * - "polite" (default): announced at next pause
   * - "assertive": announced immediately (use sparingly)
   */
  politeness?: "polite" | "assertive";
  /**
   * When true, clears the region content after announcement.
   * Prevents repeated announcements on re-renders.
   */
  clearAfterAnnounce?: boolean;
}

/**
 * Stable ARIA live region for bounded status announcements.
 *
 * - Announces status changes politely (or assertively if needed)
 * - Never streams per-token updates (e.g., LLM answer tokens)
 * - Content is stable: set once per meaningful state change
 * - Visible only to screen readers (sr-only)
 */
export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(
  function LiveRegion(
    {
      politeness = "polite",
      clearAfterAnnounce = false,
      children,
      className = "",
      ...props
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role={politeness === "assertive" ? "alert" : "status"}
        aria-live={politeness}
        aria-atomic="true"
        className={["sr-only", className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  },
);
