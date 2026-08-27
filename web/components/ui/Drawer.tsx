"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { forwardRef, type ReactNode } from "react";

export interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when open state changes (Escape, backdrop click, close button) */
  onOpenChange: (open: boolean) => void;
  /** Accessible title for the drawer — required for labelling */
  title: string;
  /** Drawer content */
  children: ReactNode;
  /** Optional description shown below the title */
  description?: string;
  /** Side the drawer slides from (default: right) */
  side?: "left" | "right";
}

/**
 * Accessible slide-out drawer built on Radix Dialog.
 *
 * - Labelled modal with focus containment
 * - Escape and backdrop dismiss
 * - Responsive: full viewport at 320px, right-edge bounded at 768px/1440px
 * - Uses semantic tokens only — no shadcn visual layer
 * - 44px minimum touch target on close button
 */
export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  function Drawer(
    {
      open,
      onOpenChange,
      title,
      children,
      description,
      side = "right",
      ...props
    },
    ref,
  ) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm
                       data-[state=open]:animate-in data-[state=open]:fade-in-0
                       data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          />
          <Dialog.Content
            ref={ref}
            aria-describedby={description ? "drawer-description" : undefined}
            className={[
              "fixed z-50 gap-4 bg-cream border-l-2 border-ink",
              "shadow-lg shadow-ink/10",
              "transition ease-in-out",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              // Responsive positioning
              // 320px: full viewport
              "inset-y-0 h-full w-full",
              // 768px+: bounded right edge
              "md:h-auto md:w-[400px] md:top-0 md:bottom-0",
              // 1440px+: same bounded width
              "lg:w-[420px]",
              // Side positioning
              side === "right"
                ? "right-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
                : "left-0 border-l-0 border-r-2 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Dialog.Title className="font-label text-lg font-bold text-ink">
                    {title}
                  </Dialog.Title>
                  {description && (
                    <Dialog.Description
                      id="drawer-description"
                      className="text-sm text-ink/70 mt-1"
                    >
                      {description}
                    </Dialog.Description>
                  )}
                </div>
                <Dialog.Close
                  aria-label="close drawer"
                  className={[
                    "inline-flex items-center justify-center",
                    "min-h-[44px] min-w-[44px]",
                    "rounded-[var(--wtf-radius-control)]",
                    "text-ink hover:bg-surface-subtle",
                    "focus-visible:outline-none",
                    "focus-visible:ring-2 ring-cream focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-ink",
                  ].join(" ")}
                >
                  <span aria-hidden="true" className="text-lg font-bold">
                    ×
                  </span>
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);
