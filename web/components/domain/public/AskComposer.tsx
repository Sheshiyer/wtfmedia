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
      className="border-t-2 border-foreground bg-surface-raised px-4 py-4 sm:px-8"
      data-testid="ask-composer"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-end justify-between gap-4">
          <label htmlFor="ask-wtf-composer" className="font-label text-sm font-bold lowercase">
            ask the catalogue
          </label>
          <span className="font-label text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/55">
            enter to ask · shift + enter for a new line
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            id="ask-wtf-composer"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ask the catalogue"
            rows={2}
            aria-label="Ask the catalogue"
            className="min-h-14 flex-1 resize-none rounded-control border-2 border-foreground bg-canvas px-4 py-3 font-body text-sm text-foreground placeholder:text-foreground/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-knowledge"
          />
          <Button
            type="submit"
            disabled={disabled || loading || !value.trim()}
            loading={loading}
            className="min-w-32 border-foreground bg-knowledge text-canvas hover:bg-knowledge sm:self-stretch"
          >
            ask wtf
          </Button>
        </div>
      </div>
    </form>
  );
}
