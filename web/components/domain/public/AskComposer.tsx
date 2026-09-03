"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SOURCE_MODES, type SourceMode } from "@/lib/provenance/source-mode";

interface AskComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
  sourceMode?: SourceMode;
  onSourceModeChange?: (mode: SourceMode) => void;
}

export function AskComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
  sourceMode = "published",
  onSourceModeChange,
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
      <div className="mx-auto flex max-w-5xl items-center gap-1.5 rounded-full border-2 border-foreground bg-surface-raised/95 px-1.5 py-1 shadow-[0_-4px_0_rgb(var(--wtf-foreground-rgb)/0.10)] backdrop-blur-md sm:gap-2 sm:px-3 sm:py-1.5">
        <div
          className="inline-flex shrink-0 rounded-full p-0.5"
          role="group"
          aria-label="source mode"
          data-testid="source-mode-toggle"
        >
          {SOURCE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={sourceMode === mode}
              disabled={disabled || loading}
              onClick={() => onSourceModeChange?.(mode)}
              className={[
                "min-h-7 rounded-full px-2 font-label text-[10px] font-bold lowercase transition-colors sm:px-2.5 sm:text-[11px]",
                sourceMode === mode
                  ? "bg-knowledge text-on-knowledge"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {mode}
            </button>
          ))}
        </div>
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
            className="h-9 w-full bg-transparent px-2 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none sm:h-10 sm:px-3"
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
