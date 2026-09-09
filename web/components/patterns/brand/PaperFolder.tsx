"use client";

import { useState } from "react";

type PaperFolderProps = {
  label: string;
  items?: React.ReactNode[];
  color?: string;
  className?: string;
};

function darken(hex: string, percent: number) {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  const value = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  const num = Number.parseInt(value.slice(0, 6), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.floor(((num >> shift) & 0xff) * (1 - percent))));
  return `#${((1 << 24) + (channel(16) << 16) + (channel(8) << 8) + channel(0)).toString(16).slice(1)}`;
}

/**
 * Harmonized React Bits Folder (MIT). Cream papers, attention cover.
 * No catalog purple. Reduced motion keeps the folder closed-static.
 */
export function PaperFolder({
  label,
  items = [],
  color = "#f1b333",
  className = "",
}: PaperFolderProps) {
  const [open, setOpen] = useState(false);
  const papers = [...items.slice(0, 3)];
  while (papers.length < 3) papers.push(null);
  const back = darken(color, 0.12);

  return (
    <div className={className}>
      <p className="mb-3 font-label text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
        {label}
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "close pin folder" : "open pin folder"}
        onClick={() => setOpen((value) => !value)}
        className="relative h-20 w-[6.25rem] rounded-br-[10px] rounded-tr-[10px] border-2 border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 motion-safe:transition-transform motion-safe:duration-fast"
        style={{ backgroundColor: back }}
      >
        <span
          className="absolute bottom-[98%] left-0 h-2.5 w-8 rounded-t-[5px] border-2 border-b-0 border-foreground"
          style={{ backgroundColor: back }}
        />
        {papers.map((item, index) => (
          <span
            key={index}
            className={`absolute bottom-[10%] left-1/2 z-20 -translate-x-1/2 rounded-[8px] border border-foreground bg-canvas motion-safe:transition-transform motion-safe:duration-200 ${
              open
                ? index === 0
                  ? "-translate-x-[140%] -translate-y-[70%] -rotate-[15deg]"
                  : index === 1
                    ? "-translate-x-[10%] -translate-y-[70%] rotate-[15deg]"
                    : "-translate-x-1/2 -translate-y-[110%] rotate-[4deg]"
                : "translate-y-[8%]"
            }`}
            style={{
              width: `${70 + index * 10}%`,
              height: open ? "80%" : `${80 - index * 10}%`,
            }}
          >
            {item}
          </span>
        ))}
        <span
          className="absolute inset-0 z-30 origin-bottom border-2 border-foreground motion-safe:transition-transform motion-safe:duration-200"
          style={{
            backgroundColor: color,
            borderRadius: "5px 10px 10px 10px",
            transform: open ? "skew(12deg) scaleY(0.62)" : undefined,
          }}
        />
      </button>
    </div>
  );
}
