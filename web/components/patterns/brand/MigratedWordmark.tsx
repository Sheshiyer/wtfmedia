"use client";

/**
 * Migrated-only canonical wordmark for the public UI.
 *
 * Brand-asset exception: the "f" letter uses raw #0C8167 (the darkened
 * green that passes WCAG AA cream-on-green at 4.51:1) rather than
 * var(--wtf-live), which is still #0c9367 and explicitly documented as
 * having no text fill pair.  This mirrors how the red uses #C53B3A
 * directly — both are brand-asset hex values that live outside the
 * semantic token layer.
 *
 * Scope: migrated variant only.  Legacy mode continues to use the
 * original Wordmark.tsx / WordmarkMini.tsx which must NOT be modified.
 */

import { SignatureSparkle } from "./SignatureSparkle";

interface MigratedWordmarkProps {
  className?: string;
  /** Tailwind text-size class, e.g. "text-7xl sm:text-8xl". */
  size?: string;
  /** Show decorative sparkles around the wordmark. */
  withSparkles?: boolean;
}

export function MigratedWordmark({
  className = "",
  size = "text-7xl sm:text-8xl",
  withSparkles = true,
}: MigratedWordmarkProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {withSparkles && (
        <>
          <SignatureSparkle
            className="absolute -left-6 -top-3"
            size={26}
          />
          <SignatureSparkle
            className="absolute -right-4 top-1/2"
            size={18}
            color="var(--wtf-attention)"
          />
        </>
      )}
      <span className={`extrude ${size} select-none`}>
        <span style={{ color: "var(--wtf-editorial)" }}>w</span>
        <span style={{ color: "var(--wtf-foreground)" }}>t</span>
        {/* Brand-asset exception: raw hex, not var(--wtf-live). */}
        <span style={{ color: "#0C8167" }}>f</span>
        <span style={{ color: "var(--wtf-canvas)" }}>media</span>
      </span>
    </div>
  );
}

/**
 * Compact inline wordmark for nav/headers.
 */
export function MigratedWordmarkMini({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`extrude extrude-sm text-2xl select-none ${className}`}
    >
      <span style={{ color: "var(--wtf-editorial)" }}>w</span>
      <span style={{ color: "var(--wtf-foreground)" }}>t</span>
      <span style={{ color: "#0C8167" }}>f</span>
      <span
        style={{
          color: "var(--wtf-canvas)",
          WebkitTextStroke: "0",
        }}
      >
        media
      </span>
    </span>
  );
}
