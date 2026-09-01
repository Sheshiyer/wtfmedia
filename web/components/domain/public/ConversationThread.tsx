"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SourcePanel, type SourceCitation } from "./SourcePanel";
import { Button } from "@/components/ui/Button";

/**
 * ConversationThread — scrollable message region for the chat route.
 *
 * UI-SPEC §chat:
 *   - Incremental text doesn't move focus
 *   - Auto-scroll stops on scroll-up
 *   - Abstention label: "the catalogue doesn't support that claim"
 *   - Loading: "looking through the catalogue"
 *   - Retry: "retry answer" (no model exposure)
 *   - Published source moments remain usable while private playback is unavailable
 */

export interface Source extends SourceCitation {}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  model?: string;
  fallback?: boolean;
  abstained?: boolean;
}

function linkifyCitations(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const citation = match[1];
    const episodeId = citation.replace(/^EP:/i, "").trim();
    parts.push(
      <Link
        key={`${match.index}-${citation}`}
        href={`/episodes?id=${encodeURIComponent(episodeId)}`}
        className="underline decoration-foreground/40 transition-colors hover:decoration-foreground"
      >
        [{citation}]
      </Link>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export interface ConversationThreadProps {
  messages: Message[];
  loading: boolean;
  onRetry: () => void;
}

export function ConversationThread({
  messages,
  loading,
  onRetry,
}: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  /* Auto-scroll on new messages, unless user scrolled up */
  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  /* Track user scroll position */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = container!;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      userScrolledUp.current = !isAtBottom;
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-60 pt-4 sm:pb-52 sm:pt-6"
      data-testid="conversation-thread"
      role="log"
      aria-label="Conversation"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div
          className="mx-auto flex w-full max-w-5xl items-center py-4 sm:min-h-[28rem] sm:py-6"
          data-testid="empty-state"
          data-evidence-empty
        >
          <div className="grid w-full overflow-hidden border-2 border-foreground bg-surface-raised md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
            <section className="relative min-w-0 overflow-hidden p-4 sm:p-8">
              <div
                aria-hidden="true"
                className="wtf-question-lattice absolute inset-x-0 top-0 h-2"
              />
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-knowledge">
                start with the source
              </p>
              <h2 className="mt-3 max-w-[13ch] font-display text-3xl font-extrabold lowercase leading-none sm:max-w-[12ch] sm:text-5xl">
                ask the catalogue. get a cited moment.
              </h2>
              <p className="mt-4 max-w-[52ch] font-body text-sm leading-relaxed text-secondary sm:mt-5">
                ask across published conversations. uncut is used only when a
                verified mapping exists.
              </p>
              <div className="mt-4 hidden max-w-2xl border-l-4 border-knowledge bg-canvas px-4 py-3 sm:mt-7 sm:block">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                  example question
                </p>
                <p className="mt-2 font-serif text-base text-foreground wtf-decrypt-line sm:text-lg">
                  what did guests say about building through uncertainty?
                </p>
              </div>
            </section>
            <aside className="hidden border-t-2 border-foreground bg-canvas p-4 text-foreground sm:block sm:p-5 md:border-l-2 md:border-t-0">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
                evidence rail
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t-2 border-foreground pt-3 font-label text-xs text-foreground sm:mt-5 sm:block sm:divide-y sm:divide-foreground/20 sm:border-y-2 sm:pt-0 sm:text-sm">
                <div className="wtf-stagger-in py-3">
                  <dt className="text-secondary">scope</dt>
                  <dd className="mt-1 font-bold">current catalogue</dd>
                </div>
                <div className="wtf-stagger-in py-3 [animation-delay:120ms]">
                  <dt className="text-secondary">quoted evidence</dt>
                  <dd className="mt-1 font-bold">separate from synthesis</dd>
                </div>
                <div className="wtf-stagger-in py-3 [animation-delay:240ms]">
                  <dt className="text-secondary">source</dt>
                  <dd className="mt-1 font-bold">published or uncut, named</dd>
                </div>
                <div className="wtf-stagger-in py-3 [animation-delay:360ms]">
                  <dt className="text-secondary">timing</dt>
                  <dd className="mt-1 font-bold">only when mapped</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className="space-y-2" data-testid={`message-${i}`}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-control border-2 border-foreground bg-attention px-4 py-2">
                    <p className="text-sm text-on-attention">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary">
                    {linkifyCitations(msg.content)}
                  </div>

                  {/* Public source citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <SourcePanel sources={msg.sources} />
                  )}

                  {/* Abstention label */}
                  {msg.abstained && (
                    <p
                      className="text-xs font-medium italic text-secondary"
                      data-testid="abstention-label"
                    >
                      the catalogue doesn&apos;t support that claim
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div
              className="border-l-4 border-knowledge pl-4 text-sm font-semibold text-secondary"
              data-testid="loading-indicator"
              role="status"
            >
              looking through the catalogue
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Retry bar */}
      {messages.length > 0 &&
        !loading &&
        messages[messages.length - 1]?.role === "assistant" && (
          <div className="mt-4 flex justify-center border-t-2 border-foreground/15 px-4 py-3">
            <Button
              onClick={onRetry}
              variant="ghost"
              className="text-xs"
              data-testid="retry-button"
            >
              retry answer
            </Button>
          </div>
        )}
    </div>
  );
}
