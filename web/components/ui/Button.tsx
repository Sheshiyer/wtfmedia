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
      style,
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
          "border-2 border-foreground",
          "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-fast ease-out",
          "enabled:hover:-translate-y-px enabled:active:translate-y-0",
          "focus-visible:outline-none",
          "focus-visible:ring-2 ring-canvas focus-visible:ring-offset-2",
          "focus-visible:ring-offset-foreground",
          // Variant styles
          variant === "primary" &&
            "bg-surface-structure text-on-structure hover:bg-surface-structure/90 active:bg-surface-structure/80",
          variant === "secondary" &&
            "bg-surface-raised text-foreground hover:bg-surface-subtle active:bg-surface-subtle/80",
          variant === "ghost" &&
            "bg-transparent text-foreground hover:bg-surface-subtle active:bg-surface-subtle/80",
          variant === "attention" &&
            "bg-attention text-on-attention hover:bg-attention active:bg-attention",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-100",
          // Loading state
          loading && "relative",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          isDisabled
            ? {
                ...style,
                backgroundColor: "var(--wtf-surface-subtle)",
                borderColor: "rgb(var(--wtf-foreground-rgb) / 0.4)",
                color: "var(--wtf-text-muted)",
              }
            : style
        }
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
