"use client";

import { useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { SOURCE_MODES, type SourceMode } from "@/lib/provenance/source-mode";

/**
 * AskComposer — persistent labelled composer for the chat route.
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
  sourceModeDisabled?: boolean;
  variant?: "expanded" | "compact";
  placement?: "fixed" | "inline";
}

export function AskComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
  sourceMode = "published",
  onSourceModeChange,
  sourceModeDisabled = false,
  variant = "expanded",
  placement = "fixed",
}: AskComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const compactInputRef = useRef<HTMLInputElement>(null);
  const promptRail = useMemo(
    () => [
      "find the exact moment where the guest changes their mind",
      "compare what founders say before and after failure",
      "show me the source-backed answer, not the folklore",
    ],
    [],
  );

  /* Focus on mount */
  useEffect(() => {
    if (variant === "compact") compactInputRef.current?.focus({ preventScroll: true });
    else textareaRef.current?.focus({ preventScroll: true });
  }, [variant]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  if (variant === "compact") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className={[
          "wtf-ask-composer px-3 py-2 sm:px-5",
          placement === "fixed"
            ? "fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40"
            : "shrink-0",
        ].join(" ")}
        data-testid="ask-composer"
        data-composer-variant="compact"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-1.5 rounded-full border-2 border-foreground bg-surface-raised/95 px-1.5 py-1 shadow-[0_-4px_0_rgb(var(--wtf-foreground-rgb)/0.10)] backdrop-blur-md focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-foreground sm:gap-2 sm:px-3 sm:py-1.5">
          <div className="relative min-w-0 flex-1">
            <input
              id="ask-wtf-composer"
              ref={compactInputRef}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onSubmit();
              }}
              disabled={disabled || loading}
              placeholder="what moment are you after?"
              aria-label="Ask the catalogue"
              className="h-9 w-full bg-transparent px-2 font-body text-sm text-foreground placeholder:text-muted focus-visible:!outline-none focus-visible:after:!shadow-none disabled:opacity-60 sm:h-10 sm:px-3"
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={[
        "wtf-ask-composer border-y-2 border-foreground bg-surface-raised px-4 py-4 shadow-[0_-10px_0_rgb(var(--wtf-foreground-rgb)/0.08)] sm:px-8",
        placement === "fixed"
          ? "fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40"
          : "shrink-0",
      ].join(" ")}
      data-testid="ask-composer"
    >
      <div className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
            <label htmlFor="ask-wtf-composer" className="font-label text-sm font-bold lowercase">
              ask the catalogue
            </label>
            <div
              className="inline-flex rounded-control border-2 border-foreground bg-canvas p-0.5"
              role="group"
              aria-label="source mode"
            >
              {SOURCE_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={sourceMode === mode}
                  disabled={disabled || loading || sourceModeDisabled}
                  onClick={() => onSourceModeChange?.(mode)}
                  className={[
                    "min-h-8 px-3 font-label text-[11px] font-bold lowercase transition-colors",
                    sourceMode === mode
                      ? "bg-knowledge text-on-knowledge"
                      : "text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="wtf-input-star relative overflow-hidden rounded-control border-2 border-foreground bg-canvas p-[3px]">
            <textarea
              id="ask-wtf-composer"
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || loading}
              placeholder="what moment are you after?"
              rows={2}
              aria-label="Ask the catalogue"
              className="relative z-[1] min-h-14 w-full resize-none rounded-[calc(var(--wtf-radius-control)-3px)] border border-foreground/10 bg-canvas px-4 py-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-knowledge sm:min-h-16"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:block lg:w-44">
          <div className="hidden overflow-hidden rounded-control border border-foreground/20 bg-surface-subtle px-3 py-2 sm:block lg:mb-2">
            <div className="wtf-type-rail font-label text-[10px] font-bold uppercase text-secondary">
              {promptRail.map((prompt) => (
                <span key={prompt}>{prompt}</span>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            disabled={disabled || loading || !value.trim()}
            loading={loading}
            className="min-h-12 w-full border-foreground bg-knowledge text-on-knowledge hover:bg-knowledge sm:min-h-16"
          >
            ask wtf
          </Button>
          <span className="mt-2 hidden font-label text-[10px] font-semibold uppercase tracking-[0.1em] text-muted lg:block">
            enter to ask. shift + enter for a new line.
          </span>
        </div>
      </div>
    </form>
  );
}
