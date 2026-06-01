"use client";

import { useEffect, useState } from "react";

// "Multiplayer presence" badge like the reference site — a lightly-live count.
export function Presence() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    // seed from a stable-ish base + drift, so it feels alive without a backend
    const base = 3 + Math.floor(Math.random() * 9);
    setCount(base);
    const id = setInterval(() => {
      setCount((c) => {
        const delta = Math.random() < 0.5 ? -1 : 1;
        return Math.max(1, Math.min(24, c + delta));
      });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 select-none" data-cursor="online">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wtf-green opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-wtf-green border border-ink" />
      </span>
      <span className="eyebrow text-ink/70">
        {count} online · live
      </span>
    </div>
  );
}
