import { Sparkle } from "./Sparkle";

export function Marquee({
  items,
  className = "",
  fast = false,
}: {
  items: string[];
  className?: string;
  fast?: boolean;
}) {
  const row = [...items, ...items];
  return (
    <div className={`marquee-mask overflow-hidden ${className}`}>
      <div
        className={`flex w-max ${fast ? "animate-marquee-fast" : "animate-marquee"}`}
      >
        {row.map((t, i) => (
          <span key={i} className="flex items-center">
            <span className="display text-lg sm:text-xl px-5 whitespace-nowrap uppercase">
              {t}
            </span>
            <Sparkle size={16} color={i % 2 ? "#C53B3A" : "#F1B333"} />
          </span>
        ))}
      </div>
    </div>
  );
}
