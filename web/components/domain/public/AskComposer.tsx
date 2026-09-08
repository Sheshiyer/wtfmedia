"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface AskComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function AskComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
}: AskComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="px-3 py-2 sm:px-5"
      data-testid="ask-composer"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-1.5 rounded-full border-2 border-foreground bg-surface-raised/95 px-1.5 py-1 shadow-[0_-4px_0_rgb(var(--wtf-foreground-rgb)/0.10)] backdrop-blur-md focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-foreground sm:gap-2 sm:px-3 sm:py-1.5">
        {/* Public beta is published-only; no uncut/both selector. */}
        <div className="relative min-w-0 flex-1">
          <input
            id="ask-wtf-composer"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="what moment are you after?"
            aria-label="Ask the catalogue"
            // The global two-layer focus ring would draw a square box inside
            // the pill; the pill's own focus-within outline carries focus.
            className="h-9 w-full bg-transparent px-2 font-body text-sm text-foreground placeholder:text-muted focus-visible:!outline-none focus-visible:after:!shadow-none sm:h-10 sm:px-3"
          />
        </div>
        <Button
          type="submit"
          variant="attention"
          disabled={disabled || loading || !value.trim()}
          loading={loading}
          className="h-8 shrink-0 rounded-full px-3 sm:h-9 sm:px-4"
        >
          ask wtf
        </Button>
      </div>
    </form>
  );
}
