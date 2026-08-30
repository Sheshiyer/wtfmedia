"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AskComposer } from "./AskComposer";
import { ConversationThread, type Message, type Source } from "./ConversationThread";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";
import { parsePublicSourceHeader } from "@/lib/provenance/public-source-header";
import { parseSourceMode, type SourceMode } from "@/lib/provenance/source-mode";

/* ------------------------------------------------------------------ */
/* ChatInner (migrated — uses extracted components)                    */
/* ------------------------------------------------------------------ */

function ChatInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>("published");

  /* Auto-submit from ?q= param (once) */
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSubmitted && messages.length === 0) {
      setInput(q);
      setAutoSubmitted(true);
      // Defer to next tick so input state is set
      setTimeout(() => {
        sendWithQuery(q);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, autoSubmitted, messages.length]);

  async function sendWithQuery(query: string) {
    if (loading) return;

    const userMessage: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sourceMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const sourcesHeader = response.headers.get("X-Sources");
      const modelHeader = response.headers.get("X-Model");
      const fallbackHeader = response.headers.get("X-Fallback");

      const sources: Source[] = parsePublicSourceHeader(sourcesHeader).map((source) => ({
        ...source,
        sourceMode: parseSourceMode(response.headers.get("X-Source-Mode") ?? source.sourceMode),
      }));

      // Stream the response body
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        // Add empty assistant message to fill
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            sources,
            model: modelHeader || undefined,
            fallback: fallbackHeader === "true",
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: accumulated };
            }
            return updated;
          });
        }
      }

      // Check for abstention
      const isAbstained =
        accumulated.includes("don't have enough information") ||
        accumulated.includes("cannot answer") ||
        accumulated.includes("not enough context");

      if (isAbstained) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, abstained: true };
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "answer failed. retry ask.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const query = input.trim();
    if (!query || loading) return;
    await sendWithQuery(query);
  }

  async function retry() {
    // Find last user message and resend
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;

    const lastUserMessage = [...messages].reverse()[lastUserIdx];
    // Remove last assistant message
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[updated.length - 1]?.role === "assistant") {
        updated.pop();
      }
      return updated;
    });
    await sendWithQuery(lastUserMessage.content);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <WorkspaceHeader
        eyebrow="get the moment"
        title="ask wtf"
        summary="ask the catalogue. quoted evidence stays beside synthesis. published and uncut stay named."
        accent="knowledge"
        size="page"
        context={
          <div className="hidden flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary sm:flex">
            <span>catalogue scope</span>
            <span>source-backed answers</span>
            <span>mapped time only</span>
          </div>
        }
      />

      {/* Conversation */}
      <ConversationThread
        messages={messages}
        loading={loading}
        onRetry={retry}
      />

      {/* Composer */}
      <AskComposer
        value={input}
        onChange={setInput}
        onSubmit={send}
        loading={loading}
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export default function MigratedChatPage() {
  return (
    <Suspense fallback={<div className="halftone min-h-[calc(100vh-64px)]" />}>
      <ChatInner />
    </Suspense>
  );
}
