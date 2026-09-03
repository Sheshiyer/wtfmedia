"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Public navigation — bounded client island for pathname, aria-current,
 * and route-focus behavior.
 *
 * Destinations: /, /episodes, /connections, /chat
 * Labels: home, episodes, connections, ask wtf
 * Active meaning: non-color (aria-current=page)
 */

const destinations = [
  { href: "/", label: "home" },
  { href: "/episodes", label: "episodes" },
  { href: "/connections", label: "connections" },
  { href: "/chat", label: "ask wtf" },
] as const;

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
      {destinations.map((d) => {
        const isActive =
          d.href === "/" ? pathname === "/" : pathname?.startsWith(d.href) ?? false;

        return (
          <Link
            key={d.href}
            href={d.href}
            aria-current={isActive ? "page" : undefined}
            data-cursor="go"
            className={`px-3 py-2 rounded-full eyebrow transition-colors ${
              isActive
                ? "bg-surface-structure text-on-structure"
                : "text-foreground/80 hover:bg-surface-structure hover:text-on-structure"
            }`}
          >
            {d.label}
          </Link>
        );
      })}
    </nav>
  );
}
