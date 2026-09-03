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
      className="border-t-2 border-foreground bg-surface-raised px-3 py-2 sm:px-8"
      data-testid="ask-composer"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <div
          className="inline-flex shrink-0 rounded-control border-2 border-foreground bg-canvas p-0.5"
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
                "min-h-7 px-2 font-label text-[10px] font-bold lowercase transition-colors sm:px-2.5 sm:text-[11px]",
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
            className="h-10 w-full rounded-control border-2 border-foreground bg-canvas px-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-knowledge sm:h-11 sm:px-4"
          />
        </div>
        <Button
          type="submit"
          variant="attention"
          disabled={disabled || loading || !value.trim()}
          loading={loading}
          className="h-10 shrink-0 border-foreground px-4 sm:h-11"
        >
          ask wtf
        </Button>
      </div>
    </form>
  );
}
