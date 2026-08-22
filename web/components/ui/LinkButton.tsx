"use client";

import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

/** Protocols considered safe for external links */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"] as const;

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, "https://placeholder.test");
    return SAFE_PROTOCOLS.includes(
      url.protocol as (typeof SAFE_PROTOCOLS)[number],
    );
  } catch {
    // Relative URLs are safe (same-origin)
    return !href.includes(":") || href.startsWith("/");
  }
}

export interface LinkButtonProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** Destination URL. Rejects unsafe protocols. */
  href: string;
  /** Visual variant using semantic tokens */
  variant?: "primary" | "secondary" | "ghost";
  /** Force external behavior even for same-origin paths */
  external?: boolean;
  children: ReactNode;
}

/**
 * Semantic link styled as a button.
 *
 * - Internal links use Next.js <Link> for client navigation
 * - External links use <a> with rel="noreferrer noopener" and target="_blank"
 * - Unsafe protocol hrefs (javascript:, data:, vbscript:) are rejected
 * - 44px minimum touch target
 * - Visible focus ring (two-layer: cream inner + ink outer)
 */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  function LinkButton(
    {
      href,
      variant = "primary",
      external,
      children,
      className = "",
      onClick,
      ...props
    },
    ref,
  ) {
    const safe = isSafeHref(href);
    const isExternal =
      external || /^https?:\/\//.test(href) || href.startsWith("mailto:");

    const classes = [
      "inline-flex items-center justify-center",
      "min-h-[44px] min-w-[44px] px-4 py-2",
      "font-label text-sm font-bold tracking-wide",
      "rounded-[var(--radius-control)]",
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
      !safe && "opacity-50 cursor-not-allowed pointer-events-none",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (!safe) {
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          className={classes}
          aria-disabled="true"
          role="link"
          {...(props as React.HTMLAttributes<HTMLSpanElement>)}
        >
          {children}
        </span>
      );
    }

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={classes}
          onClick={onClick}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        className={classes}
        onClick={onClick}
        {...props}
      >
        {children}
      </Link>
    );
  },
);
