"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name is REQUIRED for icon-only buttons */
  "aria-label": string;
  /** Visual variant using semantic tokens */
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

/**
 * Icon-only button requiring an accessible name.
 *
 * - Native <button> semantics for Enter/Space activation
 * - 44px minimum touch target
 * - Visible focus ring (two-layer: cream inner + ink outer)
 * - aria-label is mandatory (enforced by TypeScript)
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "ghost", disabled, children, className = "", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={[
          "inline-flex items-center justify-center",
          "min-h-[44px] min-w-[44px] p-2",
          "rounded-[var(--radius-control)]",
          "border-2 border-transparent",
          "transition-[transform,box-shadow] duration-fast ease-out",
          "focus-visible:outline-none",
          "focus-visible:ring-2 ring-cream focus-visible:ring-offset-2",
          "focus-visible:ring-offset-ink",
          // Variant styles
          variant === "primary" &&
            "bg-ink text-cream hover:bg-ink/90 active:bg-ink/80",
          variant === "secondary" &&
            "bg-cream text-ink hover:bg-surface-subtle active:bg-surface-subtle/80",
          variant === "ghost" &&
            "bg-transparent text-ink hover:bg-surface-subtle active:bg-surface-subtle/80",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  },
);
