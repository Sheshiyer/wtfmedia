/**
 * Decorative sparkle for the migrated brand layer.
 *
 * - aria-hidden (decorative, not announced)
 * - Token-driven default color (var(--wtf-attention) = #F1B333)
 * - Static under reduced motion: the [class*="animate-"] rule in
 *   motion.css sets animation: none !important when the user prefers
 *   reduced motion, so the twinkle class is inert by default.
 * - Stroke uses var(--wtf-foreground) for theme coherence.
 */

interface SignatureSparkleProps {
  className?: string;
  color?: string;
  size?: number;
}

export function SignatureSparkle({
  className = "",
  color = "var(--wtf-attention)",
  size = 24,
}: SignatureSparkleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-twinkle ${className}`}
      aria-hidden
    >
      <path
        d="M12 0c.7 6.2 5.1 10.6 12 12-6.9 1.4-11.3 5.8-12 12-.7-6.2-5.1-10.6-12-12C6.9 10.6 11.3 6.2 12 0Z"
        fill={color}
        stroke="var(--wtf-foreground)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
