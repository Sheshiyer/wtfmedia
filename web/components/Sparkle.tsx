export function Sparkle({
  className = "",
  color = "#F1B333",
  size = 24,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 0c.7 6.2 5.1 10.6 12 12-6.9 1.4-11.3 5.8-12 12-.7-6.2-5.1-10.6-12-12C6.9 10.6 11.3 6.2 12 0Z"
        fill={color}
        stroke="#1A1A1A"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
