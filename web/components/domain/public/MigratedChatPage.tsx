"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AskComposer } from "./AskComposer";
import { ConversationThread, type Message, type Source } from "./ConversationThread";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Only the public citation fields cross the chat response boundary. */
function parsePublicSources(value: string | null): Source[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): Source[] => {
      if (!item || typeof item !== "object") return [];
      const source = item as Record<string, unknown>;
      const title = readString(source.title);
      const episodeId = readString(source.episodeId);
      const videoId = readString(source.video_id) ?? readString(source.videoId);
      const url = readString(source.url);
      if (!title && !episodeId && !videoId && !url) return [];

      return [{
        ...(title ? { title } : {}),
        ...(episodeId ? { episodeId } : {}),
        ...(videoId ? { videoId } : {}),
        ...(url ? { url } : {}),
        timeSec: readTime(source.t) ?? readTime(source.timestamp),
      }];
    });
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* ChatInner (migrated — uses extracted components)                    */
/* ------------------------------------------------------------------ */

function ChatInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

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
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const sourcesHeader = response.headers.get("X-Sources");
      const modelHeader = response.headers.get("X-Model");
      const fallbackHeader = response.headers.get("X-Fallback");

      const sources = parsePublicSources(sourcesHeader);

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
          content: "answer failed. retry ask.",
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
        summary="ask the catalogue. quoted evidence stays beside synthesis. published and uncut are named. unmapped time stays unmapped."
        accent="knowledge"
        context={
          <div className="flex flex-wrap gap-x-6 gap-y-2 font-label text-[11px] font-bold uppercase tracking-[0.12em] text-secondary">
            <span>catalogue scope</span>
            <span>source-backed answers</span>
            <span>published or uncut, named</span>
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
