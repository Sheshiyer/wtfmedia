"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

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
}

export function AskComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
}: AskComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Focus on mount */
  useEffect(() => {
    textareaRef.current?.focus();
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
      className="border-t-2 border-foreground bg-surface-raised px-4 py-3 sm:px-6 lg:px-8"
      data-testid="ask-composer"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <label htmlFor="ask-wtf-composer" className="font-label text-sm font-bold lowercase">
            ask the catalogue
          </label>
          <span id="ask-wtf-composer-help" className="font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-right">
            enter to ask · shift + enter for a new line
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <textarea
            id="ask-wtf-composer"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="what moment are you after?"
            rows={2}
            aria-label="Ask the catalogue"
            aria-describedby="ask-wtf-composer-help"
            className="min-h-14 min-w-0 flex-1 resize-none rounded-control border-2 border-foreground bg-canvas px-4 py-3 font-body text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-knowledge"
          />
          <Button
            type="submit"
            disabled={disabled || loading || !value.trim()}
            loading={loading}
            className="w-full shrink-0 border-foreground bg-knowledge text-on-knowledge hover:bg-knowledge sm:w-32 sm:min-w-32 sm:self-stretch"
          >
            ask wtf
          </Button>
        </div>
      </div>
    </form>
  );
}
