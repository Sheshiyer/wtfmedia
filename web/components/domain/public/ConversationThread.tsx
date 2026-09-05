"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SourcePanel, type SourceCitation } from "./SourcePanel";
import { Button } from "@/components/ui/Button";
import { toCitedMarkdown } from "@/lib/public/chat-citations";
import type { AnswerQueryScope } from "@/lib/public/source-panel-model";
import type { SourceMode } from "@/lib/provenance/source-mode";

/**
 * ConversationThread — scrollable message region for the chat route.
 *
 * Composer placement:
 *   - Content fits viewport → composer is fixed above the nav pill
 *   - Content overflows → composer flows inline at the end of the thread
 */

export interface Source extends SourceCitation {}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  model?: string;
  fallback?: boolean;
  abstained?: boolean;
  responseState?: string;
  citedIndices?: number[];
  followUps?: string[];
  queryScope?: AnswerQueryScope;
  effectiveSourceMode?: SourceMode;
}

export interface ConversationThreadProps {
  messages: Message[];
  loading: boolean;
  onRetry: (model?: string) => void;
  onFollowUp?: (question: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
}

const FIXED_ZONE_PX = 160;

export function ConversationThread({
  messages,
  loading,
  onRetry,
  onFollowUp,
  header,
  footer,
}: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  // Retry model picker disabled for now — retry always uses the default chain.
  // const [retryModel, setRetryModel] = useState("");

  const checkOverflow = useCallback(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    setIsOverflowing(content.offsetHeight > container.clientHeight - FIXED_ZONE_PX);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = container!;
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight >= 50;
    }
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    checkOverflow();
    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [checkOverflow]);

  useEffect(() => { checkOverflow(); }, [messages, loading, checkOverflow]);

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:pt-6"
        data-testid="conversation-thread"
        tabIndex={0}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {/* Content area — measured for overflow detection */}
        <div ref={contentRef}>
          <h1 className="sr-only">ask wtf</h1>
          {header}

          <div>
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
                      <div className="prose-chat border-l-4 border-knowledge pl-4 text-sm leading-relaxed text-secondary">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => href?.startsWith("/") ? (
                              <Link href={href} className="cite">{children}</Link>
                            ) : (
                              <a href={href} target="_blank" rel="noreferrer">{children}</a>
                            ),
                          }}
                        >
                          {toCitedMarkdown(msg.content, msg.sources ?? [])}
                        </ReactMarkdown>
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <SourcePanel
                          sources={msg.sources}
                          citedIndices={msg.citedIndices}
                          queryScope={msg.queryScope}
                          effectiveSourceMode={msg.effectiveSourceMode}
                        />
                      )}

                      {msg.abstained && (
                        <p className="text-xs font-medium italic text-secondary" data-testid="abstention-label">
                          the catalogue doesn&apos;t support that claim
                        </p>
                      )}

                      {msg.followUps && msg.followUps.length > 0 && !loading && i === messages.length - 1 && (
                        <div className="flex flex-wrap gap-2 pt-2" data-testid="follow-up-chips">
                          {msg.followUps.map((q, fi) => (
                            <button
                              key={fi}
                              type="button"
                              onClick={() => onFollowUp?.(q)}
                              className="rounded-full border border-foreground/20 bg-canvas px-3 py-1.5 text-left text-xs text-secondary transition-colors hover:border-knowledge hover:text-foreground"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

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

            {messages.length > 0 &&
              !loading &&
              messages[messages.length - 1]?.role === "assistant" && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t-2 border-foreground/15 px-4 py-3">
                  {/* OpenRouter retry model picker commented out — not needed currently.
                  <label
                    htmlFor="retry-model"
                    className="font-label text-[10px] font-bold uppercase tracking-wider text-muted"
                  >
                    retry with
                  </label>
                  <select
                    id="retry-model"
                    data-testid="retry-model-select"
                    value={retryModel}
                    onChange={(event) => setRetryModel(event.target.value)}
                    className="min-h-8 rounded-control border-2 border-foreground bg-canvas px-2 py-1 text-xs lowercase text-foreground"
                  >
                    <option value="">default (auto)</option>
                    <option value="google/gemini-3.5-flash">gemini 3.5 flash</option>
                    <option value="openai/gpt-5">gpt-5</option>
                    <option value="poolside/laguna-s-2.1">laguna s 2.1</option>
                    <option value="thinkingmachines/inkling">inkling</option>
                  </select>
                  */}
                  <Button
                    onClick={() => onRetry(undefined)}
                    variant="ghost"
                    className="text-xs"
                    data-testid="retry-button"
                  >
                    retry answer
                  </Button>
                </div>
              )}
          </div>
        </div>

        {/* Inline composer — only when content overflows */}
        {isOverflowing && footer}

        {/* Bottom spacer: always clears the nav pill */}
        <div className="h-[calc(5.5rem+env(safe-area-inset-bottom))]" aria-hidden="true" />

        {/* Extra spacer when composer is fixed (so content doesn't hide behind it) */}
        {!isOverflowing && <div className="h-14" aria-hidden="true" />}
      </div>

      {/* Fixed composer — pinned above nav pill when content fits */}
      {!isOverflowing && (
        <div
          className="fixed inset-x-0 z-40"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          {footer}
        </div>
      )}
    </>
  );
}
