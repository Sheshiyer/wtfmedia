"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AskComposer } from "./AskComposer";
import { ConversationThread, type Message, type Source } from "./ConversationThread";
import { parsePublicSourceHeader } from "@/lib/provenance/public-source-header";
import { parseSourceMode, type SourceMode } from "@/lib/provenance/source-mode";
import type { AnswerQueryScope } from "@/lib/public/source-panel-model";

/* ------------------------------------------------------------------ */
/* ChatInner (migrated — uses extracted components)                    */
/* ------------------------------------------------------------------ */

function ChatInner() {
  const searchParams = useSearchParams();
  const episodeParam = searchParams.get("episodeId")?.trim() ?? "";
  const episodeId = /^[A-Za-z0-9_-]{11}$/.test(episodeParam) ? episodeParam : null;
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

  async function sendWithQuery(
    query: string,
    options: { history?: Message[]; appendUser?: boolean; answerModel?: string } = {},
  ) {
    if (loading) return;

    const userMessage: Message = { role: "user", content: query };
    const history = options.history ?? messages;
    const requestMessages = options.appendUser === false ? history : [...history, userMessage];
    const queryScope: AnswerQueryScope = {
      sourceMode,
      episodeId,
    };
    setMessages(requestMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sourceMode: queryScope.sourceMode,
          ...(episodeId ? { episodeId } : {}),
          ...(options.answerModel ? { answerModel: options.answerModel } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const sourcesHeader = response.headers.get("X-Sources");
      const modelHeader = response.headers.get("X-Model");
      const fallbackHeader = response.headers.get("X-Fallback");
      const responseModeHeader = response.headers.get("X-Source-Mode");
      const responseSourceMode = responseModeHeader
        ? parseSourceMode(responseModeHeader)
        : queryScope.sourceMode;
      const responseState = response.headers.get("X-Response-State") || undefined;
      let citedIndices: number[] | undefined;
      try {
        const raw = response.headers.get("X-Cited-Indices");
        if (raw) citedIndices = JSON.parse(raw);
      } catch { /* ignore malformed header */ }
      let followUps: string[] | undefined;
      try {
        const raw = response.headers.get("X-Follow-Ups");
        if (raw) followUps = JSON.parse(raw);
      } catch { /* ignore malformed header */ }

      const sources: Source[] = parsePublicSourceHeader(sourcesHeader).map((source) => ({
        ...source,
        sourceMode: source.sourceMode ?? responseSourceMode,
      }));

      // Stream the response body
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            sources,
            model: modelHeader || undefined,
            fallback: fallbackHeader === "true",
            responseState,
            citedIndices,
            followUps,
            queryScope,
            effectiveSourceMode: responseSourceMode,
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

  async function retry(model?: string) {
    // Find last user message and resend
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;

    const lastUserMessage = [...messages].reverse()[lastUserIdx];
    const userIndex = messages.length - 1 - lastUserIdx;
    const historyThroughUser = messages.slice(0, userIndex + 1);
    await sendWithQuery(lastUserMessage.content, {
      history: historyThroughUser,
      appendUser: false,
      answerModel: model,
    });
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem-env(safe-area-inset-top))] min-h-0 flex-col bg-canvas">
      <ConversationThread
        messages={messages}
        loading={loading}
        onRetry={retry}
        onFollowUp={sendWithQuery}
        footer={
          <AskComposer
            value={input}
            onChange={setInput}
            onSubmit={send}
            loading={loading}
            sourceMode={sourceMode}
            onSourceModeChange={setSourceMode}
          />
        }
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
