"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SOURCE_MODES, type SourceMode } from "@/lib/provenance/source-mode";

/**
 * AskComposer — compact persistent labelled composer for the chat route.
 *
 * UI-SPEC §chat:
 *   - Label: "ask the catalogue"
 *   - Submit: "ask wtf"
 *   - Enter submits, Shift+Enter newline
 *   - Composition events respected (IME)
 *   - Focus on mount
 */

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /* Focus on mount */
  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
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
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 border-y-2 border-foreground bg-surface-raised px-3 py-2 shadow-[0_-10px_0_rgb(var(--wtf-foreground-rgb)/0.08)] sm:px-8"
      data-testid="ask-composer"
    >
      <div className="mx-auto max-w-5xl">
        <label htmlFor="ask-wtf-composer" className="mb-1 block font-label text-[11px] font-bold lowercase sm:text-sm">
          ask the catalogue
        </label>
        <div className="wtf-input-star relative overflow-hidden rounded-control border-2 border-foreground bg-canvas p-[3px]">
          <textarea
            id="ask-wtf-composer"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="what moment are you after?"
            rows={2}
            aria-label="Ask the catalogue"
            aria-describedby="ask-wtf-help"
            className="relative z-[1] min-h-12 w-full resize-none rounded-[calc(var(--wtf-radius-control)-3px)] border border-foreground/10 bg-canvas px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-knowledge sm:min-h-14 sm:px-4 sm:py-3"
          />
          <div
            className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-foreground/15 bg-surface-raised/80 px-1.5 pb-1.5 pt-1.5"
            data-testid="ask-send-bar"
          >
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
                    "min-h-8 px-2.5 font-label text-[10px] font-bold lowercase transition-colors sm:px-3 sm:text-[11px]",
                    sourceMode === mode
                      ? "bg-knowledge text-on-knowledge"
                      : "text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              disabled={disabled || loading || !value.trim()}
              loading={loading}
              className="min-h-10 shrink-0 border-foreground bg-knowledge px-4 text-on-knowledge hover:bg-knowledge disabled:border-foreground/40 disabled:bg-surface-subtle disabled:text-foreground disabled:opacity-100 sm:min-h-11"
            >
              ask wtf
            </Button>
          </div>
        </div>
        <span id="ask-wtf-help" className="sr-only">
          press enter to ask. press shift and enter for a new line.
        </span>
      </div>
    </form>
  );
}
