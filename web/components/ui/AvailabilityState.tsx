"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

/**
 * Closed union of every Phase 1 availability state.
 *
 * Each state carries visible text and non-color semantics so meaning
 * survives CSS-color-disabled environments.
 */
export type AvailabilityStateId =
  | "unknown"
  | "unavailable"
  | "stale"
  | "partial"
  | "empty"
  | "permission-denied"
  | "error"
  | "offline"
  | "unmapped"
  | "conflicted"
  | "measured-zero";

export interface StateCopy {
  /** Short visible label shown to the user */
  label: string;
  /** Longer explanation of what this state means */
  explanation: string;
  /** What the user can safely do from this state (never leaks private data) */
  remainingBehavior: string;
  /** Recovery path text */
  recovery: string;
}

/** Canonical copy for every availability state. Public-safe only. */
const STATE_COPY: Record<AvailabilityStateId, StateCopy> = {
  unknown: {
    label: "Unknown",
    explanation: "The status of this content is not yet determined.",
    remainingBehavior: "You can wait or try again.",
    recovery: "Refresh the page or try again later.",
  },
  unavailable: {
    label: "Unavailable",
    explanation: "This content is not available right now.",
    remainingBehavior: "Other content remains accessible.",
    recovery: "Try again later.",
  },
  stale: {
    label: "Out of date",
    explanation: "This content may not reflect the latest information.",
    remainingBehavior: "You can view the current version while we update.",
    recovery: "Refresh to see the latest version.",
  },
  partial: {
    label: "Partial",
    explanation: "Only some of the requested content is available.",
    remainingBehavior: "Available content is shown below.",
    recovery: "Refresh to try loading the rest.",
  },
  empty: {
    label: "Nothing here yet",
    explanation: "There is no content to show.",
    remainingBehavior: "You can check back later.",
    recovery: "Try a different search or check back later.",
  },
  "permission-denied": {
    label: "Access restricted",
    explanation: "You do not have access to this content.",
    remainingBehavior: "Public content remains available.",
    // NEVER confirm a protected record exists — public copy only
    recovery: "Contact the owner if you believe you should have access.",
  },
  error: {
    label: "Something went wrong",
    explanation: "An error occurred while loading this content.",
    remainingBehavior: "Other parts of the page may still work.",
    recovery: "Try again or refresh the page.",
  },
  offline: {
    label: "Offline",
    explanation: "You appear to be offline.",
    remainingBehavior: "Previously loaded content may still be visible.",
    recovery: "Check your connection and try again.",
  },
  unmapped: {
    label: "Unrecognized format",
    explanation: "The data format is not recognized.",
    remainingBehavior: "Other content is unaffected.",
    recovery: "Refresh the page. If this persists, contact support.",
  },
  conflicted: {
    label: "Conflict detected",
    explanation: "Multiple changes were made at the same time.",
    remainingBehavior: "You can choose which version to keep.",
    recovery: "Review the changes and resolve the conflict.",
  },
  "measured-zero": {
    label: "No results",
    explanation: "The search completed but found no matches.",
    remainingBehavior: "You can adjust your search.",
    recovery: "Try different search terms or broaden your filters.",
  },
};

/** Icon prefix per state — non-color semantic indicator */
const STATE_ICON: Record<AvailabilityStateId, string> = {
  unknown: "?",
  unavailable: "!",
  stale: "~",
  partial: "…",
  empty: "∅",
  "permission-denied": "🔒",
  error: "✕",
  offline: "⊘",
  unmapped: "?",
  conflicted: "⇔",
  "measured-zero": "0",
};

export interface AvailabilityStateProps
  extends HTMLAttributes<HTMLDivElement> {
  /** Which availability state to render */
  state: AvailabilityStateId;
  /** Override default copy for any field */
  copy?: Partial<StateCopy>;
  /** Optional action the user can take */
  action?: ReactNode;
}

/**
 * Renders a complete availability state with visible text, non-color
 * semantic indicator, and recovery path.
 *
 * - Every state has distinct visible text (not color-only)
 * - permission-denied never confirms a protected record exists
 * - No fabricated zero, owner, provider, or health detail
 */
export const AvailabilityState = forwardRef<
  HTMLDivElement,
  AvailabilityStateProps
>(function AvailabilityState(
  { state, copy: copyOverrides, action, className = "", ...props },
  ref,
) {
  const base = STATE_COPY[state];
  const merged = { ...base, ...copyOverrides };
  const icon = STATE_ICON[state];

  return (
    <div
      ref={ref}
      role="status"
      aria-label={merged.label}
      data-availability={state}
      className={[
        "flex flex-col gap-2 p-4",
        "rounded-[var(--radius-control)]",
        "border-2 border-ink/20",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center w-6 h-6 text-sm font-bold"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="font-label text-sm font-bold">{merged.label}</span>
      </div>
      <p className="text-sm text-ink/70">{merged.explanation}</p>
      <p className="text-xs text-ink/70">{merged.remainingBehavior}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs font-medium">{merged.recovery}</p>
        {action}
      </div>
    </div>
  );
});
