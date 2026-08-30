"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { routeIsActive } from "@/lib/public/route-is-active";
import type { AppNavItem } from "./AppRail";

type AppDockProps = {
  mode: "public" | "operator";
  navigation: readonly AppNavItem[];
  onOpenCommand: () => void;
  commandTriggerRef: RefObject<HTMLButtonElement | null>;
};

/**
 * A semantic, token-bound adaptation of the ReactBits Dock interaction.
 *
 * It deliberately keeps route names visible: the magnification affordance is
 * a refinement of navigation, never a substitute for accessible labels.
 */
export function AppDock({ mode, navigation, onOpenCommand, commandTriggerRef }: AppDockProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label={mode === "operator" ? "operations" : "Application"}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:flex"
      data-testid="app-dock"
    >
      <motion.div
        layout
        className="pointer-events-auto flex max-w-[min(100%,72rem)] items-stretch gap-1 overflow-x-auto border-2 border-foreground bg-surface-raised p-1.5 shadow-[var(--wtf-depth-card-offset)_var(--wtf-depth-card-offset)_0_0_rgb(var(--wtf-foreground-rgb)_/_0.22)]"
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
      >
        {navigation.map((item) => {
          const active = routeIsActive(pathname, item.href);
          return (
            <motion.div key={item.href} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex min-h-11 min-w-20 flex-col items-center justify-center gap-1 border-2 px-3 py-1.5",
                  "font-label text-[0.6875rem] font-bold lowercase tracking-[0.08em]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                  active
                    ? "border-attention bg-attention text-on-attention"
                    : "border-transparent text-foreground hover:border-foreground/35 hover:bg-surface-subtle",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "h-2 w-2 border border-current transition-transform duration-fast group-hover:scale-125",
                    active ? "bg-surface-structure" : "bg-transparent",
                  ].join(" ")}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}

        <div aria-hidden="true" className="my-1 w-px shrink-0 bg-foreground/20" />

        <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
          <button
            ref={commandTriggerRef}
            type="button"
            onClick={onOpenCommand}
            aria-label="Open workspace controls"
            className="flex min-h-11 min-w-24 flex-col items-center justify-center gap-1 border-2 border-knowledge bg-knowledge px-3 py-1.5 font-label text-[0.6875rem] font-bold lowercase tracking-[0.08em] text-on-knowledge focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            data-testid="global-command-trigger"
          >
            <span aria-hidden="true" className="text-sm leading-none">✦</span>
            <span className="whitespace-nowrap">controls</span>
          </button>
        </motion.div>
      </motion.div>
    </nav>
  );
}
