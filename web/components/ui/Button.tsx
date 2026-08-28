"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant using semantic tokens */
  variant?: "primary" | "secondary" | "ghost" | "attention";
  /** Show loading state with preserved width */
  loading?: boolean;
  /** Visual pressed state for toggle-like behavior */
  pressed?: boolean;
  children: ReactNode;
}

/**
 * Semantic button wrapper preserving native behavior.
 *
 * - Uses native <button> for Enter/Space activation
 * - 44px minimum touch target
 * - Visible focus ring (two-layer: cream inner + ink outer)
 * - Supports disabled, loading, and pressed states
 * - Loading preserves button width and disables interaction
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      loading = false,
      pressed,
      disabled,
      children,
      className = "",
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-pressed={pressed}
        className={[
          "inline-flex items-center justify-center",
          "min-h-[44px] min-w-[44px] px-4 py-2",
          "font-label text-sm font-bold tracking-wide",
          "rounded-[var(--wtf-radius-control)]",
          "border-2 border-ink",
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
          variant === "attention" &&
            "bg-attention text-foreground hover:bg-attention active:bg-attention",
          // Disabled state
          isDisabled && "opacity-50 cursor-not-allowed",
          // Loading state
          loading && "relative",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
          </span>
        )}
        <span className={loading ? "opacity-0" : undefined}>{children}</span>
      </button>
    );
  },
);
